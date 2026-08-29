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
 * THIS POLICY IS SITE-WIDE. It was first written from the origins used by the
 * dev-tools page alone and then applied to all 48 pages, which blocked
 * accounts.google.com and took Google sign-in down on both the website and the
 * desktop app (the app opens /login in the browser -- see paviiAuth.ts). Any
 * change here must be validated on EVERY page type, /login above all, by loading
 * the page and watching for `securitypolicyviolation` -- not by reading source.
 * The Firebase SDK builds its googleapis.com URLs at runtime, so grepping for
 * literals cannot find them.
 *
 * The allowlist mirrors what the site genuinely loads:
 *   googletagmanager.com    gtag.js, loaded inline in MainLayout's head
 *   *.google-analytics.com  GA4 collect beacons, including regional hosts
 *   api.github.com          live latest-release version on the download card
 *   eu.i.posthog.com        download-event capture POST
 *   images.unsplash.com     remote imagery
 *
 * Auth-critical -- removing any of these breaks sign-in:
 *   accounts.google.com          the GIS client script, its token endpoint and
 *                                the iframe it renders (script + connect + frame)
 *   identitytoolkit.googleapis   Firebase sign-in, account creation, password
 *                                reset
 *   securetoken.googleapis       Firebase ID-token refresh
 *   pavii-ai3.firebaseapp.com    the Firebase authDomain, used by
 *                                signInWithPopup for GitHub
 *   localhost / 127.0.0.1        the DESKTOP hand-off: /login posts the ID token
 *                                and a /focus ping to the app's loopback
 *                                listener. Google can succeed and desktop
 *                                sign-in still fail silently without this.
 */
const GOOGLE_ACCOUNTS = 'https://accounts.google.com';
const FIREBASE_AUTH_DOMAIN = 'https://pavii-ai3.firebaseapp.com';
// The app's loopback listener uses an ephemeral port, hence the wildcards.
const DESKTOP_LOOPBACK = 'http://localhost:* http://127.0.0.1:*';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-src 'self' ${GOOGLE_ACCOUNTS} ${FIREBASE_AUTH_DOMAIN}`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com ${GOOGLE_ACCOUNTS}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com https://www.google-analytics.com https://www.googletagmanager.com",
  [
    "connect-src 'self'",
    'https://api.github.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://eu.i.posthog.com',
    GOOGLE_ACCOUNTS,
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    FIREBASE_AUTH_DOMAIN,
    DESKTOP_LOOPBACK,
  ].join(' '),
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const REFERRER_POLICY = 'no-referrer-when-downgrade';
