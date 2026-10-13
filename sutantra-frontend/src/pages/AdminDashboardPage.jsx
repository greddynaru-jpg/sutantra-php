import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../contexts/AuthContext";

export default function AdminDashboardPage({ title = "Admin Dashboard" }) {
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";

  const modules = [
    { to: "/admin/products", title: "Products", note: "Create, edit and retire catalogue items." },
    { to: "/admin/categories", title: "Categories", note: "Add and organise product categories." },
    { to: "/admin/banners", title: "Banners", note: "Manage the rotating homepage banners." },
    { to: "/admin/vision", title: "Vision", note: "Edit the homepage About text." },
    { to: "/admin/policies", title: "Policies", note: "Footer documents: privacy, terms, refunds." }
  ];

  if (isSuper) {
    modules.push({ to: "/admin/users", title: "Users", note: "Manage customers and administrators." });
  }

  return (
    <AdminLayout
      title={title}
      subtitle={`Welcome, ${user?.name || user?.email}. Manage the storefront content below.`}
    >
      <div className="admin-module-grid">
        {modules.map((module) => (
          <Link key={module.to} to={module.to} className="admin-module-card admin-module-link">
            <h2>{module.title}</h2>
            <p>{module.note}</p>
            <span className="admin-module-cta">Manage →</span>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
