import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { getCurrentUser, updateProfile } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((profile) => setForm({ name: profile.name || "", email: profile.email, phone: profile.phone }))
      .catch((requestError) => setError(requestError.message));
  }, []);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const updated = await updateProfile({
        name: form.name.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim()
      });
      setForm({ name: updated.name || "", email: updated.email, phone: updated.phone });
      updateUser(updated);
      setMessage("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="content-width account-content">
        <section className="account-panel">
          <span className="eyebrow">My Account</span>
          <h1>My Profile</h1>
          <p className="auth-intro">View and update your account details.</p>
          <p className="profile-role">Account type: {user.role}</p>
          {message && <div className="form-alert success" role="status">{message}</div>}
          {error && <div className="form-alert error" role="alert">{error}</div>}
          <form className="form-stack" onSubmit={submit}>
            <label>
              Name (optional)
              <input
                name="name"
                type="text"
                maxLength="150"
                autoComplete="name"
                value={form.name}
                onChange={update}
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                maxLength="100"
                autoComplete="email"
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
                maxLength="15"
                inputMode="tel"
                pattern="[0-9+() -]{7,15}"
                value={form.phone}
                onChange={update}
                required
              />
            </label>
            <button className="button button-primary button-wide" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Update Profile"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}