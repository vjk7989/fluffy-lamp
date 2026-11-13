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

// HyperOx desktop handoff (separate from the redirect_uri flow above).
// /login?client=hyperox-desktop&port=<PORT>&state=<STATE> signs the user in,
// asks for an explicit Continue, then form-POSTs the tokens to
// http://127.0.0.1:<PORT>/callback. Tokens never go in a URL.
export const DESKTOP_CLIENT = 'hyperox-desktop';
const DESKTOP_PORT = /^[1-9][0-9]{3,4}$/;
const DESKTOP_STATE = /^[A-Za-z0-9_-]{43}$/;

/** @typedef {{ kind: 'desktop', port: number, state: string } | { kind: 'desktop-invalid' }} DesktopRequest */

/**
 * Returns null when the URL is not a HyperOx desktop request, so /login keeps
 * its normal behaviour. A desktop request wins over redirect_uri.
 * @param {string} search
 * @returns {DesktopRequest | null}
 */
export function parseDesktopRequest(search) {
  const params = new URLSearchParams(search);
  if (params.get('client') !== DESKTOP_CLIENT) return null;
  const port = params.get('port') ?? '';
  const state = params.get('state') ?? '';
  const portNumber = DESKTOP_PORT.test(port) ? Number(port) : 0;
  if (portNumber < 1024 || portNumber > 65535 || !DESKTOP_STATE.test(state)) {
    return { kind: 'desktop-invalid' };
  }
  return { kind: 'desktop', port: portNumber, state };
}

/** The only form action the desktop mode ever posts to. @param {number} port */
export function desktopCallbackAction(port) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
  return `http://127.0.0.1:${port}/callback`;
}
