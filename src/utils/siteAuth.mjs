// Firebase Auth for the login page. getAuth() keeps the session in IndexedDB
// first, and some browsers (private windows, blocked site data, extensions)
// fail that store mid sign-in with errors such as "Database is closing/hidden",
// after Google has already returned a token. This page only needs the session
// long enough to hand the ID token to the app, so prefer localStorage, then
// sessionStorage, then memory; Firebase skips any store the browser refuses.
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  inMemoryPersistence,
  initializeAuth,
} from 'firebase/auth';

export const SITE_AUTH_PERSISTENCE = [
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
];

// initializeAuth (unlike getAuth) adds no popup resolver by default; GitHub
// sign-in and account linking use popups, so pass the browser one explicitly.
export function createSiteAuth(app) {
  return initializeAuth(app, {
    persistence: SITE_AUTH_PERSISTENCE,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}
