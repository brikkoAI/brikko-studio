import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStatus, logout, type AuthStatus } from "../api/auth.js";

export function Status() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus | null>(null);

  useEffect(() => { getStatus().then(setStatus); }, []);

  async function handleLogout() { await logout(); navigate("/"); }

  if (!status) return <div className="card">Loading…</div>;
  if (!status.logged_in) { navigate("/"); return null; }
  return (
    <div className="card" data-testid="status">
      <h1>Brikko Studio</h1>
      <p data-testid="user-email">Вы вошли как {status.user_email}</p>
      <button className="primary" onClick={handleLogout}>Выйти</button>
    </div>
  );
}
