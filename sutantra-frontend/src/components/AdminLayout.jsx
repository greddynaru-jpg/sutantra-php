import { Link, useLocation, useNavigate } from "react-router-dom";
import { roleHome, useAuth } from "../contexts/AuthContext";
import Brand from "./Brand";

/**
 * Shared chrome for the admin / super-admin area: branded header and a page
 * heading slot. Every admin page is rendered inside this layout.
 *
 * The horizontal module tab bar (Dashboard / Products / Categories / Users and,
 * for a super admin, Home Page) has been removed. Each module page instead
 * offers a small "Back to Dashboard" link at its section level (beside the page
 * title), targeting the signed-in role's own landing route, so a directly
 * opened module URL still has a way back.
 *
 * `titleClassName` lets a page tweak just its own heading (e.g. the dashboards
 * use a slightly smaller title). Hiding a link is only a convenience; the
 * routes are guarded in App.jsx and every restricted endpoint is enforced
 * server-side too.
 */
export default function AdminLayout({ title, subtitle, actions, titleClassName = "", topNav = null, hideBackToDashboard = false, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuper = user?.role === "SUPER_ADMIN";
  // The signed-in role's own dashboard: ADMIN → /admin, SUPER_ADMIN → /super-admin.
  const dashboardPath = user ? roleHome(user.role) : "/admin";
  const showBackToDashboard = !hideBackToDashboard && location.pathname !== dashboardPath;

  async function signOut() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <main className="admin-page">
      {/* The bottom border reproduces the Cart page's header separator
          (.cart-header: 1px solid #EAE6DD) immediately below the logo/header. */}
      <header className="admin-header" style={{ borderBottom: "1px solid #EAE6DD" }}>
        <Brand />
        <div className="header-actions">
          <span className="admin-role-pill">{isSuper ? "Super Admin" : "Admin"}</span>
          {isSuper && <Link className="button button-light" to="/">Home</Link>}
          <Link className="button button-light" to="/products">View Store</Link>
          <button className="button button-outline" type="button" onClick={signOut}>Logout</button>
        </div>
      </header>

      <section className="admin-content content-width">
        {topNav && <div className="admin-top-nav">{topNav}</div>}
        <div className="admin-page-head">
          <div>
            {showBackToDashboard && (
              <Link className="admin-back-link" to={dashboardPath}>
                ← Back to Dashboard
              </Link>
            )}
            <h1 className={titleClassName || undefined}>{title}</h1>
            {subtitle && <p className="admin-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="admin-page-actions">{actions}</div>}
        </div>

        {children}
      </section>
    </main>
  );
}
