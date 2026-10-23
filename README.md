# Online Expense Tracking System (PocketLedger)

## 🚀 Live Demo

Experience the **Online Expense Tracking System** live:

**Frontend:** [ExpenseTrack – Live Demo](https://online-expense-tracking-system-git-main-puji3.vercel.app/)

**Backend API:** [ExpenseTrack – Backend](https://expensetrack-backend-oe3l.onrender.com)

Cloud Computing project. Users record income and expenses, set monthly budgets per category, view a dashboard with charts, and export everything to CSV.

**Tech used:** HTML, CSS, JavaScript (landing site) - React.js (single-page app) - Node.js + Express (REST API) - JWT authentication - Docker (cloud deployment)

## Folder structure

```
online-expense-tracking-system/
|-- backend/            Node.js + Express REST API
|   |-- server.js       routes, auth, validation, summary, CSV export, static hosting
|   |-- db.js           JSON-file data store with demo data
|   `-- data/           db.json is created here on first run
|-- landing/            Plain HTML + CSS + JavaScript site (served at /)
|   |-- index.html
|   |-- css/style.css
|   `-- js/main.js      server status check + budget calculator
|-- frontend/           React.js app built with Vite (served at /app)
|   `-- src/            App, pages (Auth, Dashboard, Transactions, Budgets), api helper
|-- Dockerfile          Multi-stage build for cloud deployment
|-- docker-compose.yml
`-- README.md
```

## Run it locally (easiest way)

Requires Node.js 18 or newer.

```bash
cd backend
npm install
npm start
```

Open:

- http://localhost:5000/ - landing site (HTML, CSS, JS)
- http://localhost:5000/app/ - React expense tracker
- http://localhost:5000/api/health - API health check

A prebuilt React app is included in `frontend/dist`. To rebuild it after changing React code:

```bash
cd frontend
npm install
npm run build
```

## Run in development mode (hot reload for React)

Terminal 1:

```bash
cd backend && npm install && npm run dev
```

Terminal 2:

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173/app/ - Vite forwards `/api` calls to the backend on port 5000.

## Demo account

| Email | Password |
|-------|----------|
| demo@expense.com | demo123 |

The demo account comes with four months of sample transactions and three budgets. You can also create your own account from the Log in page (a new account starts empty).

## Features

- Register and log in (each user sees only their own data)
- Add, edit and delete income and expense transactions
- Filter by month, type and category, and search notes
- Overview: income, expenses, balance and savings rate for any month
- Spending by category and a six-month income vs expenses chart
- Monthly budgets per category, with amber warning at 80% and red when over budget
- Download all transactions as a CSV file
- Landing page budget calculator written in plain JavaScript

**Security:** passwords hashed with bcrypt, JWT tokens (7 day expiry), every transaction route checks that the record belongs to the logged-in user, and all input is validated on the server.

## REST API

All routes except health, categories, register and login need the header `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/health | Health check for load balancers |
| GET | /api/categories | Expense and income categories |
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Log in, returns JWT |
| GET | /api/auth/me | Current user |
| GET | /api/transactions | List (`?month=YYYY-MM&type=&category=&search=`) |
| POST | /api/transactions | Add a transaction |
| PUT | /api/transactions/:id | Update a transaction |
| DELETE | /api/transactions/:id | Delete a transaction |
| GET | /api/budgets | List budgets |
| PUT | /api/budgets | Set a category limit (`{category, limit}`, 0 removes it) |
| GET | /api/summary | Dashboard data (`?month=YYYY-MM`) |
| GET | /api/export | CSV download of all transactions |

Example request body for `POST /api/transactions`:

```json
{ "type": "expense", "amount": 450, "category": "Food", "date": "2026-10-23", "note": "Lunch" }
```

## Cloud deployment

### Option 1 - Docker (works on any cloud)

```bash
docker compose up --build
```

The app is then available at http://localhost:5000. Data is kept in the `expense-data` volume.

### Option 2 - AWS EC2

1. Launch an Ubuntu EC2 instance and open port 5000 (or 80) in the security group.
2. Install Docker and copy this project to the server.
3. Run `docker compose up -d --build`.
4. Set a strong `JWT_SECRET` in `docker-compose.yml`.

### Option 3 - Render / Railway / Elastic Beanstalk

Create a web service from the Dockerfile in this folder. Set the environment variable `JWT_SECRET`. Use `/api/health` as the health check path.

### Cloud concepts shown in this project

- **SaaS delivery:** users only need a browser
- **Three-tier architecture:** presentation (landing + React), application (Express API), data (store in `db.js`)
- **Stateless API:** JWT means any number of server copies can run behind a load balancer
- **Containerization:** Docker image with a health check
- **Scalability note:** the JSON file store is for demonstration. For production, replace `db.js` with MongoDB Atlas, Amazon RDS or DynamoDB so several servers can share data.

## Environment variables

| Name | Default | Meaning |
|------|---------|---------|
| PORT | 5000 | Server port |
| JWT_SECRET | dev-secret-change-me | Secret used to sign tokens - change in production |
| DB_FILE | backend/data/db.json | Location of the data file |
| VITE_API_URL | (empty) | Only needed when the React app is hosted on a different domain than the API |
