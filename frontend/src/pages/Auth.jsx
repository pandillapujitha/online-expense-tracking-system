import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Auth() {
  const { token, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h2>{mode === "login" ? "Log in" : "Create your account"}</h2>
      <form onSubmit={submit}>
        {mode === "register" && (
          <label>Full name<input required value={form.name} onChange={set("name")} /></label>
        )}
        <label>Email<input type="email" required value={form.email} onChange={set("email")} /></label>
        <label>Password<input type="password" required minLength={6} value={form.password} onChange={set("password")} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <p className="switch">
        {mode === "login" ? "New here?" : "Already registered?"}{" "}
        <button className="link-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
      {mode === "login" && (
        <div className="demo">
          <strong>Demo account</strong>
          <button className="link-btn" type="button" onClick={() => setForm({ ...form, email: "demo@expense.com", password: "demo123" })}>
            Fill in demo login
          </button>
        </div>
      )}
    </div>
  );
}
