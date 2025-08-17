// config/api.js
import Constants from "expo-constants";

// Pick dev or prod based on environment
const { apiUrlDev, apiUrlProd } = Constants.expoConfig.extra;

const API_URL = __DEV__ ? apiUrlDev : apiUrlProd;

export default API_URL;
