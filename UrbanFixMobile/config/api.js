import Constants from "expo-constants";

const { apiUrlDev, apiUrlProd } = Constants.expoConfig.extra;

// Pick dev or prod automatically
const API_URL = __DEV__ ? apiUrlDev : apiUrlProd;

export default API_URL;
