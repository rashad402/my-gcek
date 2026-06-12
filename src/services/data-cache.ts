import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  SubjectAttendance,
  AttendanceRecord,
  SubjectResult,
  Assignment,
  Survey,
  TimetableData
} from './etlab-parser';

// ─── Module Private State ───────────────────────────────────────────────────

let _attendance: SubjectAttendance[] | null = null;
let _attendanceHistory: AttendanceRecord[] | null = null;
let _results: SubjectResult[] | null = null;
let _assignments: Assignment[] | null = null;
let _surveys: Survey[] | null = null;
let _timetable: TimetableData | null = null;

let _lastUpdated = {
  attendance: 0,
  attendanceHistory: 0,
  results: 0,
  assignments: 0,
  surveys: 0,
  timetable: 0,
};

const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB

// ─── Encryption Key Management ──────────────────────────────────────────────

/**
 * Retrieve or generate a 32-character encryption key stored securely in the native Keychain/Keystore.
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync('cache_encryption_key');
  if (!key) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let generatedKey = '';
    for (let i = 0; i < 32; i++) {
      generatedKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    key = generatedKey;
    await SecureStore.setItemAsync('cache_encryption_key', key);
  }
  return key;
}

// ─── XXTEA Block Cipher ──────────────────────────────────────────────────────

function xxteaEncrypt(str: string, keyStr: string): string {
  if (str.length === 0) return "";
  const v = str2long(str, true);
  const k = key2long(keyStr);
  const n = v.length - 1;
  if (n < 0) return "";
  let z = v[n], y = v[0], delta = 0x9e3779b9;
  let mx, e, q = Math.floor(6 + 52 / (n + 1)), sum = 0;
  while (q-- > 0) {
    sum = (sum + delta) & 0xffffffff;
    e = (sum >>> 2) & 3;
    for (let p = 0; p < n; p++) {
      y = v[p + 1];
      mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z))) & 0xffffffff;
      z = v[p] = (v[p] + mx) & 0xffffffff;
    }
    y = v[0];
    mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[n & 3 ^ e] ^ z))) & 0xffffffff;
    z = v[n] = (v[n] + mx) & 0xffffffff;
  }
  return long2str(v, false);
}

function xxteaDecrypt(str: string, keyStr: string): string {
  if (str.length === 0) return "";
  const v = str2long(str, false);
  const k = key2long(keyStr);
  const n = v.length - 1;
  if (n < 0) return "";
  let z = v[n], y = v[0], delta = 0x9e3779b9;
  let mx, e, q = Math.floor(6 + 52 / (n + 1)), sum = (q * delta) & 0xffffffff;
  while (sum !== 0) {
    e = (sum >>> 2) & 3;
    for (let p = n; p > 0; p--) {
      z = v[p - 1];
      mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z))) & 0xffffffff;
      y = v[p] = (v[p] - mx) & 0xffffffff;
    }
    z = v[n];
    mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[0 & 3 ^ e] ^ z))) & 0xffffffff;
    y = v[0] = (v[0] - mx) & 0xffffffff;
    sum = (sum - delta) & 0xffffffff;
  }
  return long2str(v, true);
}

function str2long(s: string, w: boolean): number[] {
  const len = s.length;
  const v: number[] = [];
  for (let i = 0; i < len; i += 4) {
    v[i >> 2] = (s.charCodeAt(i) || 0) |
                ((s.charCodeAt(i + 1) || 0) << 8) |
                ((s.charCodeAt(i + 2) || 0) << 16) |
                ((s.charCodeAt(i + 3) || 0) << 24);
  }
  if (w) {
    v[v.length] = len;
  }
  return v;
}

function long2str(v: number[], w: boolean): string {
  const len = v.length;
  if (len === 0) return "";
  let n = len << 2;
  if (w) {
    const m = v[len - 1];
    if ((m < n - 7) || (m > n - 4)) return "";
    n = m;
  }
  const s: string[] = [];
  for (let i = 0; i < n; i++) {
    s[i] = String.fromCharCode((v[i >>> 2] >>> ((i & 3) << 3)) & 0xff);
  }
  return s.join("");
}

function key2long(key: string): number[] {
  const k: number[] = new Array(4).fill(0);
  for (let i = 0; i < Math.min(key.length, 16); i++) {
    k[i >>> 2] |= key.charCodeAt(i) << ((i & 3) << 3);
  }
  return k;
}

// ─── Encoding Helpers ────────────────────────────────────────────────────────

function strToHex(str: string): string {
  const hex = [];
  for (let i = 0; i < str.length; i++) {
    hex.push(str.charCodeAt(i).toString(16).padStart(2, '0'));
  }
  return hex.join('');
}

function hexToStr(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
  }
  return str;
}

// ─── SHA-256 for Integrity Signatures ────────────────────────────────────────

function sha256(str: string): string {
  const chrsz = 8;
  const hexcase = 0;
  function safe_add(x: number, y: number) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  function S(X: number, n: number) { return (X >>> n) | (X << (32 - n)); }
  function R(X: number, n: number) { return (X >>> n); }
  function Ch(x: number, y: number, z: number) { return ((x & y) ^ ((~x) & z)); }
  function Maj(x: number, y: number, z: number) { return ((x & y) ^ (x & z) ^ (y & z)); }
  function Sigma0256(x: number) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
  function Sigma1256(x: number) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
  function gamma0256(x: number) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
  function gamma1256(x: number) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }
  function core_sha256(m: number[], l: number) {
    const K = [
      0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
      0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const HASH = [
      0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const W = new Array(64);
    let a, b, c, d, e, f, g, h, i, j;
    let T1, T2;
    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >> 9) << 4) + 15] = l;
    for (i = 0; i < m.length; i += 16) {
      a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3];
      e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
      for (j = 0; j < 64; j++) {
        if (j < 16) W[j] = m[i + j];
        else W[j] = safe_add(safe_add(safe_add(gamma1256(W[j - 2]), W[j - 7]), gamma0256(W[j - 15])), W[j - 16]);
        T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
        T2 = safe_add(Sigma0256(a), Maj(a, b, c));
        h = g; g = f; f = e; e = safe_add(d, T1);
        d = c; c = b; b = a; a = safe_add(T1, T2);
      }
      HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]);
      HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
      HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]);
      HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
    }
    return HASH;
  }
  function str2binb(str: string) {
    const bin: number[] = [];
    const mask = (1 << chrsz) - 1;
    for (let i = 0; i < str.length * chrsz; i += chrsz) {
      bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
    }
    return bin;
  }
  function binb2hex(binarray: number[]) {
    const hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i++) {
      str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
             hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
    }
    return str;
  }
  return binb2hex(core_sha256(str2binb(str), str.length * chrsz));
}

// ─── Cipher & Signature Wrapper ──────────────────────────────────────────────

async function encryptAndSign(dataStr: string): Promise<string> {
  if (dataStr.length > MAX_PAYLOAD_SIZE) {
    throw new Error('Payload size exceeds 2MB limit');
  }

  const key = await getOrCreateEncryptionKey();
  
  // Percent-encode to support arbitrary UTF-16 strings safely
  const asciiStr = encodeURIComponent(dataStr);
  const encrypted = xxteaEncrypt(asciiStr, key);
  const hex = strToHex(encrypted);
  
  // Signature for integrity validation
  const sig = sha256(key + ':' + hex);
  
  return JSON.stringify({
    payload: hex,
    signature: sig
  });
}

async function decryptAndVerify(storedStr: string): Promise<string> {
  if (storedStr.length > MAX_PAYLOAD_SIZE) {
    throw new Error('Stored payload size exceeds 2MB limit');
  }

  const parsed = JSON.parse(storedStr);
  if (!parsed || typeof parsed !== 'object' || !('payload' in parsed) || !('signature' in parsed)) {
    throw new Error('Invalid cache payload structure');
  }
  
  const hex = parsed.payload;
  const sig = parsed.signature;
  
  const key = await getOrCreateEncryptionKey();
  
  // Validate signature
  const expectedSig = sha256(key + ':' + hex);
  if (sig !== expectedSig) {
    throw new Error('Cache integrity verification failed');
  }
  
  const encrypted = hexToStr(hex);
  const asciiStr = xxteaDecrypt(encrypted, key);
  return decodeURIComponent(asciiStr);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const dataCache = {
  // Read-only getters to enforce access control
  get attendance() { return _attendance; },
  get attendanceHistory() { return _attendanceHistory; },
  get results() { return _results; },
  get assignments() { return _assignments; },
  get surveys() { return _surveys; },
  get timetable() { return _timetable; },

  get lastUpdated() {
    return { ..._lastUpdated };
  },

  isStale(key: 'attendance' | 'attendanceHistory' | 'results' | 'assignments' | 'surveys' | 'timetable', ttlMs = 10 * 60 * 1000): boolean {
    const lastTime = _lastUpdated[key];
    if (!lastTime) return true;
    return Date.now() - lastTime > ttlMs;
  },

  /** Load all caches from AsyncStorage during app startup */
  async loadFromStorage() {
    // 1. Proactively delete legacy plaintext SecureStore keys without reading them
    const legacyKeys = [
      'cache_attendance',
      'cache_attendance_history',
      'cache_results',
      'cache_assignments',
      'cache_surveys',
      'cache_timetable'
    ];
    for (const key of legacyKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore not found or permission errors during cleanup
      }
    }

    // 2. Load caches from AsyncStorage and decrypt
    const cacheKeys: ('attendance' | 'attendanceHistory' | 'results' | 'assignments' | 'surveys' | 'timetable')[] = [
      'attendance',
      'attendanceHistory',
      'results',
      'assignments',
      'surveys',
      'timetable'
    ];
    
    for (const key of cacheKeys) {
      // Map key camelCase to snake_case storage key
      const storageKey = `cache_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;
      try {
        const storedVal = await AsyncStorage.getItem(storageKey);
        if (storedVal) {
          try {
            const decrypted = await decryptAndVerify(storedVal);
            const parsed = parseStoredCache(decrypted);
            
            if (key === 'attendance') _attendance = parsed.data as SubjectAttendance[];
            else if (key === 'attendanceHistory') _attendanceHistory = parsed.data as AttendanceRecord[];
            else if (key === 'results') _results = parsed.data as SubjectResult[];
            else if (key === 'assignments') _assignments = parsed.data as Assignment[];
            else if (key === 'surveys') _surveys = parsed.data as Survey[];
            else if (key === 'timetable') _timetable = parsed.data as TimetableData;
            
            _lastUpdated[key] = parsed.timestamp;
          } catch (decryptErr) {
            console.warn(`[CACHE] Failed to decrypt cache for ${key}, clearing key from AsyncStorage:`, decryptErr);
            await AsyncStorage.removeItem(storageKey);
          }
        }
      } catch (err) {
        console.warn(`Failed to load cache ${key} from AsyncStorage:`, err);
      }
    }
  },

  async setAttendance(data: SubjectAttendance[]) {
    _attendance = data;
    _lastUpdated.attendance = Date.now();
    const valStr = JSON.stringify({ data, timestamp: _lastUpdated.attendance });
    const encrypted = await encryptAndSign(valStr);
    await AsyncStorage.setItem('cache_attendance', encrypted);
  },

  async setAttendanceHistory(data: AttendanceRecord[]) {
    _attendanceHistory = data;
    _lastUpdated.attendanceHistory = Date.now();
    const valStr = JSON.stringify({ data, timestamp: _lastUpdated.attendanceHistory });
    const encrypted = await encryptAndSign(valStr);
    await AsyncStorage.setItem('cache_attendance_history', encrypted);
  },

  async setResults(data: SubjectResult[]) {
    _results = data;
    _lastUpdated.results = Date.now();
    const valStr = JSON.stringify({ data, timestamp: _lastUpdated.results });
    const encrypted = await encryptAndSign(valStr);
    await AsyncStorage.setItem('cache_results', encrypted);
  },

  async setAssignments(data: Assignment[]) {
    _assignments = data;
    _lastUpdated.assignments = Date.now();
    const valStr = JSON.stringify({ data, timestamp: _lastUpdated.assignments });
    const encrypted = await encryptAndSign(valStr);
    await AsyncStorage.setItem('cache_assignments', encrypted);
  },

  async setSurveys(data: Survey[]) {
    _surveys = data;
    _lastUpdated.surveys = Date.now();
    const valStr = JSON.stringify({ data, timestamp: _lastUpdated.surveys });
    const encrypted = await encryptAndSign(valStr);
    await AsyncStorage.setItem('cache_surveys', encrypted);
  },

  async setTimetable(data: TimetableData) {
    _timetable = data;
    _lastUpdated.timetable = Date.now();
    const valStr = JSON.stringify({ data, timestamp: _lastUpdated.timetable });
    const encrypted = await encryptAndSign(valStr);
    await AsyncStorage.setItem('cache_timetable', encrypted);
  },

  /** Clear cache upon logging out. Propagates errors instead of silencing. */
  async clear() {
    _attendance = null;
    _attendanceHistory = null;
    _results = null;
    _assignments = null;
    _surveys = null;
    _timetable = null;
    _lastUpdated = {
      attendance: 0,
      attendanceHistory: 0,
      results: 0,
      assignments: 0,
      surveys: 0,
      timetable: 0,
    };

    const keys = [
      'cache_attendance',
      'cache_attendance_history',
      'cache_results',
      'cache_assignments',
      'cache_surveys',
      'cache_timetable'
    ];

    const errors: any[] = [];
    for (const key of keys) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (err) {
        errors.push(err);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to clear some cache keys from AsyncStorage: ${errors.map(e => e.message || String(e)).join(', ')}`);
    }
  }
};

/** Helper to parse decrypted cache entries */
function parseStoredCache(str: string): { data: any | null; timestamp: number } {
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'timestamp' in parsed) {
      return { data: parsed.data, timestamp: parsed.timestamp };
    }
  } catch (e) {
    console.warn('Failed to parse decrypted cache entry:', e);
  }
  return { data: null, timestamp: 0 };
}
