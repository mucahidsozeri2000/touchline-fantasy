import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Archivo_400Regular, Archivo_800ExtraBold } from "@expo-google-fonts/archivo";
import { View } from "react-native";
import { AuthProvider } from "./src/AuthContext";
import { AppStateProvider } from "./src/AppState";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme";

export default function App() {
  const [fontsLoaded] = useFonts({ Archivo_400Regular, Archivo_800ExtraBold });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppStateProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AppStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
