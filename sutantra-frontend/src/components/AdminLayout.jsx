import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Brand from "./Brand";

/**
 * Shared chrome for the admin / super-admin area: branded header, module
 * navigation (Users is only shown to SUPER_ADMIN; the API enforces it too),
 * and a page heading slot. Every admin page is rendered inside this layout.
 */
export default function AdminLayout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const modules = [
    { to: "/admin", label: "Dashboard", end: true },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/categories", label: "Categories" },
    { to: "/admin/banners", label: "Banners" },
    { to: "/admin/vision", label: "Vision" },
    { to: "/admin/policies", label: "Policies" }
  ];

  if (user?.role === "SUPER_ADMIN") {
    modules.push({ to: "/admin/users", label: "Users" });
  }

  async function signOut() {
    await logout();
    navigate("/", { replace: true });
  }

  const isSuper = user?.role === "SUPER_ADMIN";

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="header-actions">
          <span className="admin-role-pill">{isSuper ? "Super Admin" : "Admin"}</span>
          <Link className="button button-light" to="/products">View Store</Link>
          <button className="button button-outline" type="button" onClick={signOut}>Logout</button>
        </div>
      </header>

      <nav className="admin-nav" aria-label="Admin modules">
        <div className="admin-nav-inner">
          {modules.map((module) => (
            <NavLink
              key={module.to}
              to={module.to}
              end={module.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
            >
              {module.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <section className="admin-content content-width">
        <div className="admin-page-head">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="admin-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="admin-page-actions">{actions}</div>}
        </div>
        {children}
      </section>
    </main>
  );
}
