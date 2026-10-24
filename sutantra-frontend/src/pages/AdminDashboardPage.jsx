import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../contexts/AuthContext";

export default function AdminDashboardPage({ title = "Admin Dashboard" }) {
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";

  // The dashboard shows exactly the modules the signed-in role may manage.
  const modules = [
    { to: "/admin/products", title: "Products", note: "Create, edit and retire catalogue items." },
    { to: "/admin/categories", title: "Categories", note: "Add and organise product categories." },
    { to: "/admin/offers", title: "Offer Codes", note: "Create and manage discount offer codes." },
    { to: "/admin/orders", title: "Order Management", note: "View and manage customer orders." },
    { to: "/admin/order-statuses", title: "Order Status Management", note: "Configure order status definitions." },
    { to: "/admin/users", title: "Users", note: isSuper ? "Manage customers and administrators." : "Manage customer accounts." }
  ];

  if (isSuper) {
    modules.unshift({
      to: "/admin/home-page",
      title: "Home Page",
      note: "Logo, banners, directors’ vision, policies and our team."
    });
  }

  return (
    <AdminLayout
      title={title}
      titleClassName="admin-dashboard-title"
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
