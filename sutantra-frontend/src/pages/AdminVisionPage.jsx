import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { getAdminVision, updateVision } from "../services/api";

export default function AdminVisionPage() {
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
      setError(loadError.message || "Unable to load the homepage vision.");
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
      setNotice("Homepage vision saved.");
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the vision.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout
      title="Homepage Vision"
      subtitle="The “About” text shown beneath the homepage banners."
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {loading ? (
        <div className="admin-panel"><p className="admin-empty">Loading vision…</p></div>
      ) : (
        <form className="admin-panel admin-form" onSubmit={submit}>
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
      )}
    </AdminLayout>
  );
}
