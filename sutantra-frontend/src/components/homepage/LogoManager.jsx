import { useEffect, useState } from "react";
import ImageField from "../ImageField";
import { getAdminLogo, mediaUrl, updateLogo } from "../../services/api";

/**
 * Logo tab: shows the currently stored website logo, previews a replacement
 * and uploads it. The new image is stored under uploads/logo and its database
 * reference is saved before the previous file is removed (server-side).
 */
export default function LogoManager() {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const current = await getAdminLogo();
      setLogo(current || null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load the logo.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!file) {
      setError("Please choose a logo image before saving.");
      return;
    }

    setBusy(true);
    try {
      await updateLogo(file);
      setNotice("Logo updated.");
      setFile(null);
      // Reload so the preview reflects the newly stored reference.
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the logo.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="admin-panel"><p className="admin-empty">Loading logo…</p></div>;
  }

  return (
    <>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      <form className="admin-panel admin-form" onSubmit={submit}>
        <h2>Website logo</h2>
        <p className="admin-head-note">
          The logo shown in the site header. New uploads are saved under <code>uploads/logo</code>.
        </p>

        <ImageField
          currentUrl={logo?.imageUrl ? mediaUrl(logo.imageUrl) : ""}
          file={file}
          onFile={setFile}
        />

        <div className="admin-form-actions">
          <button className="button button-primary" type="submit" disabled={busy || !file}>
            {busy ? "Saving…" : "Save logo"}
          </button>
        </div>
      </form>
    </>
  );
}
