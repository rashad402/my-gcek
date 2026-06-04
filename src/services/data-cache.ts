import * as SecureStore from 'expo-secure-store';

export const dataCache = {
  attendance: null as any[] | null,
  results: null as any[] | null,
  assignments: null as any[] | null,
  surveys: null as any[] | null,

  /** Load all caches from SecureStore during app startup */
  async loadFromStorage() {
    try {
      const att = await SecureStore.getItemAsync('cache_attendance');
      if (att) this.attendance = JSON.parse(att);
      
      const res = await SecureStore.getItemAsync('cache_results');
      if (res) this.results = JSON.parse(res);
      
      const ass = await SecureStore.getItemAsync('cache_assignments');
      if (ass) this.assignments = JSON.parse(ass);
      
      const surv = await SecureStore.getItemAsync('cache_surveys');
      if (surv) this.surveys = JSON.parse(surv);
    } catch (e) {
      console.warn('Failed to load cache from storage:', e);
    }
  },

  async setAttendance(data: any[]) {
    this.attendance = data;
    try {
      await SecureStore.setItemAsync('cache_attendance', JSON.stringify(data));
    } catch {}
  },

  async setResults(data: any[]) {
    this.results = data;
    try {
      await SecureStore.setItemAsync('cache_results', JSON.stringify(data));
    } catch {}
  },

  async setAssignments(data: any[]) {
    this.assignments = data;
    try {
      await SecureStore.setItemAsync('cache_assignments', JSON.stringify(data));
    } catch {}
  },

  async setSurveys(data: any[]) {
    this.surveys = data;
    try {
      await SecureStore.setItemAsync('cache_surveys', JSON.stringify(data));
    } catch {}
  },

  /** Clear cache upon logging out */
  async clear() {
    this.attendance = null;
    this.results = null;
    this.assignments = null;
    this.surveys = null;
    try {
      await SecureStore.deleteItemAsync('cache_attendance');
      await SecureStore.deleteItemAsync('cache_results');
      await SecureStore.deleteItemAsync('cache_assignments');
      await SecureStore.deleteItemAsync('cache_surveys');
    } catch {}
  }
};
