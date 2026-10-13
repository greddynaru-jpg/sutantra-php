import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { getPublishedPolicy } from "../services/api";

export default function PolicyDetailPage() {
  const { slug } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPolicy(null);

    getPublishedPolicy(slug)
      .then((data) => {
        if (!cancelled) setPolicy(data || null);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="content-width account-content">
        <section className="account-panel policy-panel">
          <Link className="button button-light" to="/">← Back to Home</Link>
          {loading && <p role="status" style={{ marginTop: 18 }}>Loading policy…</p>}
          {!loading && error && (
            <div className="form-alert error" role="alert" style={{ marginTop: 18 }}>{error}</div>
          )}
          {!loading && !error && policy && (
            <article className="policy-content-wrap">
              <h1 style={{ marginTop: 18 }}>{policy.title}</h1>
              <p className="policy-content">{policy.content}</p>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}