import Constants from "expo-constants";

const getBaseURL = () => {
  let host;

  // Get host from Expo manifest (more reliable)
  if (Constants.expoGo?.debuggerHost) {
    host = Constants.expoGo.debuggerHost.split(":")[0]; // Extract the IP only
  } else if (Constants.expoConfig?.hostUri) {
    host = Constants.expoConfig.hostUri.split(":")[0]; // Fallback if available
  }

  console.log("Extracted Host IP:", host);

  return host ? `http://${host}:5000` : "http://localhost:5000"; // Fallback for Web
};

const config = {
  BASE_URL: getBaseURL(),
};

export default config;

