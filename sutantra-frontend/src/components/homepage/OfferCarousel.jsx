import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getActiveOffers } from "../../services/api";

// The ticker repeats the rendered line just enough times for the -50% loop to
// cover the viewport. Database records and API calls stay single; only the
// presentation is repeated.
const MAX_COPIES = 20;
const PIXELS_PER_SECOND = 55;

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function discountLabel(offer) {
  const amount = Number(offer.discountValue);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (offer.discountType === "PERCENTAGE") return `${formatAmount(amount)}% OFF`;
  if (offer.discountType === "FIXED") return `₹${formatAmount(amount)} OFF`;
  return "";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event) => setReduced(event.matches);
    query.addEventListener("change", update);
    setReduced(query.matches);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

/**
 * Homepage offer ticker.
 *
 * A single heading-less line of the eligible offer codes read from the
 * existing public catalog API. Each offer keeps its code and description on
 * one line, separated by a subtle pipe. Nothing is invented: when there are no
 * eligible offers (or the request fails) the band renders nothing at all.
 */
export default function OfferCarousel() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [copies, setCopies] = useState(2);
  const [duration, setDuration] = useState(30);

  const viewportRef = useRef(null);
  const firstSetRef = useRef(null);
  const copyTimer = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;

    getActiveOffers()
      .then((data) => {
        if (cancelled) return;
        // A record without a code cannot be copied, so it is skipped rather
        // than filled in with made-up content.
        setOffers(Array.isArray(data) ? data.filter((offer) => offer && offer.code) : []);
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setOffers([]);
        setError("unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (reducedMotion || offers.length === 0) {
      setCopies(1);
      return undefined;
    }

    const measure = () => {
      const viewport = viewportRef.current;
      const firstSet = firstSetRef.current;
      if (!viewport || !firstSet) return;

      const setWidth = firstSet.offsetWidth;
      if (!setWidth) return;

      // Half the track (-50%) must be at least as wide as the viewport,
      // otherwise a gap would be visible at the end of each loop.
      const setsPerHalf = Math.max(1, Math.ceil(viewport.clientWidth / setWidth));
      const nextCopies = Math.min(MAX_COPIES, setsPerHalf * 2);
      setCopies((current) => (current === nextCopies ? current : nextCopies));

      const halfWidth = (setWidth * nextCopies) / 2;
      const nextDuration = Math.max(
        16,
        Math.min(120, Math.round(halfWidth / PIXELS_PER_SECOND))
      );
      setDuration((current) => (current === nextDuration ? current : nextDuration));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [offers, reducedMotion]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const copyCode = useCallback(async (code) => {
    if (!code) return;

    const legacyCopy = () => {
      const field = document.createElement("textarea");
      field.value = code;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.top = "-1000px";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(field);
      if (!copied) throw new Error("Copy command was rejected.");
    };

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          // Clipboard permission/focus can be denied; fall back to the
          // selection-based copy used by older browsers.
          legacyCopy();
        }
      } else {
        legacyCopy();
      }

      setCopiedCode(code);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedCode(""), 1800);
    } catch {
      // Clipboard unavailable (e.g. insecure context): leave the chip
      // unchanged rather than claiming the copy succeeded.
      setCopiedCode("");
    }
  }, []);

  // Nothing eligible (or the API failed): render no band at all rather than
  // empty space or invented offers.
  if (loading || error || offers.length === 0) return null;

  const sets = Array.from({ length: copies }, (_, index) => index);

  return (
    <section
      className={`offers-band${reducedMotion ? " is-static" : ""}`}
      aria-label="Current offers"
    >
      <div className="content-width">
        <div className="offers-viewport" ref={viewportRef} tabIndex={reducedMotion ? 0 : undefined}>
          <div
            className="offers-track"
            style={reducedMotion ? undefined : { animationDuration: `${duration}s` }}
          >
            {sets.map((setIndex) => (
              <div
                className="offers-set"
                key={setIndex}
                ref={setIndex === 0 ? firstSetRef : undefined}
                aria-hidden={setIndex > 0 ? "true" : undefined}
              >
                {offers.map((offer) => {
                  const discount = discountLabel(offer);
                  const copied = copiedCode === offer.code;

                  return (
                    <span className="offers-item" key={`${setIndex}-${offer.code}`}>
                      <span className="offers-use">Use</span>
                      <button
                        type="button"
                        className={`offers-code${copied ? " is-copied" : ""}`}
                        onClick={() => copyCode(offer.code)}
                        tabIndex={setIndex === 0 ? 0 : -1}
                        aria-label={`Copy coupon code ${offer.code}`}
                        title={`Copy ${offer.code}`}
                      >
                        {offer.code}
                      </button>
                      {offer.description && (
                        <>
                          <span className="offers-dash" aria-hidden="true">
                            —
                          </span>
                          <span className="offers-desc">{offer.description}</span>
                        </>
                      )}
                      {discount && <span className="offers-discount">{discount}</span>}
                      <span className="offers-sep" aria-hidden="true">
                        |
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        {copiedCode ? `Copied ${copiedCode}` : ""}
      </span>
    </section>
  );
}
