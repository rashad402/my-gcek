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

const BASE_URL = 'https://gcek.etlab.in';

// ─── Cookie helpers ─────────────────────────────────────────────────────────

/**
 * Parse raw `Set-Cookie` header(s) into a single cookie string
 * suitable for the `Cookie` request header.
 *
 * React Native's `fetch` may return multiple Set-Cookie values
 * concatenated with ", " or as separate headers depending on platform.
 */
export function parseCookies(setCookieHeader: string | null): string {
  if (!setCookieHeader) return '';
  // Each Set-Cookie directive is separated by ", " when headers are merged.
  // We only need the name=value portion (before the first ";").
  return setCookieHeader
    .split(/,(?=\s*[A-Za-z_][A-Za-z0-9_]*=)/)
    .map((c) => c.trim().split(';')[0])
    .filter(Boolean)
    .join('; ');
}

/** Merge two cookie strings, with `newer` overriding duplicate keys from `older`. */
export function mergeCookies(older: string, newer: string): string {
  const map = new Map<string, string>();
  const parse = (raw: string) => {
    raw.split(';').forEach((pair) => {
      const trimmed = pair.trim();
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        map.set(trimmed.substring(0, eqIdx), trimmed);
      }
    });
  };
  parse(older);
  parse(newer);
  return Array.from(map.values()).join('; ');
}

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
  cookies: string;
  studentId: string;
  error?: string;
}

/**
 * Authenticate against ETLAB using the two-step CSRF login.
 *
 * 1. GET login page → extract CSRF token + session cookie
 * 2. POST credentials with token → check for 302 (success) vs 200 (failure)
 * 3. On success, follow redirect to dashboard and extract studentId
 *
 * The password parameter is used only within this function and is never
 * stored, logged, or returned.
 */
export async function loginToEtlab(
  username: string,
  password: string,
  rememberMe: boolean,
): Promise<LoginResult> {
  // ── Step 1: GET login page ──────────────────────────────────────────
  const loginPageRes = await fetch(`${BASE_URL}/`, {
    headers: { 'User-Agent': 'MyGCEK/1.0' },
  });
  const loginPageHtml = await loginPageRes.text();
  const csrfToken = extractCsrfToken(loginPageHtml);
  const csrfFieldName = csrfToken ? extractCsrfFieldName(loginPageHtml) : '';
  let cookies = parseCookies(loginPageRes.headers.get('set-cookie'));

  // ── Step 2: POST credentials ────────────────────────────────────────
  const formBody = new URLSearchParams();
  if (csrfToken && csrfFieldName) {
    formBody.append(csrfFieldName, csrfToken);
  }
  formBody.append('LoginForm[username]', username);
  formBody.append('LoginForm[password]', password);
  formBody.append('LoginForm[rememberMe]', rememberMe ? '1' : '0');

  const loginRes = await fetch(`${BASE_URL}/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'User-Agent': 'MyGCEK/1.0',
    },
    body: formBody.toString(),
    redirect: 'manual',
  });

  // Merge any new cookies from the POST response
  const postCookies = parseCookies(loginRes.headers.get('set-cookie'));
  if (postCookies) {
    cookies = mergeCookies(cookies, postCookies);
  }

  // ── Step 3: Check result ────────────────────────────────────────────

  // 302 redirect = successful login
  if (loginRes.status >= 300 && loginRes.status < 400) {
    const redirectUrl = loginRes.headers.get('location') || `${BASE_URL}/`;
    const absoluteRedirect = redirectUrl.startsWith('http')
      ? redirectUrl
      : `${BASE_URL}${redirectUrl}`;

    // Follow the redirect to get the dashboard page
    const dashRes = await fetch(absoluteRedirect, {
      headers: { 'Cookie': cookies, 'User-Agent': 'MyGCEK/1.0' },
      redirect: 'manual',
    });
    const dashCookies = parseCookies(dashRes.headers.get('set-cookie'));
    if (dashCookies) {
      cookies = mergeCookies(cookies, dashCookies);
    }

    // If the dashboard itself redirects, follow once more
    let dashHtml: string;
    if (dashRes.status >= 300 && dashRes.status < 400) {
      const secondRedirect = dashRes.headers.get('location') || `${BASE_URL}/`;
      const absSecond = secondRedirect.startsWith('http') ? secondRedirect : `${BASE_URL}${secondRedirect}`;
      const finalRes = await fetch(absSecond, {
        headers: { 'Cookie': cookies, 'User-Agent': 'MyGCEK/1.0' },
      });
      const finalCookies = parseCookies(finalRes.headers.get('set-cookie'));
      if (finalCookies) cookies = mergeCookies(cookies, finalCookies);
      dashHtml = await finalRes.text();
    } else {
      dashHtml = await dashRes.text();
    }

    const studentId = extractStudentId(dashHtml) || '';
    return { success: true, cookies, studentId };
  }

  // 200 = login page returned again with error
  const responseHtml = await loginRes.text();
  return {
    success: false,
    cookies: '',
    studentId: '',
    error: extractLoginError(responseHtml),
  };
}

// ─── Session validation ─────────────────────────────────────────────────────

/**
 * Check whether session cookies are still valid by making a lightweight
 * request to a protected page. If the server redirects to the login page,
 * the session has expired.
 */
export async function validateSession(cookies: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/ktuacademics/student/results`, {
      headers: { 'Cookie': cookies, 'User-Agent': 'MyGCEK/1.0' },
      redirect: 'manual',
    });
    // Redirect to login = expired
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') || '';
      if (location.includes('login') || location === '/' || location === `${BASE_URL}/`) {
        return false;
      }
    }
    // 200 = session is alive
    return res.status === 200;
  } catch {
    // Network error — treat as unknown (not expired)
    return false;
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
export async function fetchPage(url: string, cookies: string): Promise<FetchPageResult> {
  const res = await fetch(url, {
    headers: { 'Cookie': cookies, 'User-Agent': 'MyGCEK/1.0' },
    redirect: 'manual',
  });

  // Redirect to login = session expired
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    if (location.includes('login') || location === '/' || location === `${BASE_URL}/`) {
      return { ok: false, html: '', sessionExpired: true };
    }
    // Non-login redirect — follow it
    const absUrl = location.startsWith('http') ? location : `${BASE_URL}${location}`;
    const followRes = await fetch(absUrl, {
      headers: { 'Cookie': cookies, 'User-Agent': 'MyGCEK/1.0' },
    });
    return { ok: true, html: await followRes.text(), sessionExpired: false };
  }

  if (!res.ok) {
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
export function fetchAttendance(cookies: string, studentId: string) {
  return fetchPage(
    `${BASE_URL}/ktuacademics/student/viewattendancesubject/${studentId}`,
    cookies,
  );
}

/** Fetch the results page. */
export function fetchResults(cookies: string) {
  return fetchPage(`${BASE_URL}/ktuacademics/student/results`, cookies);
}

/** Fetch the assignments page. */
export function fetchAssignments(cookies: string) {
  return fetchPage(`${BASE_URL}/student/assignments`, cookies);
}

/** Fetch the surveys page. */
export function fetchSurveys(cookies: string) {
  return fetchPage(`${BASE_URL}/survey/user/viewall`, cookies);
}
