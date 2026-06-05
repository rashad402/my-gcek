import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const dataCache = {
  attendance: null as any[] | null,
  results: null as any[] | null,
  assignments: null as any[] | null,
  surveys: null as any[] | null,

  /** Load all caches from AsyncStorage during app startup */
  async loadFromStorage() {
    // 1. Proactively clear legacy SecureStore cache keys if they exist
    try {
      const legacyAtt = await SecureStore.getItemAsync('cache_attendance');
      if (legacyAtt) {
        console.log('[CACHE CLEANUP] Deleting legacy SecureStore cache_attendance');
        await SecureStore.deleteItemAsync('cache_attendance');
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
    } catch (err) {
      console.warn('Failed to clear legacy SecureStore caches:', err);
    }

    // 2. Load caches from AsyncStorage
    try {
      const att = await AsyncStorage.getItem('cache_attendance');
      if (att) this.attendance = JSON.parse(att);
      
      const res = await AsyncStorage.getItem('cache_results');
      if (res) this.results = JSON.parse(res);
      
      const ass = await AsyncStorage.getItem('cache_assignments');
      if (ass) this.assignments = JSON.parse(ass);
      
      const surv = await AsyncStorage.getItem('cache_surveys');
      if (surv) this.surveys = JSON.parse(surv);
    } catch (e) {
      console.warn('Failed to load cache from AsyncStorage:', e);
    }
  },

  async setAttendance(data: any[]) {
    this.attendance = data;
    try {
      const valStr = JSON.stringify(data);
      await AsyncStorage.setItem('cache_attendance', valStr);
    } catch (err) {
      console.warn('Failed to write attendance cache to AsyncStorage:', err);
    }
  },

  async setResults(data: any[]) {
    this.results = data;
    try {
      const valStr = JSON.stringify(data);
      await AsyncStorage.setItem('cache_results', valStr);
    } catch (err) {
      console.warn('Failed to write results cache to AsyncStorage:', err);
    }
  },

  async setAssignments(data: any[]) {
    this.assignments = data;
    try {
      const valStr = JSON.stringify(data);
      await AsyncStorage.setItem('cache_assignments', valStr);
    } catch (err) {
      console.warn('Failed to write assignments cache to AsyncStorage:', err);
    }
  },

  async setSurveys(data: any[]) {
    this.surveys = data;
    try {
      const valStr = JSON.stringify(data);
      await AsyncStorage.setItem('cache_surveys', valStr);
    } catch (err) {
      console.warn('Failed to write surveys cache to AsyncStorage:', err);
    }
  },

  /** Clear cache upon logging out */
  async clear() {
    this.attendance = null;
    this.results = null;
    this.assignments = null;
    this.surveys = null;
    try {
      await AsyncStorage.removeItem('cache_attendance');
      await AsyncStorage.removeItem('cache_results');
      await AsyncStorage.removeItem('cache_assignments');
      await AsyncStorage.removeItem('cache_surveys');
    } catch (err) {
      console.warn('Failed to clear AsyncStorage caches:', err);
    }
  }
};
