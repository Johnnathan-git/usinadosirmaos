import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.usinadosirmaos.app",
  appName: "Usina dos Irmãos",
  webDir: "www",
  server: {
    url: "https://usinadosirmaos.lovable.app",
    cleartext: false,
  },
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#ffffff",
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
    },
  },
};

export default config;
