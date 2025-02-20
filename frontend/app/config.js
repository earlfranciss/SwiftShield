import Constants from "expo-constants";

const getBaseURL = () => {
  const host = Constants.expoConfig?.hostUri?.split(":")[0]; // Get laptop's local IP
  console.log("Extracted Host:", host);

  return host ? `http://${host}:5000` : "http://localhost:5000"; // Fallback to localhost if undefined
};

const config = {
  BASE_URL: getBaseURL(),
};

export default config;
