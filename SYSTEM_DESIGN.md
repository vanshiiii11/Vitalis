# System Design: Vitalis Clinical Appointment & Follow-up Manager

## 1. Double-Booking Prevention

**The problem:** Two patients requesting the same slot simultaneously can both pass an availability check before either books, producing a double-booking if handled naively.

**The solution — two layers:**

*Database unique constraint (permanent guarantee):*
```sql
-- Prisma: @@unique([doctorId, slotStart])
CREATE UNIQUE INDEX ON appointments (doctor_id, slot_start);
```
The database physically rejects any second row for the same `(doctorId, slotStart)` pair, regardless of application logic — this is the iron-clad fallback.

*Serializable transaction (concurrent check protection):*
```typescript
await prisma.$transaction(async (tx) => {
  const existing = await tx.appointment.findFirst({
    where: { doctorId, slotStart, status: ['HELD','CONFIRMED'] }
  });
  if (existing) throw new Error('SLOT_TAKEN');
  return tx.appointment.create({ data: { status: 'HELD', holdExpiresAt, ... } });
}, { isolationLevel: 'Serializable' });
```
Two concurrent transactions may both see the slot as "available," but only one INSERT succeeds — the second throws a `P2002` unique-violation, caught and returned as a friendly 409: *"This slot was just taken. Please pick another time."*

The constraint catches edge cases the transaction check might miss (application bugs, replica lag); the transaction handles the happy path cleanly.

## 2. Slot Hold Mechanism

**The problem:** A patient selecting a slot needs several minutes to fill the symptom form. Without a hold, another patient could book that slot mid-form, wasting the first patient's effort.

**The solution — TTL-based hold:** Selecting a slot creates an `Appointment` row with `status = HELD` and `holdExpiresAt = now + 5 min`, returned immediately to the client. The unique constraint blocks other bookings for that slot while the hold is active. When computing available slots, expired holds (`holdExpiresAt < now`) are treated as available again.

A background sweeper runs every 2 minutes:
```typescript
await prisma.appointment.updateMany({
  where: { status: 'HELD', holdExpiresAt: { lt: new Date() } },
  data: { status: 'CANCELLED' },
});
```
Flow: **Hold (5-min TTL) → symptom form → Confirm (locked as CONFIRMED)**. Abandoned holds release automatically within 2 minutes.

## 3. Doctor Leave Conflict Handling

**The problem:** An admin marks a doctor unavailable on a date with existing confirmed bookings — without reconciliation, patients would show up to a closed clinic.

**The solution — reconciliation on leave creation:** `POST /api/admin/leave` creates the `DoctorLeave` row, then triggers reconciliation:
```typescript
async function reconcileLeaveConflicts(doctorId, leaveDate) {
  const affected = await prisma.appointment.findMany({
    where: { doctorId, slotStart: { gte: startOfDay, lte: endOfDay }, status: 'CONFIRMED' }
  });
  for (const apt of affected) {
    await prisma.appointment.update({ where: { id: apt.id }, data: { status: 'RESCHEDULED' } });
    sendNotification({ type: 'RESCHEDULE', ... }); // fire-and-forget, logged first
  }
}
```
Affected appointments are marked `RESCHEDULED` (kept visible in history, not deleted) and patients are emailed to rebook. Reconciliation runs as a background promise so it never blocks the admin's response; failures land in `NotificationLog` for the retry job to pick up.

**Permission model:** doctors may submit leave *requests*; only admins create the authoritative `DoctorLeave` record affecting live availability — preventing unilateral cancellations.

## 4. Notification Failure Handling

**The problem:** Email/calendar APIs fail transiently. A naive implementation either blocks the booking response on send failure, or silently drops the notification.

**The solution — log-then-send with async retry:** Every notification writes a `PENDING` `NotificationLog` row *before* attempting the send, so even a mid-send crash leaves a recoverable record:
```typescript
const log = await prisma.notificationLog.create({ data: { appointmentId, channel, type, status: 'PENDING' } });
const result = await sendEmail(opts); // try/catch
await prisma.notificationLog.update({
  where: { id: log.id },
  data: { status: result.success ? 'SENT' : 'FAILED', attempts: 1, errorMessage: result.error ?? null }
});
```
`sendNotification()` is always called `.catch(() => {})` from the booking endpoint — a failed email never produces a 500 to the patient.

A `notification-retry` cron job runs every 5 minutes with exponential backoff:
```typescript
const backoffMs = 2 ** log.attempts * 60_000; // 1m, 2m, 4m...
if (Date.now() - log.lastAttemptAt < backoffMs) continue;
```
After `MAX_NOTIFICATION_RETRIES` (default 3) attempts, the log is marked `ABANDONED` and surfaced in Admin → Notification Log, where staff can act manually — giving full delivery observability without alert fatigue from transient failures.
