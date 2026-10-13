import { Link } from "react-router-dom";
import { logoUrl } from "../utils/mediaHelpers";

export default function Brand({ className = "" }) {
  return (
    <Link className={`brand ${className}`.trim()} to="/" aria-label="Sutantra Foods home">
      <img src={logoUrl()} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      <span>Sutantra Foods</span>
    </Link>
  );
}