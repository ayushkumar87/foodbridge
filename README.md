# FoodBridge

FoodBridge is a student-level MERN project for **SDG 2 - Zero Hunger**. It helps food donors list safe surplus food and lets volunteers claim it before it expires.

The aim is deliberately practical: it is more complete than a basic CRUD project, but the code stays small enough to explain in a viva.

## Features

- Register and sign in as a donor, volunteer, NGO, or admin
- Add, edit, delete, search, and filter surplus-food listings
- Claim available listings and update a pickup status
- See personal activity and an admin impact dashboard
- Use MongoDB validation, references, embedded fields, indexes, text search, aggregation, and a small PyMongo analytics script

## Project structure

```text
FoodBridge/
  backend/       Express, Mongoose, REST API
  frontend/      React + Vite user interface
  analytics/     PyMongo waste-risk script
```

## Quick start

You need Node.js 18+, a MongoDB Atlas database (or local MongoDB), and optionally Python 3.10+ for the analytics script.

### 1. Configure and start the backend

```bash
cd backend
copy .env.example .env
# Put your MongoDB connection string and a JWT secret in .env
npm install
npm run dev
```

The API starts at `http://localhost:5000`.

### 2. Start the React frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`.

### 3. Optional: create demo data

After the backend `.env` is configured:

```bash
cd backend
npm run seed
```

Demo password for seeded accounts: `Password123!`

### 4. Optional: run the PyMongo analytics script

```bash
cd analytics
pip install -r requirements.txt
copy .env.example .env
python waste_risk.py
```

## Syllabus coverage

| Topic | Where it appears |
| --- | --- |
| MongoDB CRUD | Listing, claim, and profile routes |
| BSON types | ObjectId, String, Number, Boolean, Date, arrays, embedded documents |
| Embedding vs referencing | Embedded pickup details and volunteer profile; references for users, listings, and claims |
| Relationships | One-to-one profile, one-to-many donor listings, and many-to-many claim history |
| Validation | Mongoose required fields, enums, lengths, min values, and expiry validation |
| Indexes | Single, compound, and text indexes in `FoodListing` |
| Query optimization | Pagination/projection and `scripts/show-query-plan.js` using `explain()` |
| Aggregation | Admin dashboard route with `$match`, `$group`, `$lookup`, `$unwind`, and `$project` |
| Node.js integration | Express + Mongoose REST API |
| Python integration | `analytics/waste_risk.py` uses PyMongo to identify urgent listings |

## talking points

- MongoDB fits this app because food listings can have flexible tags, pickup details, and different user roles without many SQL joins.
- The `pickup` object is embedded because it only belongs to one listing. The donor and claims are referenced because they are reused across many documents.
- The compound index on `status`, `pickup.pincode`, and `expiryAt` supports the common query: “available food near me, ordered by expiry.”
- The risk script is a small, explainable predictive feature. It converts expiry time, quantity, and claim history into a waste-risk score.
