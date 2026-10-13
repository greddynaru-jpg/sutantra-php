import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import {
  getActiveBanners,
  getProductCategories,
  getPublishedPolicies,
  getVision
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
  const [vision, setVision] = useState(null);
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
    getVision()
      .then((data) => {
        if (!cancelled) setVision(data && data.visionText ? data : null);
      })
      .catch(() => {
        if (!cancelled) setVision(null);
      });
    return () => { cancelled = true; };
  }, []);

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

  // Brief: homepage shows at most 5 clickable categories.
  const visibleCategories = categories.slice(0, 5);

  const safeIndex = banners.length ? Math.min(activeIndex, banners.length - 1) : 0;
  const banner = banners.length ? banners[safeIndex] : null;
  const hasMultiple = banners.length > 1;

  return (
    <div className="page-shell">
      <SiteHeader showLogin />
      <main>
        {/* About — sourced from the home_page_vision content */}
        {vision && (
          <section id="about" className="vision-band" aria-label="Our Vision">
            <div className="content-width vision-content">
              {vision.heading && <h2>{vision.heading}</h2>}
              <p className="vision-text">{vision.visionText}</p>
            </div>
          </section>
        )}

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