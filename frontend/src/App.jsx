import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";
import Budgets from "./pages/Budgets.jsx";

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <a href="/" className="brand">Pocket<span>Ledger</span></a>
      {user && (
        <nav>
          <NavLink to="/" end>Overview</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/budgets">Budgets</NavLink>
          <button className="link-btn" onClick={logout}>Log out ({user.name.split(" ")[0]})</button>
        </nav>
      )}
    </header>
  );
}

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/transactions" element={<Protected><Transactions /></Protected>} />
          <Route path="/budgets" element={<Protected><Budgets /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="foot">Online Expense Tracking System - Cloud Computing project</footer>
    </>
  );
}
