import { Navigate, Route, Routes } from "react-router-dom";
import { roleHome, useAuth } from "./contexts/AuthContext";
import AdminBannersPage from "./pages/AdminBannersPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminHomePage from "./pages/AdminHomePage";
import AdminOffersPage from "./pages/AdminOffersPage";
import AdminPoliciesPage from "./pages/AdminPoliciesPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminVisionPage from "./pages/AdminVisionPage";
import CartPage from "./pages/CartPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PolicyDetailPage from "./pages/PolicyDetailPage";
import ProfilePage from "./pages/ProfilePage";
import ProductsPage from "./pages/ProductsPage";
import RegisterPage from "./pages/RegisterPage";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";

function RequireAuth({ children, roles = null }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <main className="auth-page"><p role="status">Loading your account…</p></main>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
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
      {/* Offer Codes is available to both administrators (matching the
          catalogue modules); enforcement happens on the API too. */}
      <Route
        path="/admin/offers"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminOffersPage /></RequireAuth>}
      />
      {/* Banners, vision and policies are SUPER_ADMIN-only; they are managed
          from Home Page Administration. Enforcement happens on the API too. */}
      <Route
        path="/admin/banners"
        element={<RequireAuth roles={["SUPER_ADMIN"]}><AdminBannersPage /></RequireAuth>}
      />
      <Route
        path="/admin/vision"
        element={<RequireAuth roles={["SUPER_ADMIN"]}><AdminVisionPage /></RequireAuth>}
      />
      <Route
        path="/admin/policies"
        element={<RequireAuth roles={["SUPER_ADMIN"]}><AdminPoliciesPage /></RequireAuth>}
      />
      {/* Users is available to both administrators; an ADMIN sees only the
          customer-management actions (enforced on the API too). */}
      <Route
        path="/admin/users"
        element={<RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}><AdminUsersPage /></RequireAuth>}
      />
      <Route
        path="/admin/home-page"
        element={<RequireAuth roles={["SUPER_ADMIN"]}><AdminHomePage /></RequireAuth>}
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