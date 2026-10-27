import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { appCallback, parseLoginRequest } from '../src/utils/authHandoff.mjs';

const parse = (redirect) => parseLoginRequest(`?${new URLSearchParams({ redirect_uri: redirect })}`);
const TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1In0.sig-_+/=';

test('accepts exactly h0x://auth and pavii://auth, normalised without trailing slash', () => {
  for (const [redirect, app] of [
    ['h0x://auth', 'h0x'],
    ['h0x://auth/', 'h0x'],
    ['pavii://auth', 'pavii'],
    ['pavii://auth/', 'pavii'],
  ]) assert.deepEqual(parse(redirect), { kind: 'app', app, redirectUri: `${app}://auth` });
});

test('accepts only the exact Pavii.Ai loopback with an explicit port', () => {
  for (const port of ['1', '4567', '49152', '65535']) {
    assert.deepEqual(parse(`http://127.0.0.1:${port}/auth`), {
      kind: 'app', app: 'pavii', redirectUri: `http://127.0.0.1:${port}/auth`,
    });
  }
});

test('rejects every other redirect target', () => {
  for (const redirect of [
    'h0x://evil',
    'h0x://auth/extra',
    'h0x://auth?x=1',
    'h0x://auth#x',
    'h0x://user@auth',
    'h0x://user:pw@auth',
    'h0x:auth',
    'h0x:///auth',
    'H0X://auth',
    'h0X://auth',
    'h0x://AUTH',
    'Pavii://auth',
    ' h0x://auth',
    'h0x://auth ',
    'h0x://auth\n',
    'h0x%3A%2F%2Fauth',
    'h0x://%61uth',
    'pavii://other',
    'pavii://auth/extra',
    'pavii://user@auth',
    'orca://auth',
    'https://www.pavii.tech/auth',
    'https://127.0.0.1:4567/auth',
    'http://localhost:4567/auth',
    'http://127.0.0.1/auth',
    'http://127.0.0.1:/auth',
    'http://127.0.0.1:0/auth',
    'http://127.0.0.1:04567/auth',
    'http://127.0.0.1:65536/auth',
    'http://127.0.0.1:99999/auth',
    'http://127.0.0.1:8080/other',
    'http://127.0.0.1:8080/auth/',
    'http://127.0.0.1:8080/auth/callback',
    'http://127.0.0.1:8080/auth?x=1',
    'http://127.0.0.1:8080/auth#x',
    'http://user@127.0.0.1:8080/auth',
    'http://127.0.0.2:8080/auth',
    'http://[::1]:8080/auth',
    'HTTP://127.0.0.1:8080/auth',
    'javascript:alert(1)//h0x://auth',
    'data:text/html,h0x://auth',
    'file:///auth',
    '//h0x://auth',
  ]) assert.deepEqual(parse(redirect), { kind: 'invalid' }, redirect);
});

test('double-encoded scheme stays encoded after one decode and is rejected', () => {
  assert.deepEqual(parseLoginRequest('?redirect_uri=h0x%253A%252F%252Fauth'), { kind: 'invalid' });
  assert.deepEqual(parseLoginRequest('?redirect_uri=h0x%3A%2F%2Fauth'), {
    kind: 'app', app: 'h0x', redirectUri: 'h0x://auth',
  });
});

test('no or empty redirect is the account portal; the old PKCE request is invalid', () => {
  assert.deepEqual(parseLoginRequest(''), { kind: 'portal' });
  assert.deepEqual(parseLoginRequest('?mode=signup'), { kind: 'portal' });
  assert.deepEqual(parseLoginRequest('?redirect_uri='), { kind: 'portal' });
  assert.deepEqual(parseLoginRequest(`?${new URLSearchParams({
    client_id: 'h0x-desktop-v1',
    redirect_uri: 'http://127.0.0.1:49152/auth/callback',
    state: 's'.repeat(43),
    code_challenge: 'c'.repeat(43),
    code_challenge_method: 'S256',
  })}`), { kind: 'invalid' });
});

test('deep links deliver the token in the fragment only', () => {
  for (const scheme of ['h0x', 'pavii']) {
    const url = new URL(appCallback(`${scheme}://auth`, TOKEN));
    assert.equal(url.protocol, `${scheme}:`);
    assert.equal(url.search, '');
    assert.equal(new URLSearchParams(url.hash.slice(1)).get('id_token'), TOKEN);
  }
  assert.equal(appCallback('h0x://auth', 'abc'), 'h0x://auth#id_token=abc');
  assert.equal(appCallback('pavii://auth', 'abc'), 'pavii://auth#id_token=abc');
});

test('loopback keeps query delivery for the shipped Pavii.Ai app', () => {
  const url = new URL(appCallback('http://127.0.0.1:4567/auth', TOKEN));
  assert.equal(url.hash, '');
  assert.equal(url.searchParams.get('id_token'), TOKEN);
  assert.equal(appCallback('http://127.0.0.1:4567/auth', 'abc'), 'http://127.0.0.1:4567/auth?id_token=abc');
});

test('callback refuses any target that parseLoginRequest would reject', () => {
  for (const redirect of ['h0x://evil', 'h0x://auth/', 'https://evil.example/auth', 'http://localhost:4567/auth', '']) {
    assert.throws(() => appCallback(redirect, 'abc'), /Invalid redirect target/);
  }
});

test('login page uses the deep-link handoff and no PKCE code exchange', async () => {
  const source = await readFile(new URL('../src/pages/login.astro', import.meta.url), 'utf8');
  assert.match(source, /appCallback\(loginRequest\.redirectUri, idToken\)/);
  assert.doesNotMatch(source, /h0xCallback|\/v1\/authorize|code_challenge|PAVII_AUTH_URL/);
  assert.doesNotMatch(source, /SAMLAuthProvider|login-sso|saml\.pavii-sso/);
});
