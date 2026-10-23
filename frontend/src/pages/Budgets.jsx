import { useEffect, useState } from "react";
import { api, money } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Budgets() {
  const { token } = useAuth();
  const [cats, setCats] = useState([]);
  const [limits, setLimits] = useState({});
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([api("/categories"), api("/budgets", { token })])
      .then(([c, b]) => {
        setCats(c.expense);
        setLimits(Object.fromEntries(b.map((x) => [x.category, String(x.limit)])));
      })
      .catch((e) => setError(e.message));
  }, [token]);

  async function save(category) {
    setError(""); setMsg("");
    try {
      await api("/budgets", { method: "PUT", token, body: { category, limit: limits[category] || 0 } });
      setMsg(Number(limits[category]) > 0 ? category + " budget saved." : category + " budget removed.");
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <h1>Monthly budgets</h1>
      <p className="lead">Set a spending limit for a category. The overview turns amber at 80% and red when you go over. Enter 0 to remove a limit.</p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="note">{msg}</p>}
      <section className="panel">
        <ul className="budget-list">
          {cats.map((c) => (
            <li key={c}>
              <label htmlFor={"b-" + c}>{c}</label>
              <input id={"b-" + c} type="number" min="0" step="100" placeholder="No limit" value={limits[c] || ""}
                onChange={(e) => setLimits({ ...limits, [c]: e.target.value })} />
              <button className="btn small" onClick={() => save(c)}>Save</button>
              <span className="meta">{limits[c] > 0 ? money(limits[c]) + " per month" : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
