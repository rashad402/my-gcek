import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { TimetableData } from './etlab-parser';

export const dataCache = {
  attendance: null as any[] | null,
  attendanceHistory: null as any[] | null,
  results: null as any[] | null,
  assignments: null as any[] | null,
  surveys: null as any[] | null,
  timetable: null as TimetableData | null,

  lastUpdated: {
    attendance: 0,
    attendanceHistory: 0,
    results: 0,
    assignments: 0,
    surveys: 0,
    timetable: 0,
  },

  isStale(key: 'attendance' | 'attendanceHistory' | 'results' | 'assignments' | 'surveys' | 'timetable', ttlMs = 10 * 60 * 1000): boolean {
    const lastTime = this.lastUpdated[key];
    if (!lastTime) return true;
    return Date.now() - lastTime > ttlMs;
  },

  /** Load all caches from AsyncStorage during app startup */
  async loadFromStorage() {
    // 1. Proactively clear legacy SecureStore cache keys if they exist
    try {
      const legacyAtt = await SecureStore.getItemAsync('cache_attendance');
      if (legacyAtt) {
        console.log('[CACHE CLEANUP] Deleting legacy SecureStore cache_attendance');
        await SecureStore.deleteItemAsync('cache_attendance');
      }
      const legacyAttHist = await SecureStore.getItemAsync('cache_attendance_history');
      if (legacyAttHist) {
        console.log('[CACHE CLEANUP] Deleting legacy SecureStore cache_attendance_history');
        await SecureStore.deleteItemAsync('cache_attendance_history');
      }
      const legacyRes = await SecureStore.getItemAsync('cache_results');
      if (legacyRes) {
        console.log('[CACHE CLEANUP] Deleting legacy SecureStore cache_results');
        await SecureStore.deleteItemAsync('cache_results');
      }
      const legacyAss = await SecureStore.getItemAsync('cache_assignments');
      if (legacyAss) {
        console.log('[CACHE CLEANUP] Deleting legacy SecureStore cache_assignments');
        await SecureStore.deleteItemAsync('cache_assignments');
      }
      const legacySurv = await SecureStore.getItemAsync('cache_surveys');
      if (legacySurv) {
        console.log('[CACHE CLEANUP] Deleting legacy SecureStore cache_surveys');
        await SecureStore.deleteItemAsync('cache_surveys');
      }
      const legacyTimetable = await SecureStore.getItemAsync('cache_timetable');
      if (legacyTimetable) {
        console.log('[CACHE CLEANUP] Deleting legacy SecureStore cache_timetable');
        await SecureStore.deleteItemAsync('cache_timetable');
      }
    } catch (err) {
      console.warn('Failed to clear legacy SecureStore caches:', err);
    }

    // 2. Load caches from AsyncStorage
    try {
      const att = await AsyncStorage.getItem('cache_attendance');
      if (att) {
        const parsed = parseStoredCache(att);
        this.attendance = parsed.data;
        this.lastUpdated.attendance = parsed.timestamp;
      }

      const attHist = await AsyncStorage.getItem('cache_attendance_history');
      if (attHist) {
        const parsed = parseStoredCache(attHist);
        this.attendanceHistory = parsed.data;
        this.lastUpdated.attendanceHistory = parsed.timestamp;
      }
      
      const res = await AsyncStorage.getItem('cache_results');
      if (res) {
        const parsed = parseStoredCache(res);
        this.results = parsed.data;
        this.lastUpdated.results = parsed.timestamp;
      }
      
      const ass = await AsyncStorage.getItem('cache_assignments');
      if (ass) {
        const parsed = parseStoredCache(ass);
        this.assignments = parsed.data;
        this.lastUpdated.assignments = parsed.timestamp;
      }
      
      const surv = await AsyncStorage.getItem('cache_surveys');
      if (surv) {
        const parsed = parseStoredCache(surv);
        this.surveys = parsed.data;
        this.lastUpdated.surveys = parsed.timestamp;
      }

      const tt = await AsyncStorage.getItem('cache_timetable');
      if (tt) {
        const parsed = parseStoredCache(tt);
        this.timetable = parsed.data as any;
        this.lastUpdated.timetable = parsed.timestamp;
      }
    } catch (e) {
      console.warn('Failed to load cache from AsyncStorage:', e);
    }
  },

  async setAttendance(data: any[]) {
    this.attendance = data;
    this.lastUpdated.attendance = Date.now();
    try {
      const valStr = JSON.stringify({ data, timestamp: this.lastUpdated.attendance });
      await AsyncStorage.setItem('cache_attendance', valStr);
    } catch (err) {
      console.warn('Failed to write attendance cache to AsyncStorage:', err);
    }
  },

  async setAttendanceHistory(data: any[]) {
    this.attendanceHistory = data;
    this.lastUpdated.attendanceHistory = Date.now();
    try {
      const valStr = JSON.stringify({ data, timestamp: this.lastUpdated.attendanceHistory });
      await AsyncStorage.setItem('cache_attendance_history', valStr);
    } catch (err) {
      console.warn('Failed to write attendance history cache to AsyncStorage:', err);
    }
  },

  async setResults(data: any[]) {
    this.results = data;
    this.lastUpdated.results = Date.now();
    try {
      const valStr = JSON.stringify({ data, timestamp: this.lastUpdated.results });
      await AsyncStorage.setItem('cache_results', valStr);
    } catch (err) {
      console.warn('Failed to write results cache to AsyncStorage:', err);
    }
  },

  async setAssignments(data: any[]) {
    this.assignments = data;
    this.lastUpdated.assignments = Date.now();
    try {
      const valStr = JSON.stringify({ data, timestamp: this.lastUpdated.assignments });
      await AsyncStorage.setItem('cache_assignments', valStr);
    } catch (err) {
      console.warn('Failed to write assignments cache to AsyncStorage:', err);
    }
  },

  async setSurveys(data: any[]) {
    this.surveys = data;
    this.lastUpdated.surveys = Date.now();
    try {
      const valStr = JSON.stringify({ data, timestamp: this.lastUpdated.surveys });
      await AsyncStorage.setItem('cache_surveys', valStr);
    } catch (err) {
      console.warn('Failed to write surveys cache to AsyncStorage:', err);
    }
  },

  async setTimetable(data: TimetableData) {
    this.timetable = data;
    this.lastUpdated.timetable = Date.now();
    try {
      const valStr = JSON.stringify({ data, timestamp: this.lastUpdated.timetable });
      await AsyncStorage.setItem('cache_timetable', valStr);
    } catch (err) {
      console.warn('Failed to write timetable cache to AsyncStorage:', err);
    }
  },

  /** Clear cache upon logging out */
  async clear() {
    this.attendance = null;
    this.attendanceHistory = null;
    this.results = null;
    this.assignments = null;
    this.surveys = null;
    this.timetable = null;
    this.lastUpdated = {
      attendance: 0,
      attendanceHistory: 0,
      results: 0,
      assignments: 0,
      surveys: 0,
      timetable: 0,
    };
    try {
      await AsyncStorage.removeItem('cache_attendance');
      await AsyncStorage.removeItem('cache_attendance_history');
      await AsyncStorage.removeItem('cache_results');
      await AsyncStorage.removeItem('cache_assignments');
      await AsyncStorage.removeItem('cache_surveys');
      await AsyncStorage.removeItem('cache_timetable');
    } catch (err) {
      console.warn('Failed to clear AsyncStorage caches:', err);
    }
  }
};

/** Helper to parse AsyncStorage cache entries while preserving compatibility with legacy plain JSON arrays */
function parseStoredCache(str: string): { data: any[] | null; timestamp: number } {
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'timestamp' in parsed) {
      return { data: parsed.data, timestamp: parsed.timestamp };
    }
    if (Array.isArray(parsed)) {
      return { data: parsed, timestamp: 0 }; // Legacy cache: treat as expired
    }
  } catch (e) {
    console.warn('Failed to parse cache entry:', e);
  }
  return { data: null, timestamp: 0 };
}

