// Use a dynamic app config to avoid hardcoded API URLs in app.json
// Reads from shared config file

import sharedConfig from './config.js';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      apiUrlDev: process.env.EXPO_PUBLIC_API_URL || sharedConfig.apiUrlDev,
      apiUrlProd: process.env.EXPO_PUBLIC_API_URL || sharedConfig.apiUrlProd,
    },
  };
};


