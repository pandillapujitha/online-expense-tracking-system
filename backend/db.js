// Tiny JSON-file data store. Swap this module for MongoDB / PostgreSQL / DynamoDB
// when deploying to a real cloud database - the routes only use load() and save().
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'db.json');
let db = null;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Date string (YYYY-MM-DD) `monthsAgo` months back, on the given day (1-28).
function dateAgo(monthsAgo, day) {
  const t = new Date();
  t.setDate(1);
  t.setMonth(t.getMonth() - monthsAgo);
  t.setDate(day);
  return t.toISOString().slice(0, 10);
}

function seed() {
  const userId = 'u-demo';
  const tx = (type, amount, category, note, monthsAgo, day) =>
    ({ id: uid(), userId, type, amount, category, note, date: dateAgo(monthsAgo, day) });

  const transactions = [];
  for (let m = 0; m < 4; m++) {
    transactions.push(
      tx('income', 52000, 'Salary', 'Monthly salary', m, 1),
      tx('expense', 14000, 'Rent', 'House rent', m, 3),
      tx('expense', 3200 + m * 250, 'Food', 'Groceries', m, 6),
      tx('expense', 850, 'Transport', 'Metro card recharge', m, 8),
      tx('expense', 1800 - m * 120, 'Bills', 'Electricity and internet', m, 10),
      tx('expense', 2400 + (m % 2) * 900, 'Shopping', 'Clothes and accessories', m, 14),
      tx('expense', 700, 'Entertainment', 'Movie and snacks', m, 16),
      tx('expense', 1500 + (m % 3) * 400, 'Food', 'Eating out', m, 18)
    );
  }
  transactions.push(tx('income', 6000, 'Freelance', 'Website project', 1, 20));

  return {
    users: [{ id: userId, name: 'Demo User', email: 'demo@expense.com', password: bcrypt.hashSync('demo123', 8) }],
    transactions,
    budgets: [
      { userId, category: 'Food', limit: 6000 },
      { userId, category: 'Shopping', limit: 3000 },
      { userId, category: 'Entertainment', limit: 1500 }
    ]
  };
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function load() {
  if (db) return db;
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } else {
    db = seed();
    save();
  }
  return db;
}

module.exports = { load, save, uid };
