import { useCallback, useEffect, useState } from "react";
import { api, downloadCsv, money, thisMonth } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ type: "expense", amount: "", category: "Food", date: today(), note: "" });

export default function Transactions() {
  const { token } = useAuth();
  const [cats, setCats] = useState({ expense: [], income: [] });
  const [list, setList] = useState([]);
  const [filters, setFilters] = useState({ month: thisMonth(), type: "", category: "", search: "" });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { api("/categories").then(setCats).catch(() => {}); }, []);

  const load = useCallback(() => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api("/transactions?" + q, { token }).then(setList).catch((e) => setError(e.message));
  }, [filters, token]);
  useEffect(load, [load]);

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const setForm1 = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function changeType(type) {
    setForm({ ...form, type, category: cats[type][0] });
  }

  async function submit(e) {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      if (editing) await api("/transactions/" + editing, { method: "PUT", token, body: form });
      else await api("/transactions", { method: "POST", token, body: form });
      setMsg(editing ? "Transaction updated." : "Transaction added.");
      setForm(blank()); setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  }

  function startEdit(t) {
    setEditing(t.id);
    setForm({ type: t.type, amount: t.amount, category: t.category, date: t.date, note: t.note });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(t) {
    if (!window.confirm("Delete " + money(t.amount) + " (" + t.category + ")?")) return;
    try { await api("/transactions/" + t.id, { method: "DELETE", token }); setMsg("Transaction deleted."); load(); }
    catch (err) { setError(err.message); }
  }

  const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <div className="head">
        <h1>Transactions</h1>
        <button className="btn ghost" onClick={() => downloadCsv(token).catch((e) => setError(e.message))}>Download CSV</button>
      </div>

      <section className="panel">
        <h2>{editing ? "Edit transaction" : "Add a transaction"}</h2>
        <form onSubmit={submit} className="tx-form">
          <div className="seg" role="group" aria-label="Type">
            <button type="button" className={form.type === "expense" ? "on exp" : ""} onClick={() => changeType("expense")}>Expense</button>
            <button type="button" className={form.type === "income" ? "on inc" : ""} onClick={() => changeType("income")}>Income</button>
          </div>
          <label>Amount (INR)<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={setForm1("amount")} /></label>
          <label>Category
            <select value={form.category} onChange={setForm1("category")}>
              {(cats[form.type] || []).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Date<input type="date" required value={form.date} onChange={setForm1("date")} /></label>
          <label className="wide">Note<input maxLength={120} placeholder="Optional" value={form.note} onChange={setForm1("note")} /></label>
          <div className="wide row">
            <button className="btn">{editing ? "Save changes" : "Add transaction"}</button>
            {editing && <button type="button" className="link-btn" onClick={() => { setEditing(null); setForm(blank()); }}>Cancel edit</button>}
          </div>
        </form>
        {error && <p className="error">{error}</p>}
        {msg && <p className="note">{msg}</p>}
      </section>

      <section className="filters">
        <input type="month" value={filters.month} onChange={setF("month")} aria-label="Month" />
        <select value={filters.type} onChange={setF("type")} aria-label="Type">
          <option value="">All types</option><option value="expense">Expenses</option><option value="income">Income</option>
        </select>
        <select value={filters.category} onChange={setF("category")} aria-label="Category">
          <option value="">All categories</option>
          {[...new Set([...cats.expense, ...cats.income])].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="search" placeholder="Search notes" value={filters.search} onChange={setF("search")} aria-label="Search notes" />
        <button className="link-btn" onClick={() => setFilters({ month: "", type: "", category: "", search: "" })}>Show all time</button>
      </section>

      <p className="meta">{list.length} transactions - income {money(income)} - expenses {money(expense)}</p>
      {list.length === 0 ? <p className="empty">No transactions match these filters. Change the month or add one above.</p> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Date</th><th>Category</th><th>Note</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.category}</td>
                  <td>{t.note || "-"}</td>
                  <td className={"num " + (t.type === "income" ? "pos" : "neg")}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</td>
                  <td className="acts">
                    <button className="link-btn" onClick={() => startEdit(t)}>Edit</button>
                    <button className="link-btn danger-text" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
