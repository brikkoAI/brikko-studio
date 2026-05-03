import { useState } from "react";
import { startLogin } from "../api/auth.js";

export function Welcome() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true); setError(null);
    try {
      const { authorize_url } = await startLogin();
      window.location.assign(authorize_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  return (
    <div className="card" data-testid="welcome">
      <h1>Добро пожаловать в Brikko Studio</h1>
      <p>Российский AI-агент с обезличиванием персональных данных</p>
      <button className="primary" onClick={handleLogin} disabled={loading} data-testid="login-button">
        {loading ? "Открываем браузер…" : "Войти через Brikko"}
      </button>
      {error && <p className="error" data-testid="error">{error}</p>}
      <p className="footer">При входе вы соглашаетесь с условиями использования</p>
    </div>
  );
}
