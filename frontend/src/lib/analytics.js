// GA4 event wrapper. No-ops unless a measurement id is configured.
const GA_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

export function track(event, params = {}) {
  try {
    if (GA_ID && typeof window !== "undefined" && window.gtag) {
      window.gtag("event", event, params);
    } else if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event, params);
    }
  } catch (e) { /* silent */ }
}
