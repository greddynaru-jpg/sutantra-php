import { useEffect, useState } from "react";
import { getAdminVision, updateVision } from "../../services/api";

/**
 * Directors' Vision tab: edits the existing homepage vision ("About") block
 * via the existing singleton API. No visibility field is exposed because the
 * existing schema has none.
 */
export default function VisionManager() {
  const [form, setForm] = useState({ heading: "", vision_text: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const vision = await getAdminVision();
      setForm({
        heading: vision?.heading || "",
        vision_text: vision?.visionText || ""
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load the vision.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateVision({
        heading: form.heading.trim(),
        vision_text: form.vision_text
      });
      setNotice("Directors' vision saved.");
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the vision.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="admin-panel"><p className="admin-empty">Loading vision…</p></div>;
  }

  return (
    <>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      <form className="admin-panel admin-form" onSubmit={submit}>
        <h2>Directors' Vision</h2>
        <p className="admin-head-note">The “About” text shown beneath the homepage banners.</p>
        <div className="admin-form-grid">
          <label className="admin-label admin-span-2">
            Heading
            <input
              type="text"
              maxLength={200}
              value={form.heading}
              onChange={(event) => setForm((current) => ({ ...current, heading: event.target.value }))}
            />
          </label>
          <label className="admin-label admin-span-2">
            Vision text
            <textarea
              rows={12}
              required
              value={form.vision_text}
              onChange={(event) => setForm((current) => ({ ...current, vision_text: event.target.value }))}
            />
          </label>
        </div>
        <div className="admin-form-actions">
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save vision"}
          </button>
        </div>
      </form>
    </>
  );
}
