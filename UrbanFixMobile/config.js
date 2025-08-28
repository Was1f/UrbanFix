// Shared configuration for API endpoints
// This file is the SINGLE SOURCE OF TRUTH for API configuration
// Used by both app.config.js and constants/api.js

// TO UPDATE THE API URL:
// 1. Run "ipconfig" command in terminal to get your computer's IP
// 2. Update the API_IP value below
// 3. Restart Expo development server with: npx expo start --clear

const API_IP = '192.168.0.130';
const API_PORT = '5000';
const API_BASE_URL = `http://${API_IP}:${API_PORT}`;

export default {
  API_IP,
  API_PORT,
  API_BASE_URL,
  // For app.json extra config
  apiUrlDev: API_BASE_URL,
  apiUrlProd: API_BASE_URL
};
