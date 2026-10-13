import AdminDashboardPage from "./AdminDashboardPage";

/**
 * Super Admin landing page. Foundation shell only; role-based access is
 * enforced at the route level (see App.jsx).
 */
export default function SuperAdminDashboardPage() {
  return <AdminDashboardPage title="Super Admin Dashboard" roleLabel="Super Administrator" />;
}