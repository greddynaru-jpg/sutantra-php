import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { registerUser } from "../services/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await registerUser({
        name: form.name.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation
      });
      navigate("/login", {
        replace: true,
        state: { message: "Registration successful. Please log in to continue." }
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Brand className="auth-brand" />
        <span className="eyebrow">Create an account</span>
        <h1>Welcome to the table.</h1>
        <p className="auth-intro">Share your details to register with Sutantra Foods.</p>
        {error && <div className="form-alert error" role="alert">{error}</div>}
        <form className="form-stack" onSubmit={submit}>
          <label>
            Name (optional)
            <input
              name="name"
              type="text"
              autoComplete="name"
              maxLength="150"
              value={form.name}
              onChange={update}
            />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength="100"
              value={form.email}
              onChange={update}
              required
            />
          </label>
          <label>
            Phone number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength="15"
              pattern="[0-9+() -]{7,15}"
              value={form.phone}
              onChange={update}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              maxLength="255"
              minLength="8"
              value={form.password}
              onChange={update}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              maxLength="255"
              value={form.password_confirmation}
              onChange={update}
              required
            />
          </label>
          <button className="button button-primary button-wide" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">Already registered? <Link to="/login">Login</Link></p>
        <Link className="back-link" to="/">← Back to home</Link>
      </section>
    </main>
  );
}