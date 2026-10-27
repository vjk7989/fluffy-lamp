// Desktop-app sign-in handoff. The redirect_uri is matched as an exact string
// (after the single URL decode done by URLSearchParams) so case, whitespace,
// encoding, userinfo, query, fragment and path variants are all rejected.
const DEEP_LINKS = {
  'h0x://auth': 'h0x',
  'h0x://auth/': 'h0x',
  'pavii://auth': 'pavii',
  'pavii://auth/': 'pavii',
};
const LOOPBACK = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})\/auth$/;

/** @typedef {{ app: 'h0x' | 'pavii', redirectUri: string }} AppRedirect */
/** @typedef {{ kind: 'portal' } | { kind: 'invalid' } | ({ kind: 'app' } & AppRedirect)} LoginRequest */

/** @param {string} value @returns {AppRedirect | null} */
function appRedirect(value) {
  const app = Object.hasOwn(DEEP_LINKS, value) ? DEEP_LINKS[value] : null;
  if (app) return { app, redirectUri: `${app}://auth` };
  const port = LOOPBACK.exec(value)?.[1];
  if (port && Number(port) <= 65535) return { app: 'pavii', redirectUri: value };
  return null;
}

/** @param {string} search @returns {LoginRequest} */
export function parseLoginRequest(search) {
  const redirect = new URLSearchParams(search).get('redirect_uri');
  if (!redirect) return { kind: 'portal' };
  const target = appRedirect(redirect);
  return target ? { kind: 'app', ...target } : { kind: 'invalid' };
}

/** @param {string} redirectUri @param {string} idToken @returns {string} */
export function appCallback(redirectUri, idToken) {
  const token = new URLSearchParams({ id_token: idToken }).toString();
  if (redirectUri === 'h0x://auth' || redirectUri === 'pavii://auth') {
    return `${redirectUri}#${token}`;
  }
  if (appRedirect(redirectUri)?.redirectUri === redirectUri) {
    // The shipped Pavii.Ai desktop app's loopback server reads id_token from
    // the query string, so this one target keeps query delivery for
    // compatibility. Deep-link schemes always use the fragment.
    return `${redirectUri}?${token}`;
  }
  throw new Error('Invalid redirect target');
}
