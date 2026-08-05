import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.liberago.app",
  appName: "LiberaGo",
  webDir: "dist",
  server: {
    url: "https://liberago.vercel.app",
    androidScheme: "https",
  },
};

export default config;
