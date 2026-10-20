import { Navigate, Route, Routes } from "react-router-dom";
import { roleHome, useAuth } from "./contexts/AuthContext";
import AdminBannersPage from "./pages/AdminBannersPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminPoliciesPage from "./pages/AdminPoliciesPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminVisionPage from "./pages/AdminVisionPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PolicyDetailPage from "./pages/PolicyDetailPage";
import ProfilePage from "./pages/ProfilePage";
import ProductsPage from "./pages/ProductsPage";
import RegisterPage from "./pages/RegisterPage";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";

function RequireAuth({ children, roles = null, signInTo = "/login" }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <main className="auth-page"><p role="status">Loading your account…</p></main>;
  }
  if (!user) {
    return <Navigate to={signInTo} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* Product listing is PUBLIC (browse without login); cart/checkout need auth. */}
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
      <Route
        path="/checkout"
        element={
          <RequireAuth signInTo="/register?redirect=/checkout">
            <CheckoutPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboardPage /></RequireAuth>}
      />
      <Route
        path="/admin/products"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminProductsPage /></RequireAuth>}
      />
      <Route
        path="/admin/categories"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminCategoriesPage /></RequireAuth>}
      />
      <Route
        path="/admin/banners"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminBannersPage /></RequireAuth>}
      />
      <Route
        path="/admin/vision"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminVisionPage /></RequireAuth>}
      />
      <Route
        path="/admin/policies"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminPoliciesPage /></RequireAuth>}
      />
      <Route
        path="/admin/users"
        element={<RequireAuth roles={["SUPER_ADMIN"]}><AdminUsersPage /></RequireAuth>}
      />
      <Route
        path="/super-admin"
        element={<RequireAuth roles={["SUPER_ADMIN"]}><SuperAdminDashboardPage /></RequireAuth>}
      />
      <Route path="/policies/:slug" element={<PolicyDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}