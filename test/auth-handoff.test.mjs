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

import { DESKTOP_CLIENT, desktopCallbackAction, parseDesktopRequest, parseDesktopResult } from '../src/utils/authHandoff.mjs';

const STATE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ';
const desk = (fields) => parseDesktopRequest(`?${new URLSearchParams(fields)}`);

test('desktop mode: valid client, port and 43-char state', () => {
  assert.equal(STATE.length, 43);
  assert.deepEqual(desk({ client: DESKTOP_CLIENT, port: '53682', state: STATE }), { kind: 'desktop', port: 53682, state: STATE });
  assert.deepEqual(desk({ client: DESKTOP_CLIENT, port: '1024', state: STATE }).port, 1024);
  assert.deepEqual(desk({ client: DESKTOP_CLIENT, port: '65535', state: 'a_B-'.repeat(10) + 'xyz' }).port, 65535);
});

test('desktop mode: other clients are not desktop requests', () => {
  assert.equal(desk({ client: 'other', port: '53682', state: STATE }), null);
  assert.equal(desk({ port: '53682', state: STATE }), null);
  assert.equal(desk({ client: 'HyperOx-Desktop', port: '53682', state: STATE }), null);
});

test('desktop mode: rejects bad ports and states', () => {
  for (const port of ['80', '1023', '65536', '99999', 'abc', '', '053682', '5368 2', '53682.0', '+53682', '0x1F90']) {
    assert.deepEqual(desk({ client: DESKTOP_CLIENT, port, state: STATE }), { kind: 'desktop-invalid' }, port);
  }
  for (const state of [STATE.slice(1), STATE + 'R', STATE.slice(1) + '=', STATE.slice(1) + '.', '', STATE.slice(1) + ' ']) {
    assert.deepEqual(desk({ client: DESKTOP_CLIENT, port: '53682', state }), { kind: 'desktop-invalid' }, state);
  }
});

test('desktop mode wins over redirect_uri', () => {
  const search = `?${new URLSearchParams({ client: DESKTOP_CLIENT, port: '53682', state: STATE, redirect_uri: 'pavii://auth' })}`;
  assert.equal(parseDesktopRequest(search).kind, 'desktop');
});

test('desktop callback action is always the literal 127.0.0.1 loopback', () => {
  assert.equal(desktopCallbackAction(53682), 'http://127.0.0.1:53682/callback');
  for (const port of [80, 1023, 65536, NaN, 1.5]) assert.throws(() => desktopCallbackAction(port));
});

const res = (fields) => parseDesktopResult(`?${new URLSearchParams(fields)}`);

test('desktop result: exact lowercase ok/cancelled/error only', () => {
  for (const result of ['ok', 'cancelled', 'error']) assert.equal(res({ client: DESKTOP_CLIENT, result }), result);
  for (const result of ['OK', 'Ok', 'Cancelled', 'ERROR', 'done', '', ' ok', 'ok ']) {
    assert.equal(res({ client: DESKTOP_CLIENT, result }), null, result);
  }
  assert.equal(parseDesktopResult(`?client=${DESKTOP_CLIENT}`), null);
});

test('desktop result: requires the exact client', () => {
  assert.equal(res({ result: 'ok' }), null);
  assert.equal(res({ client: 'other', result: 'ok' }), null);
  assert.equal(res({ client: 'HyperOx-Desktop', result: 'ok' }), null);
});

test('desktop result: port, state and other params are ignored; duplicates rejected', () => {
  assert.equal(res({ client: DESKTOP_CLIENT, result: 'cancelled', port: 'bad', state: 'x', foo: 'y' }), 'cancelled');
  assert.equal(res({ client: DESKTOP_CLIENT, result: 'ok', port: '53682', state: STATE, redirect_uri: 'pavii://auth' }), 'ok');
  assert.equal(parseDesktopResult(`?client=${DESKTOP_CLIENT}&result=ok&result=error`), null);
});
