/**
 * Content-Security-Policy for the site, in one place.
 *
 * This site is served by GitHub Pages, which cannot send custom HTTP headers at
 * all, so the policy is delivered as a <meta> tag. `vercel.json` carries the
 * full header set for a Vercel deployment; on Pages it is inert. Keep the two
 * in step -- vercel.json is the only place `frame-ancestors` can work, because
 * that directive is ignored when a policy arrives via meta.
 *
 * Ignored via meta and therefore NOT available on Pages at all:
 * X-Frame-Options, X-Content-Type-Options, Permissions-Policy and
 * Strict-Transport-Security. The site consequently has no clickjacking
 * protection while it is hosted here.
 *
 * Consumed by src/layouts/MainLayout.astro (marketing pages) and by the
 * Starlight `head` option in astro.config.mjs (docs pages) -- both are needed,
 * because Starlight does not use MainLayout.
 *
 * The allowlist mirrors what the site genuinely loads. Re-check it after adding
 * any third-party script or endpoint:
 *   googletagmanager.com    gtag.js, loaded inline in MainLayout's head
 *   *.google-analytics.com  GA4 collect beacons, including regional hosts
 *   api.github.com          live latest-release version on the download card
 *   eu.i.posthog.com        download-event capture POST
 *   images.unsplash.com     remote imagery
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com https://www.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' https://api.github.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://eu.i.posthog.com",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const REFERRER_POLICY = 'no-referrer-when-downgrade';
