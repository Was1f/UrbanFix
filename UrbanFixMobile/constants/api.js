import Constants from 'expo-constants';
import sharedConfig from '../config.js';

// Get API URL with fallback priority:
// 1. Environment variable (for CI/CD or production)
// 2. Expo extra config (from app.config.js)
// 3. Shared config file (default development)
function getApiBaseUrl() {
  try {
    // Check environment variable first
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }

    // Check Expo config
    const expoConfig = Constants?.expoConfig || Constants?.manifest;
    const extraConfig = expoConfig?.extra;
    
    if (extraConfig && (extraConfig.apiUrlDev || extraConfig.apiUrlProd)) {
      return __DEV__ ? extraConfig.apiUrlDev : extraConfig.apiUrlProd;
    }

    // Fall back to shared config
    return sharedConfig.API_BASE_URL;
  } catch (error) {
    console.warn('Error accessing config, using shared config fallback:', error);
    return sharedConfig.API_BASE_URL;
  }
}

const API_BASE_URL = getApiBaseUrl();

// Debug log to see what URL is being used
console.log('[API Config] Using API_BASE_URL:', API_BASE_URL);

export { API_BASE_URL };

export const apiUrl = (path) => {
  if (!path) return API_BASE_URL;
  const fullUrl = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return fullUrl;
};

export default API_BASE_URL;
