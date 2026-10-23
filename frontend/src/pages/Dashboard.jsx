import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, monthLabel, thisMonth } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Dashboard() {
  const { token } = useAuth();
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api("/summary?month=" + month, { token }).then(setData).catch((e) => setError(e.message));
  }, [month, token]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="empty">Loading your summary...</p>;

  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.total));
  const maxTrend = Math.max(1, ...data.trend.flatMap((t) => [t.income, t.expense]));

  return (
    <>
      <div className="head">
        <h1>Overview</h1>
        <label className="inline">Month
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </div>

      <section className="cards">
        <div className="stat income"><span>Income</span><strong>{money(data.income)}</strong></div>
        <div className="stat expense"><span>Expenses</span><strong>{money(data.expense)}</strong></div>
        <div className={"stat " + (data.balance >= 0 ? "income" : "expense")}><span>Balance</span><strong>{money(data.balance)}</strong></div>
        <div className="stat"><span>Savings rate</span><strong>{data.savingsRate === null ? "-" : data.savingsRate + "%"}</strong></div>
      </section>

      {data.count === 0 && (
        <p className="empty">Nothing recorded for {monthLabel(month)}. <Link to="/transactions">Add a transaction</Link></p>
      )}

      <div className="two">
        <section className="panel">
          <h2>Where the money went</h2>
          {data.byCategory.length === 0 ? <p className="empty">No expenses this month.</p> : (
            <ul className="bars">
              {data.byCategory.map((c) => (
                <li key={c.category}>
                  <span>{c.category}</span>
                  <div className="track"><div style={{ width: (c.total / maxCat) * 100 + "%" }} /></div>
                  <em>{money(c.total)}</em>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Last six months</h2>
          <div className="trend" role="img" aria-label="Income and expenses for the last six months">
            {data.trend.map((t) => (
              <div key={t.month} className="col">
                <div className="pair">
                  <div className="bar inc" style={{ height: (t.income / maxTrend) * 100 + "%" }} title={"Income " + money(t.income)} />
                  <div className="bar exp" style={{ height: (t.expense / maxTrend) * 100 + "%" }} title={"Expenses " + money(t.expense)} />
                </div>
                <small>{monthLabel(t.month).split(" ")[0]}</small>
              </div>
            ))}
          </div>
          <p className="legend"><i className="dot inc" /> Income <i className="dot exp" /> Expenses</p>
        </section>
      </div>

      <section className="panel">
        <h2>Budgets for {monthLabel(month)}</h2>
        {data.budgets.length === 0 ? (
          <p className="empty">No budgets yet. <Link to="/budgets">Set a monthly limit</Link> to get a warning before you overspend.</p>
        ) : (
          <ul className="bars budget">
            {data.budgets.map((b) => (
              <li key={b.category}>
                <span>{b.category}</span>
                <div className="track"><div className={b.percent >= 100 ? "over" : b.percent >= 80 ? "warn" : ""} style={{ width: Math.min(100, b.percent) + "%" }} /></div>
                <em>{money(b.spent)} of {money(b.limit)}{b.percent >= 100 ? " - over budget" : ""}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
