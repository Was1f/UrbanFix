import Constants from 'expo-constants';

// Centralized API base URL for the mobile app.
// Priority:
// 1) app.json → expo.expoConfig.extra.apiUrl
// 2) EXPO_PUBLIC_API_URL env var
// 3) Fallback (current hardcoded LAN URL)
const FALLBACK_API_BASE_URL = 'http://192.168.10.115:5000';

export const API_BASE_URL =
  (Constants?.expoConfig?.extra && Constants.expoConfig.extra.apiUrl) ||
  process.env.EXPO_PUBLIC_API_URL ||
  FALLBACK_API_BASE_URL;

export const apiUrl = (path) => {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export default API_BASE_URL;
