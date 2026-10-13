import AdminDashboardPage from "./AdminDashboardPage";

/**
 * Super Admin landing page — same modules as the admin dashboard plus user
 * management. Role-based access is enforced at the route level (App.jsx) and
 * again server-side by the API.
 */
export default function SuperAdminDashboardPage() {
  return <AdminDashboardPage title="Super Admin Dashboard" />;
}
