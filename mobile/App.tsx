import "./src/i18n";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from "@expo-google-fonts/archivo";
import { View, ActivityIndicator } from "react-native";
import { AppProvider } from "./src/store/AppContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });

// The static-preview Artifact build is a single self-contained HTML file with
// no reachable relative asset URLs, so expo-font's normal (fetch-a-TTF-file)
// loading can never resolve there — Archivo is instead declared via inline
// @font-face/data-URI CSS injected at publish time, so this gate is skipped.
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "1";

export default function App() {
  const [fontsLoaded] = useFonts({ Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold });

  if (!fontsLoaded && !DEMO_MODE) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
