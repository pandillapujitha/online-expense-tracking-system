const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { load, save, uid } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const db = load();

const CATEGORIES = {
  expense: ['Food', 'Transport', 'Rent', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'],
  income: ['Salary', 'Freelance', 'Gift', 'Other']
};

app.use(cors());
app.use(express.json());

/* ---------- helpers ---------- */
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
const sign = (u) => jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' });
const round2 = (n) => Math.round(n * 100) / 100;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isMonth = (s) => /^\d{4}-\d{2}$/.test(s);
const currentMonth = () => new Date().toISOString().slice(0, 7);

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in first.' });
  try {
    req.user = db.users.find((u) => u.id === jwt.verify(token, SECRET).id);
    if (!req.user) return res.status(401).json({ error: 'Account no longer exists.' });
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

// Validates the body of a create / update request. Returns { error } or { value }.
function readTransaction(body) {
  const { type, amount, category, note, date } = body || {};
  if (!CATEGORIES[type]) return { error: 'Type must be expense or income.' };
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || value > 1e9) return { error: 'Amount must be a number greater than 0.' };
  if (!CATEGORIES[type].includes(category)) return { error: 'Choose a valid category for ' + type + '.' };
  if (!isDate(date)) return { error: 'Enter a valid date.' };
  return { value: { type, amount: round2(value), category, note: String(note || '').trim().slice(0, 120), date } };
}

const monthOf = (t) => t.date.slice(0, 7);
const sum = (list) => round2(list.reduce((s, t) => s + t.amount, 0));

/* ---------- health (used by cloud load balancers) ---------- */
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() }));
app.get('/api/categories', (req, res) => res.json(CATEGORIES));

/* ---------- auth ---------- */
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.users.some((u) => u.email === email.trim().toLowerCase()))
    return res.status(409).json({ error: 'That email is already registered.' });
  const user = { id: uid(), name: name.trim(), email: email.trim().toLowerCase(), password: bcrypt.hashSync(password, 8) };
  db.users.push(user);
  save();
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email === String(email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password))
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

/* ---------- transactions ---------- */
app.get('/api/transactions', auth, (req, res) => {
  const { month, type, category, search } = req.query;
  const s = String(search || '').toLowerCase();
  const list = db.transactions
    .filter((t) => t.userId === req.user.id)
    .filter((t) => !month || monthOf(t) === month)
    .filter((t) => !type || t.type === type)
    .filter((t) => !category || t.category === category)
    .filter((t) => !s || t.note.toLowerCase().includes(s) || t.category.toLowerCase().includes(s))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  res.json(list);
});

app.post('/api/transactions', auth, (req, res) => {
  const r = readTransaction(req.body);
  if (r.error) return res.status(400).json({ error: r.error });
  const t = { id: uid(), userId: req.user.id, ...r.value };
  db.transactions.push(t);
  save();
  res.status(201).json(t);
});

function ownTransaction(req, res, next) {
  const t = db.transactions.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!t) return res.status(404).json({ error: 'Transaction not found.' });
  req.tx = t;
  next();
}

app.put('/api/transactions/:id', auth, ownTransaction, (req, res) => {
  const r = readTransaction(req.body);
  if (r.error) return res.status(400).json({ error: r.error });
  Object.assign(req.tx, r.value);
  save();
  res.json(req.tx);
});

app.delete('/api/transactions/:id', auth, ownTransaction, (req, res) => {
  db.transactions = db.transactions.filter((x) => x.id !== req.tx.id);
  save();
  res.json({ ok: true });
});

/* ---------- budgets (monthly limit per expense category) ---------- */
app.get('/api/budgets', auth, (req, res) => {
  res.json(db.budgets.filter((b) => b.userId === req.user.id).map(({ category, limit }) => ({ category, limit })));
});

app.put('/api/budgets', auth, (req, res) => {
  const { category, limit } = req.body || {};
  const value = Number(limit);
  if (!CATEGORIES.expense.includes(category)) return res.status(400).json({ error: 'Choose a valid expense category.' });
  if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'Limit must be 0 or more. Use 0 to remove a budget.' });
  db.budgets = db.budgets.filter((b) => !(b.userId === req.user.id && b.category === category));
  if (value > 0) db.budgets.push({ userId: req.user.id, category, limit: round2(value) });
  save();
  res.json({ ok: true });
});

/* ---------- summary for the dashboard ---------- */
app.get('/api/summary', auth, (req, res) => {
  const month = isMonth(req.query.month) ? req.query.month : currentMonth();
  const mine = db.transactions.filter((t) => t.userId === req.user.id);
  const inMonth = mine.filter((t) => monthOf(t) === month);
  const income = sum(inMonth.filter((t) => t.type === 'income'));
  const expense = sum(inMonth.filter((t) => t.type === 'expense'));

  const byCategory = CATEGORIES.expense
    .map((c) => ({ category: c, total: sum(inMonth.filter((t) => t.type === 'expense' && t.category === c)) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // last six months ending at the selected month
  const [y, m] = month.split('-').map(Number);
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    const rows = mine.filter((t) => monthOf(t) === key);
    trend.push({ month: key, income: sum(rows.filter((t) => t.type === 'income')), expense: sum(rows.filter((t) => t.type === 'expense')) });
  }

  const budgets = db.budgets
    .filter((b) => b.userId === req.user.id)
    .map((b) => {
      const spent = (byCategory.find((c) => c.category === b.category) || { total: 0 }).total;
      return { category: b.category, limit: b.limit, spent, percent: Math.round((spent / b.limit) * 100) };
    });

  res.json({
    month, income, expense, balance: round2(income - expense),
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : null,
    byCategory, trend, budgets, count: inMonth.length
  });
});

/* ---------- CSV export ---------- */
app.get('/api/export', auth, (req, res) => {
  const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const rows = db.transactions
    .filter((t) => t.userId === req.user.id)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.type, t.category, t.amount, t.note].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
  res.send(['Date,Type,Category,Amount,Note', ...rows].join('\n'));
});

/* ---------- static: landing site at "/", React app at "/app" ---------- */
const landing = path.join(__dirname, '..', 'landing');
const reactDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(reactDist)) {
  app.use('/app', express.static(reactDist));
  app.get('/app/*', (req, res) => res.sendFile(path.join(reactDist, 'index.html')));
}
app.use(express.static(landing));

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));

app.listen(PORT, () => console.log(`Expense tracker running on http://localhost:${PORT}`));
