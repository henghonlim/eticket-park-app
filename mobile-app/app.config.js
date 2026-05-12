import 'dotenv/config';

export default ({ config }) => {
  
  return {
    ...config, // 
    
    ios: {
      ...config.ios,
      bundleIdentifier: "com.ukm.tamanlaut",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    
    android: {
      ...config.android,
      package: "com.ukm.tamanlaut",
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    }
  };
};