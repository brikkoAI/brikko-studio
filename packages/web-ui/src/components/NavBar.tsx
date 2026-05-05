import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "../i18n/index.js";

/**
 * Top navigation bar. Hidden on auth pages (`/`, `/callback`, `/onboarding`)
 * to keep the welcome flow distraction-free.
 */
export function NavBar(): JSX.Element | null {
  const t = useTranslation();
  const { pathname } = useLocation();
  const hideOn = new Set(["/", "/callback", "/onboarding"]);
  if (hideOn.has(pathname)) return null;

  return (
    <nav className="navbar" data-testid="navbar">
      <div className="navbar-brand">Brikko Studio</div>
      <div className="navbar-links">
        <NavLink to="/chat" className={({ isActive }) => "navlink" + (isActive ? " active" : "")}>
          {t("nav.chat")}
        </NavLink>
        <NavLink to="/privacy" className={({ isActive }) => "navlink" + (isActive ? " active" : "")}>
          {t("nav.privacy")}
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => "navlink" + (isActive ? " active" : "")}>
          {t("nav.settings")}
        </NavLink>
      </div>
    </nav>
  );
}
