import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLogo, mediaUrl } from "../services/api";
import { logoUrl as defaultLogoUrl } from "../utils/mediaHelpers";

// The stored logo reference lives in the database (home_page_logo) and is
// exposed by GET /api/catalog/logo. Fetch it once and share the promise across
// every <Brand /> so the header renders the currently stored logo, falling back
// to the bundled default image until it resolves (or if no logo is stored).
let logoRefPromise;

function loadLogoRef() {
  if (!logoRefPromise) {
    logoRefPromise = getLogo()
      .then((logo) => (logo && logo.imageUrl ? logo.imageUrl : ""))
      .catch(() => "");
  }
  return logoRefPromise;
}

export default function Brand({ className = "" }) {
  const [src, setSrc] = useState(defaultLogoUrl);

  useEffect(() => {
    let active = true;
    loadLogoRef().then((reference) => {
      if (active && reference) {
        setSrc(mediaUrl(reference));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link className={`brand ${className}`.trim()} to="/" aria-label="Sutantra Foods home">
      <img src={src} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      <span>Sutantra Foods</span>
    </Link>
  );
}
