import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import LogoManager from "../components/homepage/LogoManager";
import BannerManager from "../components/homepage/BannerManager";
import VisionManager from "../components/homepage/VisionManager";
import PolicyManager from "../components/homepage/PolicyManager";
import TeamManager from "../components/homepage/TeamManager";

const TABS = [
  { id: "logo", label: "Logo" },
  { id: "banners", label: "Banners" },
  { id: "vision", label: "Directors’ Vision" },
  { id: "policies", label: "Policies" },
  { id: "team", label: "Our Team" }
];

/**
 * Home Page Administration (SUPER_ADMIN only). A single page with five tabs
 * managing the content shown on the public home page. The public home page
 * itself is not changed in this phase.
 */
export default function AdminHomePage() {
  const [active, setActive] = useState("logo");

  return (
    <AdminLayout
      title="Home Page Administration"
      subtitle="Manage the logo, banners, directors’ vision, policies and team shown on the public home page."
    >
      <div className="admin-tabs" role="tablist" aria-label="Home page sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`hp-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`hp-panel-${tab.id}`}
            className={`admin-tab ${active === tab.id ? "active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="admin-tab-panel"
        role="tabpanel"
        id={`hp-panel-${active}`}
        aria-labelledby={`hp-tab-${active}`}
      >
        {active === "logo" && <LogoManager />}
        {active === "banners" && <BannerManager />}
        {active === "vision" && <VisionManager />}
        {active === "policies" && <PolicyManager />}
        {active === "team" && <TeamManager />}
      </div>
    </AdminLayout>
  );
}
