import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../contexts/AuthContext";

const MODULES = [
  { title: "Products", note: "Manage the product catalogue" },
  { title: "Categories", note: "Add and organise product categories" },
  { title: "Banners", note: "Manage homepage banners" },
  { title: "Vision & Policies", note: "Edit the homepage vision and policy pages" },
  { title: "Users", note: "Manage customer and administrator accounts" },
  { title: "Orders", note: "Track and fulfil customer orders" }
];

export default function AdminDashboardPage({ title = "Admin Dashboard", roleLabel = "Administrator" }) {
  const { user, logout } = useAuth();

  async function signOut() {
    await logout();
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Brand />
        <div className="header-actions">
          <Link className="button button-light" to="/products">View Store</Link>
          <button className="button button-outline" type="button" onClick={signOut}>Logout</button>
        </div>
      </header>
      <section className="admin-content content-width">
        <span className="eyebrow">{roleLabel} Area</span>
        <h1>{title}</h1>
        <p className="auth-intro">
          Welcome, {user.name || user.email}. Admin modules arrive in a later phase; the
          foundation dashboard is shown here first.
        </p>
        <div className="admin-module-grid">
          {MODULES.map((mod) => (
            <article key={mod.title} className="admin-module-card">
              <h2>{mod.title}</h2>
              <p>{mod.note}</p>
              <span className="admin-module-badge">Later phase</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}