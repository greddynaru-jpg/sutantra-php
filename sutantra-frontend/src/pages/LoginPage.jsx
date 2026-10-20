import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth, roleHome } from "../contexts/AuthContext";
import { requestVerificationCode } from "../services/api";
import { safeRedirect, withRedirect } from "../utils/navigation";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, authError } = useAuth();
  const redirectTo = safeRedirect(location.search);

  // Two-step flow: "identifier" (Get Verification Code) → "credential" (Login).
  const [step, setStep] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notice = location.state?.message;

  // Step 1: validate the identifier, then reveal the credential screen.
  async function requestCode(event) {
    event.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Please enter your phone number or email address.");
      return;
    }

    setBusy(true);
    try {
      await requestVerificationCode(identifier.trim());
      setCode("");
      setStep("credential");
    } catch (requestError) {
      setError(requestError.message || "Unable to continue. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: the "Verification Code" field carries the existing password.
  async function submitCode(event) {
    event.preventDefault();
    setError("");
    if (!code) {
      setError("Please enter the verification code.");
      return;
    }

    setBusy(true);
    try {
      const user = await login(identifier.trim(), code);
      navigate(redirectTo || roleHome(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to log in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function backToIdentifier() {
    setError("");
    setCode("");
    setStep("identifier");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Brand className="auth-brand" />
        {notice && <div className="form-alert success" role="status">{notice}</div>}
        {authError && <div className="form-alert warning" role="status">{authError}</div>}
        {error && <div className="form-alert error" role="alert">{error}</div>}

        {step === "identifier" ? (
          <>
            <span className="eyebrow">Welcome</span>
            <h1>Login.</h1>
            <p className="auth-intro">
              Enter your registered phone number or email address to get your
              verification code.
            </p>
            <form className="form-stack" onSubmit={requestCode}>
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
                  autoFocus
                  required
                />
              </label>
              <button className="button button-primary button-wide" type="submit" disabled={busy}>
                {busy ? "CHECKING…" : "GET VERIFICATION CODE"}
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="eyebrow">Step 2 of 2</span>
            <h1>Verify.</h1>
            <p className="auth-intro">
              We’ve recorded your request. Enter your verification code to finish
              logging in.
            </p>
            <div className="auth-identifier">
              <span>Phone Number or Email</span>
              <strong>{identifier.trim()}</strong>
            </div>
            <form className="form-stack" onSubmit={submitCode}>
              <label>
                Verification Code
                <input
                  name="code"
                  type="password"
                  autoComplete="current-password"
                  maxLength="255"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoFocus
                  required
                />
              </label>
              <button className="button button-primary button-wide" type="submit" disabled={busy}>
                {busy ? "SIGNING IN…" : "LOGIN"}
              </button>
            </form>
            <button className="back-button" type="button" onClick={backToIdentifier} disabled={busy}>
              ← Back
            </button>
          </>
        )}

        <p className="auth-switch">
          Don’t have an account? <Link to={withRedirect("/register", redirectTo)}>Register</Link>
        </p>
        <Link className="back-link" to="/">← Back to home</Link>
      </section>
    </main>
  );
}
