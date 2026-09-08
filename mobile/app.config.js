// Layers build-time-conditional native config over the static app.json.
//
// Android 9+ blocks cleartext HTTP by default, so a test build pointed at a
// LAN address like http://192.168.1.42:4000 fails with nothing useful in the
// UI. Development and preview builds opt into cleartext so you can test
// against a laptop on the same Wi-Fi; production never does — it must talk to
// a deployed API over HTTPS.
module.exports = ({ config }) => {
  const allowCleartext = process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT === "1";

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "expo-build-properties",
        {
          android: { usesCleartextTraffic: allowCleartext },
        },
      ],
    ],
  };
};
