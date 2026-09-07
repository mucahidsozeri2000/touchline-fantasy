import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useApp } from "../store/AppContext";
import { colors } from "../theme";
import { RootStackParamList } from "./types";

import LoginScreen from "../screens/LoginScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import TabNavigator from "./TabNavigator";
import LeagueSetupScreen from "../screens/LeagueSetupScreen";
import LiveAuctionScreen from "../screens/LiveAuctionScreen";
import DraftFeedScreen from "../screens/DraftFeedScreen";
import ReauctionScreen from "../screens/ReauctionScreen";
import ExposureRiskScreen from "../screens/ExposureRiskScreen";
import PredictionsScreen from "../screens/PredictionsScreen";
import HeadToHeadScreen from "../screens/HeadToHeadScreen";
import LeagueChatScreen from "../screens/LeagueChatScreen";
import RulesScreen from "../screens/RulesScreen";
import MatchResultsScreen from "../screens/MatchResultsScreen";
import MatchdayLiveScreen from "../screens/MatchdayLiveScreen";
import LeaguePassScreen from "../screens/LeaguePassScreen";
import ManagerProfileScreen from "../screens/ManagerProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { booting, manager, needsOnboarding } = useApp();

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={!manager ? "Login" : needsOnboarding ? "Onboarding" : "Main"}
      >
        {!manager ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="LeagueSetup" component={LeagueSetupScreen} />
            <Stack.Screen name="LiveAuction" component={LiveAuctionScreen} />
            <Stack.Screen name="DraftFeed" component={DraftFeedScreen} />
            <Stack.Screen name="Reauction" component={ReauctionScreen} />
            <Stack.Screen name="ExposureRisk" component={ExposureRiskScreen} />
            <Stack.Screen name="Predictions" component={PredictionsScreen} />
            <Stack.Screen name="HeadToHead" component={HeadToHeadScreen} />
            <Stack.Screen name="LeagueChat" component={LeagueChatScreen} />
            <Stack.Screen name="Rules" component={RulesScreen} />
            <Stack.Screen name="MatchResults" component={MatchResultsScreen} />
            <Stack.Screen name="MatchdayLive" component={MatchdayLiveScreen} />
            <Stack.Screen name="LeaguePass" component={LeaguePassScreen} />
            <Stack.Screen name="ManagerProfile" component={ManagerProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
