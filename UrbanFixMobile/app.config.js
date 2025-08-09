// Use a dynamic app config to avoid hardcoded API URLs in app.json
// Reads EXPO_PUBLIC_API_URL and exposes it in extra.apiUrl

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  };
};


