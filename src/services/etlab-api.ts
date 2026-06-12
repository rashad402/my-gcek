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

import { Platform, NativeModules } from 'react-native';
import { parseAttendanceFormOptions } from './etlab-parser';

const BASE_URL = 'https://gcek.etlab.in';

const hasNativeCookieManager = !!(
  NativeModules.RNCookieManagerIOS ||
  NativeModules.RNCookieManagerAndroid ||
  NativeModules.RNCookieManager
);

let CookieManager: any = null;
if (hasNativeCookieManager) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    CookieManager = require('@react-native-cookies/cookies').default;
  } catch {
    // Fail silently
  }
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

function sanitizeErrorText(rawText: string): string {
  // 1. Strip HTML tags
  let cleaned = rawText.replace(/<[^>]+>/g, '');
  
  // 2. Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 3. Strip control characters (ASCII 0-31, 127) to prevent malicious injection
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  return cleaned.trim();
}

function extractLoginError(html: string): string {
  // Yii2 error summary
  const errorMatch = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*errorMessage[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (errorMatch) {
    return sanitizeErrorText(errorMatch[1]);
  }

  // Yii2 error summary list
  const summaryMatch = html.match(
    /<div[^>]*class\s*=\s*["'][^"']*error-summary[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (summaryMatch) {
    return sanitizeErrorText(summaryMatch[1]);
  }

  // Help-block-error
  const helpMatch = html.match(
    /<[^>]*class\s*=\s*["'][^"']*help-block-error[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
  );
  if (helpMatch) {
    const text = sanitizeErrorText(helpMatch[1]);
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
        if (__DEV__) {
          console.warn(`[Network] Attempt ${attempt} failed for URL: ${url}. Retrying in ${500 * attempt}ms...`);
        }
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
    const status = await validateSession();
    if (status === 'valid') return true;
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
  
  if (!csrfToken) {
    return {
      success: false,
      studentId: '',
      error: 'Could not extract CSRF security token from login page. Please check your network connection or try again.',
    };
  }
  
  const csrfFieldName = extractCsrfFieldName(loginPageHtml);

  // Introduce a small delay on iOS to allow the background cookie thread
  // to finish persisting the CSRF cookie to the native cookie jar.
  if (Platform.OS === 'ios') {
    await sleep(300);
  }

  // Step 2: POST credentials
  const formBody = new URLSearchParams();
  formBody.append(csrfFieldName, csrfToken);
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
  }, 15000, 0);

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

export type SessionStatus = 'valid' | 'expired' | 'unknown';

/**
 * Check whether session cookies are still valid by making a lightweight
 * request to a protected page. If the server redirects to the login page,
 * the session has expired.
 */
export async function validateSession(): Promise<SessionStatus> {
  try {
    const res = await fetchPage(`${BASE_URL}/ktuacademics/student/results`);
    if (res.sessionExpired) {
      return 'expired';
    }
    if (!res.ok) {
      return 'unknown';
    }
    return 'valid';
  } catch (err) {
    if (__DEV__) {
      console.warn('[Session] validation network/unexpected error:', err);
    }
    // Network error — treat as unknown to allow offline cache usage but fail-closed for privileged actions
    return 'unknown';
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
    
    // Non-login redirect — validate host & scheme before following
    let absUrl: URL;
    try {
      absUrl = new URL(location, BASE_URL);
    } catch {
      if (__DEV__) {
        console.warn(`[Security] Invalid redirect location: ${location}`);
      }
      return { ok: false, html: '', sessionExpired: false };
    }

    if (absUrl.protocol !== 'https:' || absUrl.host !== 'gcek.etlab.in') {
      if (__DEV__) {
        console.warn(`[Security] Blocked non-HTTPS or external redirect to: ${absUrl.toString()}`);
      }
      return { ok: false, html: '', sessionExpired: false };
    }

    const followRes = await fetchWithTimeout(absUrl.toString(), {
      headers: { 'User-Agent': 'MyGCEK/1.0' },
      credentials: 'include',
    }, 12000, 2);
    
    if (!followRes.ok) {
      return { ok: false, html: '', sessionExpired: false };
    }

    const followHtml = await followRes.text();
    if (
      followHtml.includes('LoginForm[username]') || 
      followHtml.includes('LoginForm[password]') ||
      followHtml.includes('id="loginForm"')
    ) {
      return { ok: false, html: '', sessionExpired: true };
    }
    return { ok: true, html: followHtml, sessionExpired: false };
  }

  if (!res.ok) {
    if (__DEV__) {
      console.warn(`[Auth] Fetch failed for URL: ${url} with status: ${res.status}`);
    }
    return { ok: false, html: '', sessionExpired: false };
  }

  const html = await res.text();

  // Double-check: if the response HTML is actually the login page
  if (
    html.includes('LoginForm[username]') || 
    html.includes('LoginForm[password]') ||
    html.includes('id="loginForm"')
  ) {
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

/** Extract CSRF token and name from general page HTML. */
function extractPageCsrf(html: string): { name: string; token: string } | null {
  const metaMatch = html.match(/meta\s+name\s*=\s*["']csrf-token["']\s+content\s*=\s*["']([^"']+)["']/i);
  const metaToken = metaMatch ? metaMatch[1] : null;

  const inputMatch = html.match(/input[^>]*name\s*=\s*["'](_csrf[^"']*)["'][^>]*value\s*=\s*["']([^"']+)["']/i)
    || html.match(/input[^>]*value\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["'](_csrf[^"']*)["']/i);

  if (inputMatch) {
    const isNameFirst = inputMatch[0].indexOf('name') < inputMatch[0].indexOf('value');
    const name = isNameFirst ? inputMatch[1] : inputMatch[2];
    const token = isNameFirst ? inputMatch[2] : inputMatch[1];
    return { name, token };
  }

  if (metaToken) {
    const paramMatch = html.match(/meta\s+name\s*=\s*["']csrf-param["']\s+content\s*=\s*["']([^"']+)["']/i);
    const paramName = paramMatch ? paramMatch[1] : '_csrf-frontend';
    return { name: paramName, token: metaToken };
  }

  return null;
}

export interface FetchAttendanceHistoryResult {
  ok: boolean;
  htmls: string[];
  sessionExpired: boolean;
}

/** Fetch the per-day attendance history pages for all months in the current semester. */
export async function fetchAttendanceHistory(): Promise<FetchAttendanceHistoryResult> {
  const initialRes = await fetchPage(`${BASE_URL}/ktuacademics/student/attendance`);
  if (!initialRes.ok || initialRes.sessionExpired) {
    return { ok: initialRes.ok, htmls: [], sessionExpired: initialRes.sessionExpired };
  }

  const htmls = [initialRes.html];
  
  try {
    const options = parseAttendanceFormOptions(initialRes.html);
    const { semester, months, selectedMonth, selectedYear } = options;
    
    if (!semester || months.length === 0 || !selectedYear) {
      console.log('[API] No attendance options found or semester is empty. Returning initial page only.');
      return { ok: true, htmls, sessionExpired: false };
    }

    // Determine the year for each month option using the drop-detection algorithm
    const selectedYearInt = parseInt(selectedYear, 10);
    const monthYears: { month: string; year: string }[] = [];

    let transitionFound = false;
    for (let i = 0; i < months.length - 1; i++) {
      const m1 = parseInt(months[i].value, 10);
      const m2 = parseInt(months[i + 1].value, 10);
      if (m1 > m2) {
        transitionFound = true;
        break;
      }
    }

    if (transitionFound) {
      let passedDrop = false;
      for (let i = 0; i < months.length; i++) {
        if (i > 0 && parseInt(months[i].value, 10) < parseInt(months[i - 1].value, 10)) {
          passedDrop = true;
        }
        const yearForMonth = passedDrop ? selectedYearInt : (selectedYearInt - 1);
        monthYears.push({
          month: months[i].value,
          year: yearForMonth.toString(),
        });
      }
    } else {
      for (const m of months) {
        monthYears.push({
          month: m.value,
          year: selectedYear,
        });
      }
    }

    // Extract CSRF token from the initial HTML
    const csrf = extractPageCsrf(initialRes.html);

    console.log('[API] Form options parsed. Fetching additional months:', monthYears.map(my => `${my.year}-${my.month}`));

    // Fetch other months (excluding the one we already got in the initial GET request)
    for (const my of monthYears) {
      if (my.month === selectedMonth && my.year === selectedYear) {
        // Already got this month in initial GET request
        continue;
      }

      console.log(`[API] POSTing for month=${my.month}, year=${my.year}, semester=${semester}...`);

      const formBody = new URLSearchParams();
      if (csrf) {
        formBody.append(csrf.name, csrf.token);
      }
      formBody.append('semester', semester);
      formBody.append('month', my.month);
      formBody.append('year', my.year);

      const postRes = await fetchWithTimeout(`${BASE_URL}/ktuacademics/student/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MyGCEK/1.0',
          'Origin': BASE_URL,
          'Referer': `${BASE_URL}/ktuacademics/student/attendance`,
        },
        body: formBody.toString(),
        credentials: 'include',
      }, 12000, 0);

      if (postRes.status >= 300 && postRes.status < 400) {
        const location = postRes.headers.get('location') || '';
        if (location.includes('login') || location === '/' || location === `${BASE_URL}/`) {
          return { ok: false, htmls: [], sessionExpired: true };
        }
      }

      if (!postRes.ok) {
        if (__DEV__) {
          console.warn(`[API] POST failed for month=${my.month}, year=${my.year} with status: ${postRes.status}`);
        }
        continue;
      }

      const postHtml = await postRes.text();
      if (
        postHtml.includes('LoginForm[username]') || 
        postHtml.includes('LoginForm[password]') ||
        postHtml.includes('id="loginForm"')
      ) {
        return { ok: false, htmls: [], sessionExpired: true };
      }

      htmls.push(postHtml);
    }
  } catch (err) {
    if (__DEV__) {
      console.error('[API] Error fetching other months of attendance history:', err);
    }
  }

  return { ok: true, htmls, sessionExpired: false };
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

/** Fetch the timetable page. */
export function fetchTimetable() {
  return fetchPage(`${BASE_URL}/student/timetable`);
}


/** Invalidate the session on the ETLAB server with a timeout fallback. */
export async function logoutFromEtlab(): Promise<void> {
  try {
    await fetchWithTimeout(`${BASE_URL}/user/logout`, {
      credentials: 'include',
    }, 8000, 1);
  } catch (err) {
    if (__DEV__) {
      console.warn('[Auth] Logout network request failed:', err);
    }
  } finally {
    if (CookieManager) {
      try {
        await CookieManager.clearAll();
      } catch (cookieErr) {
        if (__DEV__) {
          console.warn('[Auth] Failed to clear native cookie jar:', cookieErr);
        }
      }
    }
  }
}
