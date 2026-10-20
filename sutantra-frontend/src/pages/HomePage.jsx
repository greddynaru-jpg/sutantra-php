import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import OfferCarousel from "../components/homepage/OfferCarousel";
import TeamSection from "../components/homepage/TeamSection";
import {
  getActiveBanners,
  getProductCategories,
  getPublishedPolicies
} from "../services/api";
import { categoryImageUrl, isSafeTarget } from "../utils/mediaHelpers";
import { mediaUrl } from "../services/api";

const offerings = ["Millet foods", "Dry snacks", "Traditional sweets", "Cloud kitchens"];

function toBannerImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;
  return mediaUrl(imageUrl);
}

export default function HomePage() {
  const [banners, setBanners] = useState([]);
  const [bannerError, setBannerError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getActiveBanners()
      .then((data) => {
        if (!cancelled) setBanners(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!cancelled) setBannerError(error.message);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    let cancelled = false;
    getPublishedPolicies()
      .then((data) => {
        if (!cancelled) setPolicies(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPolicies([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProductCategories()
      .then((data) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => { cancelled = true; };
  }, []);

  // A direct load of "/#team" (for example from the header on another page)
  // happens before React has rendered the section, so the browser cannot
  // scroll to it. Re-apply the hash once the asynchronously loaded homepage
  // content above the target has settled.
  useEffect(() => {
    if (!window.location.hash) return undefined;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [categories.length]);

  // Brief: homepage shows at most 5 clickable categories.
  const visibleCategories = categories.slice(0, 5);

  const safeIndex = banners.length ? Math.min(activeIndex, banners.length - 1) : 0;
  const banner = banners.length ? banners[safeIndex] : null;
  const hasMultiple = banners.length > 1;

  return (
    <div className="page-shell">
      <SiteHeader showLogin />
      <main>
        {/* Offers — live offer codes from the database. The zero-height anchor
            preserves the legacy "/#about" deep link now that the Vision
            display is no longer part of the homepage. */}
        <span id="about" />
        <OfferCarousel />

        {/* Banners — one at a time, auto-rotate, responsive */}
        <section className="home-banners content-width" aria-label="Featured banners">
          <div className="home-banner-frame">
            {banner ? (
              isSafeTarget(banner.targetUrl) ? (
                <a
                  className="home-banner-link"
                  href={banner.targetUrl.trim()}
                  rel="noopener noreferrer"
                >
                  <img
                    className="home-banner-image"
                    src={toBannerImageUrl(banner.imageUrl)}
                    alt={banner.title || banner.subtitle || "Sutantra Foods banner"}
                  />
                </a>
              ) : (
                <img
                  className="home-banner-image"
                  src={toBannerImageUrl(banner.imageUrl)}
                  alt={banner.title || banner.subtitle || "Sutantra Foods banner"}
                />
              )
            ) : (
              <div className="home-banner-empty" role="status">
                {bannerError ? "Banners are temporarily unavailable." : "No featured banners right now."}
              </div>
            )}
            {hasMultiple && (
              <>
                <button
                  className="home-banner-nav prev"
                  type="button"
                  onClick={() => setActiveIndex((index) => (index - 1 + banners.length) % banners.length)}
                  aria-label="Previous banner"
                >
                  ‹
                </button>
                <button
                  className="home-banner-nav next"
                  type="button"
                  onClick={() => setActiveIndex((index) => (index + 1) % banners.length)}
                  aria-label="Next banner"
                >
                  ›
                </button>
              </>
            )}
          </div>
          {hasMultiple && (
            <div className="home-banner-dots">
              {banners.map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  type="button"
                  className={`home-banner-dot ${index === safeIndex ? "active" : ""}`}
                  aria-label={`Show banner ${index + 1}`}
                  aria-current={index === safeIndex}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Categories — max 5, clickable → filtered product listing */}
        {visibleCategories.length > 0 && (
          <section className="home-categories" aria-labelledby="home-categories-heading">
            <div className="content-width">
              <div className="home-section-head">
                <h2 id="home-categories-heading">Explore our range</h2>
              </div>
              <div className="home-category-grid">
                {visibleCategories.map((category) => (
                  <Link
                    key={category.id}
                    className="home-category-card"
                    to={`/products?categoryId=${encodeURIComponent(category.id)}`}
                  >
                    <img
                      className="home-category-image"
                      src={categoryImageUrl(category.imageUrl)}
                      alt={category.name}
                    />
                    <span className="home-category-name">{category.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Team — enabled members from the database */}
        <TeamSection />
      </main>

      {/* Footer / Policies */}
      <section className="policies-footer" aria-labelledby="policies-footer-heading">
        <div className="content-width policies-footer-inner">
          <h2 id="policies-footer-heading">Policies and Information</h2>
          {policies.length > 0 && (
            <nav className="policies-footer-links" aria-label="Policies">
              {policies.map((policy) => (
                <Link key={policy.id} to={`/policies/${policy.slug}`}>
                  {policy.title}
                </Link>
              ))}
            </nav>
          )}
          <p className="policies-footer-copyright">© Sutantra Foods. All rights reserved.</p>
        </div>
      </section>
      <footer className="site-footer content-width">
        <span>Sutantra Foods</span>
        <span>{offerings.join(" · ")}</span>
      </footer>
    </div>
  );
}