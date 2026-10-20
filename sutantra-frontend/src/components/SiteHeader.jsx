import { Link, useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import Brand from "./Brand";

export default function SiteHeader({ showLogin = false }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { count } = useCart();

  async function signOut() {
    await logout();
    navigate("/", { replace: true });
  }

  const roleLabel =
    user?.role === "SUPER_ADMIN"
      ? "Super Admin Dashboard"
      : user?.role === "ADMIN"
        ? "Admin Dashboard"
        : "My Profile";

  return (
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <a href="/#team">Meet Our Team</a>
      </nav>
      {showLogin && !user && (
        <Link className="button button-primary home-login" to="/login">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M5 21a7 7 0 0 1 14 0" />
          </svg>
          Login
        </Link>
      )}
      {user && (
        <div className="header-actions">
          <Link className="header-login" to={roleHome(user.role)}>{roleLabel}</Link>
          <Link className="button button-light" to="/cart" aria-label={`Your cart, ${count} item${count === 1 ? "" : "s"}`}>
            🛒 Cart{count > 0 ? ` (${count})` : ""}
          </Link>
          <button className="button button-outline" type="button" onClick={signOut}>Logout</button>
        </div>
      )}
    </header>
  );
}