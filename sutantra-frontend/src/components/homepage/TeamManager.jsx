import { useEffect, useState } from "react";
import ImageField from "../ImageField";
import {
  createTeamMember,
  deleteTeamMember,
  getAdminTeam,
  updateTeamMember
} from "../../services/api";
import { TEAM_PLACEHOLDER, teamPhotoUrl } from "../../utils/mediaHelpers";

const EMPTY = {
  name: "",
  role: "",
  about: "",
  message: "",
  active: true,
  display_order: 0
};

/**
 * Our Team tab: manage team members shown on the public home page. Photos are
 * optional and stored under uploads/team; a replacement keeps the previous
 * photo until the new one is saved (server-side).
 */
export default function TeamManager() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const list = await getAdminTeam();
      setMembers(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load team members.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setError("");
    setNotice("");
    setPhotoFile(null);
    setRemovePhoto(false);
    setForm({ ...EMPTY });
  }

  function openEdit(member) {
    setError("");
    setNotice("");
    setPhotoFile(null);
    setRemovePhoto(false);
    setForm({
      id: member.id,
      name: member.name || "",
      role: member.role || "",
      about: member.about || "",
      message: member.message || "",
      active: member.active !== false,
      display_order: member.displayOrder ?? 0,
      photoUrl: member.photoUrl
    });
  }

  function closeForm() {
    setForm(null);
    setPhotoFile(null);
    setRemovePhoto(false);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim() || !form.role.trim()) {
      setError("Name and role are required.");
      return;
    }

    setBusy(true);
    try {
      const fields = {
        name: form.name.trim(),
        role: form.role.trim(),
        about: form.about?.trim() || "",
        message: form.message?.trim() || "",
        active: Boolean(form.active),
        display_order: Number(form.display_order) || 0,
        remove_photo: Boolean(removePhoto && !photoFile)
      };
      if (form.id) {
        await updateTeamMember(form.id, fields, photoFile);
        setNotice("Team member updated.");
      } else {
        await createTeamMember(fields, photoFile);
        setNotice("Team member added.");
      }
      closeForm();
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the team member.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(member) {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    try {
      setError("");
      setNotice("");
      await deleteTeamMember(member.id);
      setNotice("Team member deleted.");
      await load();
    } catch (removeError) {
      setError(removeError.message || "Unable to delete the team member.");
    }
  }

  return (
    <>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {form && (
        <form className="admin-panel admin-form" onSubmit={submit}>
          <h2>{form.id ? "Edit team member" : "New team member"}</h2>
          <div className="admin-form-grid">
            <label className="admin-label">
              Name <span className="admin-required">*</span>
              <input
                type="text"
                maxLength={150}
                required
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Role <span className="admin-required">*</span>
              <input
                type="text"
                maxLength={150}
                required
                value={form.role}
                onChange={(event) => setField("role", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Display order
              <input
                type="number"
                min="0"
                step="1"
                value={form.display_order}
                onChange={(event) => setField("display_order", event.target.value)}
              />
            </label>
            <label className="admin-check admin-label-inline">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setField("active", event.target.checked)}
              />
              Enabled (shown publicly)
            </label>
            <label className="admin-label admin-span-2">
              About (optional)
              <textarea
                rows={3}
                value={form.about}
                onChange={(event) => setField("about", event.target.value)}
              />
            </label>
            <label className="admin-label admin-span-2">
              Message (optional)
              <textarea
                rows={3}
                value={form.message}
                onChange={(event) => setField("message", event.target.value)}
              />
            </label>
          </div>

          <ImageField
            currentUrl={form.photoUrl ? teamPhotoUrl(form.photoUrl) : TEAM_PLACEHOLDER}
            placeholder={TEAM_PLACEHOLDER}
            file={photoFile}
            onFile={setPhotoFile}
            removeImage={removePhoto}
            onRemoveImage={setRemovePhoto}
          />

          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Add member"}
            </button>
            <button className="button button-light" type="button" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-panel">
        <div className="admin-section-head">
          <div>
            <h2>Our Team</h2>
            <p className="admin-head-note">Enabled members appear on the home page in display order. Photos are saved under <code>uploads/team</code>.</p>
          </div>
          <div className="admin-section-actions">
            <button className="button button-primary" type="button" onClick={openCreate}>
              + Add member
            </button>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">Loading team…</p>
        ) : members.length === 0 ? (
          <p className="admin-empty">No team members yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <img
                        className="admin-thumb"
                        src={teamPhotoUrl(member.photoUrl)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = TEAM_PLACEHOLDER;
                        }}
                      />
                    </td>
                    <td className="admin-cell-strong">{member.name}</td>
                    <td className="admin-cell-muted">{member.role}</td>
                    <td>{member.displayOrder ?? 0}</td>
                    <td>
                      <span className={`admin-badge ${member.active ? "ok" : "off"}`}>
                        {member.active ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button className="admin-link-btn" type="button" onClick={() => openEdit(member)}>
                        Edit
                      </button>
                      <button className="admin-link-btn danger" type="button" onClick={() => remove(member)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
