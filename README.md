# Hisaab360 📒

**A digital credit ledger app that automates payment tracking and reminders for small business owners.**

Hisaab360 helps shopkeepers who extend informal credit ("udhaar") to customers — replacing manual bookkeeping and weekly in-person payment collection with automated, deadline-based digital tracking.

## Why I Built This

Small business owners often extend credit to regular customers and spend significant time each week manually tracking who owes what and following up in person for payments. This project was inspired by watching my father — a small business owner — spend his one weekly day off collecting overdue payments instead of resting.

Hisaab360 aims to give that time back by letting business owners log purchases digitally, set flexible payment deadlines, and let the app handle reminders — while giving customers a transparent way to track and settle what they owe.

## Features

- **Dual user roles** — separate experiences for **Sellers** (shop owners) and **Customers**
- **Shop Code linking** — customers link their account to a specific seller using a unique shop code, keeping data scoped per business
- **Purchase tracking** — sellers log customer name, purchase amount, and a personalized payment deadline
- **Firebase Authentication** — secure email/password login for both sellers and customers
- **Cloud Firestore backend** — real-time, structured data storage for users, customers, and transactions
- **Escalating penalty system** *(in progress)* — overdue payments accrue a tiered daily penalty rather than a flat late fee
- **Automated payment reminders** *(in progress)* — WhatsApp-based notifications as deadlines approach, removing the need for manual follow-up

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Kotlin, Android (native, Views-based UI) |
| Backend / Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| Notifications | WhatsApp Cloud API *(planned)* |
| IDE | Android Studio |

## App Architecture

```
Hisaab360/
├── MainActivity.kt            → Login screen, routes user by role after auth
├── SignUpActivity.kt          → Registration (Seller / Customer role selection + shop code linking)
├── AddPurchaseActivity.kt     → Seller screen to log a new customer purchase
├── res/layout/                → XML layouts for each screen
└── google-services.json       → Firebase project configuration
```

### Data Model (Firestore)

**`users` collection**
| Field | Type | Notes |
|---|---|---|
| `uid` | String | Matches Firebase Auth user ID |
| `name` | String | |
| `phone` | String | |
| `role` | String | `"seller"` or `"customer"` |
| `shopCode` | String | Auto-generated, sellers only |
| `linkedShopCode` | String | Entered at signup, customers only |

**`customers` collection**
| Field | Type | Notes |
|---|---|---|
| `name` | String | |
| `phone` | String | |
| `createdAt` | Timestamp | |

**`transactions` collection**
| Field | Type | Notes |
|---|---|---|
| `customerId` | String | Links to a `customers` document |
| `amount` | Number | Purchase amount |
| `purchaseDate` | Timestamp | |
| `deadlineDate` | Timestamp | Auto-calculated from days-to-pay input |
| `isPaid` | Boolean | |
| `penaltyAccrued` | Number | Updates as payment becomes overdue |

## How It Works

1. **Sign up** as a Seller or Customer. Sellers receive an auto-generated shop code; customers enter their seller's shop code to link their account.
2. **Sellers** log each purchase with the customer's name, amount, and a payment deadline (in days).
3. As the deadline approaches, the customer receives automated reminders *(planned)*, with an escalating penalty applied if the payment goes overdue.
4. **Customers** can view what they owe and settle payments directly *(planned)*.

## Setup / Run Locally

1. Clone the repo
2. Open in Android Studio
3. Add your own `google-services.json` (from a Firebase project with Firestore + Authentication enabled) into the `app/` directory
4. Enable **Email/Password** sign-in under Firebase Authentication
5. Create a Firestore database in test mode (or configure security rules for production use)
6. Run on an emulator or physical device

## Roadmap

- [x] Firebase Authentication (Email/Password)
- [x] Firestore-backed purchase logging
- [x] Dual-role sign-up (Seller / Customer) with shop code linking
- [ ] Seller dashboard — customer list & overdue payments view
- [ ] Customer dashboard — view owed amounts and payment history
- [ ] WhatsApp Cloud API integration for automated reminders
- [ ] Tiered penalty calculation via scheduled Cloud Function
- [ ] Firestore security rules (restrict data access by role/shop code)
- [ ] In-app payment settlement (UPI integration)

## Screenshots

*(Add screenshots of the Login, Sign Up, and Add Purchase screens here before publishing)*

## Author

**Vanshika**
*Add LinkedIn / portfolio link here*

---

*This project is under active development as a learning-and-build exercise in native Android development, Firebase integration, and product design for a real-world small business use case.*
