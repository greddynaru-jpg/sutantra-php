import { useEffect, useState } from "react";
import { getActiveTeamMembers } from "../../services/api";
import { TEAM_PLACEHOLDER, teamPhotoUrl } from "../../utils/mediaHelpers";

/**
 * "Meet Our Team" homepage section.
 *
 * Reads only the enabled team members already served by the public catalog
 * API (ordered by display order). Nothing is hardcoded: when the request fails
 * or the team is empty the section keeps its place with a short status line so
 * the header link always has a target.
 */
export default function TeamSection() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getActiveTeamMembers()
      .then((data) => {
        if (cancelled) return;
        // Name and role are required by the table; skip an incomplete record
        // rather than rendering an empty card.
        setMembers(
          Array.isArray(data) ? data.filter((member) => member && member.name && member.role) : []
        );
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setMembers([]);
        setError("unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="home-team" id="team" aria-labelledby="home-team-heading">
      <div className="content-width">
        <div className="home-section-head">
          <h2 id="home-team-heading">Meet Our Team</h2>
          <p className="home-team-intro">The people behind Sutantra Foods.</p>
        </div>

        {loading ? (
          <p className="home-team-note" role="status">Loading team…</p>
        ) : error ? (
          <p className="home-team-note" role="status">
            Team information is temporarily unavailable right now.
          </p>
        ) : members.length === 0 ? (
          <p className="home-team-note" role="status">Our team profiles are coming soon.</p>
        ) : (
          <div className="home-team-grid">
            {members.map((member) => (
              <article className="home-team-card" key={member.id}>
                <img
                  className="home-team-photo"
                  src={teamPhotoUrl(member.photoUrl)}
                  alt={member.name}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = TEAM_PLACEHOLDER;
                  }}
                />
                <div className="home-team-body">
                  <h3 className="home-team-name">{member.name}</h3>
                  <p className="home-team-role">{member.role}</p>
                  {member.about && <p className="home-team-about">{member.about}</p>}
                  {member.message && (
                    <blockquote className="home-team-message">{member.message}</blockquote>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
