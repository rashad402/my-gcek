/**
 * ETLAB API Client
 *
 * Handles all HTTP communication with gcek.etlab.in:
 *  - Two-step CSRF login (GET token → POST credentials)
 *  - Session cookie management
 *  - Authenticated page fetching for data screens
 *
 * SECURITY: The user's password is used transiently during login and is
 * NEVER stored or returned. Only session cookies leave this module.
 */

import { Platform } from 'react-native';

const BASE_URL = 'https://gcek.etlab.in';




/** Extract the CSRF token from the ETLAB login page HTML. */
function extractCsrfToken(html: string): string | null {
  // Primary: LoginForm[_token]
  const tokenMatch = html.match(
    /name\s*=\s*["']LoginForm\[_token\]["']\s+value\s*=\s*["']([^"']+)["']/
  );
  if (tokenMatch) return tokenMatch[1];

  // Fallback: value before name ordering
  const altMatch = html.match(
    /value\s*=\s*["']([^"']+)["']\s+name\s*=\s*["']LoginForm\[_token\]["']/
  );
  if (altMatch) return altMatch[1];

  // Fallback: Yii2 _csrf-frontend (some ETLAB deployments)
  const yiiMatch = html.match(
    /name\s*=\s*["']_csrf-frontend["']\s+value\s*=\s*["']([^"']+)["']/
  );
  if (yiiMatch) return yiiMatch[1];

  // Fallback: <meta> csrf-token
  const metaMatch = html.match(
    /meta\s+name\s*=\s*["']csrf-token["']\s+content\s*=\s*["']([^"']+)["']/
  );
  if (metaMatch) return metaMatch[1];

  // Fallback: Yii 1.x ajaxSetup YII_CSRF_TOKEN
  const yii1Match = html.match(
    /["']YII_CSRF_TOKEN["']\s*:\s*["']([^"']+)["']/
  );
  return yii1Match ? yii1Match[1] : null;
}

/** Extract the CSRF field name from the login page (for POST body key). */
function extractCsrfFieldName(html: string): string {
  if (/name\s*=\s*["']LoginForm\[_token\]["']/.test(html)) return 'LoginForm[_token]';
  if (/name\s*=\s*["']_csrf-frontend["']/.test(html)) return '_csrf-frontend';
  if (/["']YII_CSRF_TOKEN["']\s*:\s*/.test(html)) return 'YII_CSRF_TOKEN';
  return 'LoginForm[_token]'; // default
}

// ─── Student ID extraction ──────────────────────────────────────────────────

/**
 * After login, the user is redirected to the dashboard.
 * The attendance URL contains a student-specific numeric ID.
 * We try to discover it from links on the dashboard / sidebar.
 */
function extractStudentId(html: string): string | null {
  // Look for the attendance link pattern:
  // href="...viewattendancesubject/NUMERIC_ID"
  const match = html.match(
    /viewattendancesubject\/(\d+)/
  );
  return match ? match[1] : null;
}

// ─── Login error extraction ─────────────────────────────────────────────────

function extractLoginError(html: string): string {
  // Yii2 error summary
  const errorMatch = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*errorMessage[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (errorMatch) {
    return errorMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Yii2 error summary list
  const summaryMatch = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*error-summary[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (summaryMatch) {
    return summaryMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Help-block-error
  const helpMatch = html.match(
    /<[^>]*class\s*=\s*["'][^"']*help-block-error[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
  );
  if (helpMatch) {
    const text = helpMatch[1].replace(/<[^>]+>/g, '').trim();
    if (text) return text;
  }

  return 'Invalid username or password.';
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean;
  studentId: string;
  error?: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch wrapper that adds timeout (using AbortController) and auto-retry
 * for transient network errors (timeouts or offline failures).
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000,
  retries = 2
): Promise<Response> {
  let attempt = 0;
  while (attempt <= retries) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error: any) {
      clearTimeout(id);
      const isTimeout = error.name === 'AbortError';
      const isNetworkError =
        error.message?.includes('Network request failed') ||
        error.message?.includes('fetch');
      
      if ((isTimeout || isNetworkError) && attempt < retries) {
        attempt++;
        console.warn(`[Network] Attempt ${attempt} failed for URL: ${url}. Retrying in ${500 * attempt}ms...`);
        await sleep(500 * attempt);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Request failed after retries');
}

async function waitForSessionReady(
  attempts = 4,
  delayMs = 250,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const ok = await validateSession();
    if (ok) return true;
    if (i < attempts - 1) {
      await sleep(delayMs);
    }
  }
  return false;
}

export async function loginToEtlab(
  username: string,
  password: string,
  rememberMe: boolean,
): Promise<LoginResult> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      studentId: '',
      error:
        'Login from web is not supported: the ETLAB server blocks cross-origin requests. Run the app on a device/emulator or configure a CORS proxy.',
    };
  }

  // Step 1: GET login page
  const loginPageRes = await fetchWithTimeout(`${BASE_URL}/user/login`, {
    headers: { 'User-Agent': 'MyGCEK/1.0' },
    credentials: 'include',
  }, 12000, 2);

  const loginPageHtml = await loginPageRes.text();
  const csrfToken = extractCsrfToken(loginPageHtml);
  const csrfFieldName = csrfToken ? extractCsrfFieldName(loginPageHtml) : '';

  // Introduce a small delay on iOS to allow the background cookie thread
  // to finish persisting the CSRF cookie to the native cookie jar.
  if (Platform.OS === 'ios') {
    await sleep(300);
  }

  // Step 2: POST credentials
  const formBody = new URLSearchParams();
  if (csrfToken && csrfFieldName) {
    formBody.append(csrfFieldName, csrfToken);
  }
  formBody.append('LoginForm[username]', username);
  formBody.append('LoginForm[password]', password);
  formBody.append('LoginForm[rememberMe]', rememberMe ? '1' : '0');

  const loginRes = await fetchWithTimeout(`${BASE_URL}/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MyGCEK/1.0',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/user/login`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: formBody.toString(),
    credentials: 'include',
  }, 15000, 2);

  const responseHtml = await loginRes.text();

  if (
    responseHtml.includes('LoginForm[username]') ||
    responseHtml.includes('LoginForm[password]')
  ) {
    return {
      success: false,
      studentId: '',
      error: extractLoginError(responseHtml),
    };
  }

  // Step 3: extract student ID if possible
  let studentId = extractStudentId(responseHtml) || '';

  if (!studentId) {
    try {
      const attPageRes = await fetchWithTimeout(`${BASE_URL}/student/attendance`, {
        headers: { 'User-Agent': 'MyGCEK/1.0' },
        credentials: 'include',
      }, 10000, 1);
      const attPageHtml = await attPageRes.text();
      studentId = extractStudentId(attPageHtml) || '';
    } catch {
      // ignore
    }
  }

  // Step 4: confirm the session is actually usable before declaring success
  const sessionReady = await waitForSessionReady();
  if (!sessionReady) {
    return {
      success: false,
      studentId: '',
      error:
        'Login was accepted, but the session was not ready yet. Please try again.',
    };
  }

  return {
    success: true,
    studentId,
  };
}

// ─── Session validation ─────────────────────────────────────────────────────

/**
 * Check whether session cookies are still valid by making a lightweight
 * request to a protected page. If the server redirects to the login page,
 * the session has expired.
 */
export async function validateSession(): Promise<boolean> {
  try {
    const res = await fetchPage(`${BASE_URL}/ktuacademics/student/results`);
    // If the session has not explicitly expired (even if the server returns a temporary 5xx status),
    // we consider the session alive to prevent outage-induced automatic logouts.
    return !res.sessionExpired;
  } catch (err) {
    console.warn('[Session] validation network/unexpected error:', err);
    // Network error — treat as alive to allow offline cache usage
    return true;
  }
}

// ─── Authenticated page fetchers ────────────────────────────────────────────

export interface FetchPageResult {
  ok: boolean;
  html: string;
  sessionExpired: boolean;
}

/**
 * Generic authenticated GET request. Returns the HTML body.
 * Detects session expiry (redirect to login page).
 */
export async function fetchPage(url: string): Promise<FetchPageResult> {
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'MyGCEK/1.0' },
    redirect: 'manual',
    credentials: 'include',
  }, 12000, 2);

  // Redirect to login = session expired
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    if (location.includes('login') || location === '/' || location === `${BASE_URL}/`) {
      return { ok: false, html: '', sessionExpired: true };
    }
    // Non-login redirect — follow it
    const absUrl = location.startsWith('http') ? location : `${BASE_URL}${location}`;
    const followRes = await fetchWithTimeout(absUrl, {
      headers: { 'User-Agent': 'MyGCEK/1.0' },
      credentials: 'include',
    }, 12000, 2);
    const followHtml = await followRes.text();
    if (followHtml.includes('LoginForm[username]') || followHtml.includes('LoginForm[password]')) {
      return { ok: false, html: '', sessionExpired: true };
    }
    return { ok: true, html: followHtml, sessionExpired: false };
  }

  if (!res.ok) {
    console.warn(`[Auth] Fetch failed for URL: ${url} with status: ${res.status}`);
    return { ok: false, html: '', sessionExpired: false };
  }

  const html = await res.text();

  // Double-check: if the response HTML is actually the login page
  if (html.includes('LoginForm[username]') || html.includes('LoginForm[password]')) {
    return { ok: false, html: '', sessionExpired: true };
  }

  return { ok: true, html, sessionExpired: false };
}

/** Fetch the attendance page for a specific student. */
export function fetchAttendance(studentId: string) {
  return fetchPage(
    `${BASE_URL}/ktuacademics/student/viewattendancesubject/${studentId}`
  );
}

/** Fetch the results page. */
export function fetchResults() {
  return fetchPage(`${BASE_URL}/ktuacademics/student/results`);
}

/** Fetch the assignments page. */
export function fetchAssignments() {
  return fetchPage(`${BASE_URL}/student/assignments`);
}

/** Fetch the surveys page. */
export function fetchSurveys() {
  return fetchPage(`${BASE_URL}/survey/user/viewall`);
}

/** Invalidate the session on the ETLAB server with a timeout fallback. */
export async function logoutFromEtlab(): Promise<void> {
  try {
    await fetchWithTimeout(`${BASE_URL}/user/logout`, {
      credentials: 'include',
    }, 8000, 1);
  } catch (err) {
    console.warn('[Auth] Logout network request failed:', err);
  }
}
