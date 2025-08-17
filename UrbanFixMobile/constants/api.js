import Constants from 'expo-constants';

// Centralized API base URL for the mobile app.
// Priority:
// 1) app.json → expo.expoConfig.extra.apiUrl
// 2) EXPO_PUBLIC_API_URL env var
// 3) Fallback (current hardcoded LAN URL)
const FALLBACK_API_BASE_URL = 'http://localhost:5000';

// Determine API base URL with proper fallbacks
let API_BASE_URL;

try {
  const expoConfig = Constants?.expoConfig || Constants?.manifest;
  const extraConfig = expoConfig?.extra;
  
  if (extraConfig && (extraConfig.apiUrlDev || extraConfig.apiUrlProd)) {
    API_BASE_URL = __DEV__ ? extraConfig.apiUrlDev : extraConfig.apiUrlProd;
  } else {
    API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_BASE_URL;
  }
} catch (error) {
  console.warn('Error accessing Expo config, using fallback API URL:', error);
  API_BASE_URL = FALLBACK_API_BASE_URL;
}

// Ensure we never have undefined URL
if (!API_BASE_URL) {
  API_BASE_URL = FALLBACK_API_BASE_URL;
}

// Debug log to see what URL is being used
console.log('[API Config] Using API_BASE_URL:', API_BASE_URL);

export { API_BASE_URL };

export const apiUrl = (path) => {
  if (!path) return API_BASE_URL;
  const fullUrl = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  console.log('[API Config] Generated URL:', fullUrl);
  return fullUrl;
};

export default API_BASE_URL;
