import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth, roleHome } from "../contexts/AuthContext";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, authError } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notice = location.state?.message;

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Please enter your phone number or email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);
    try {
      const user = await login(identifier.trim(), password);
      navigate(roleHome(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to log in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Brand className="auth-brand" />
        <span className="eyebrow">Welcome back</span>
        <h1>Login.</h1>
        <p className="auth-intro">
          Sign in with your registered email address or phone number and your password.
        </p>
        {notice && <div className="form-alert success" role="status">{notice}</div>}
        {authError && <div className="form-alert warning" role="status">{authError}</div>}
        {error && <div className="form-alert error" role="alert">{error}</div>}
        <form className="form-stack" onSubmit={submit}>
          <label>
            Phone Number or Email
            <input
              name="identifier"
              type="text"
              autoComplete="username"
              maxLength="100"
              placeholder="Phone Number or Email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength="255"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="button button-primary button-wide" type="submit" disabled={busy}>
            {busy ? "SIGNING IN…" : "LOGIN"}
          </button>
        </form>
        <p className="auth-switch">
          Don’t have an account? <Link to="/register">Register</Link>
        </p>
        <Link className="back-link" to="/">← Back to home</Link>
      </section>
    </main>
  );
}