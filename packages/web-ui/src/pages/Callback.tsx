import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeLogin } from "../api/auth.js";

export function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) { setError("Missing code or state in callback"); return; }
    completeLogin(code, state).then(() => navigate("/status")).catch((e: Error) => setError(e.message));
  }, [params, navigate]);

  return (
    <div className="card" data-testid="callback">
      {error ? (
        <>
          <h1>Не удалось войти</h1>
          <p className="error" data-testid="error">{error}</p>
          <button className="primary" onClick={() => navigate("/")}>Попробовать снова</button>
        </>
      ) : (
        <>
          <h1>Завершаем вход…</h1>
          <p>Пожалуйста, подождите.</p>
        </>
      )}
    </div>
  );
}
