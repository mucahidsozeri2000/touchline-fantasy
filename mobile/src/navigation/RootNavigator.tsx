import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { RootStackParamList, TabParamList } from "./types";
import { useAuth } from "../AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { SquadScreen } from "../screens/SquadScreen";
import { TransfersScreen } from "../screens/TransfersScreen";
import { LeaguesScreen } from "../screens/LeaguesScreen";
import { RulesScreen } from "../screens/RulesScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { DraftFeedScreen } from "../screens/DraftFeedScreen";
import { HomeIcon, LeaguesTabIcon, SquadTabIcon, TransfersTabIcon } from "../components/Icons";
import { colors, fonts } from "../theme";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const activeColor = colors.accent700;
  const inactiveColor = colors.neutral600;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: { borderTopWidth: 2, borderTopColor: colors.divider, backgroundColor: colors.bg, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.heading, fontSize: 9, letterSpacing: 0, textTransform: "uppercase" },
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Home", tabBarIcon: ({ color }) => <HomeIcon size={20} color={color} /> }} />
      <Tab.Screen name="Squad" component={SquadScreen} options={{ tabBarLabel: "Squad", tabBarIcon: ({ color }) => <SquadTabIcon size={20} color={color} /> }} />
      <Tab.Screen
        name="Transfers"
        component={TransfersScreen}
        options={{ tabBarLabel: "Transfers", tabBarIcon: ({ color }) => <TransfersTabIcon size={20} color={color} /> }}
      />
      <Tab.Screen name="Leagues" component={LeaguesScreen} options={{ tabBarLabel: "Leagues", tabBarIcon: ({ color }) => <LeaguesTabIcon size={20} color={color} /> }} />
      <Tab.Screen name="Rules" component={RulesScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Results" component={ResultsScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="DraftFeed" component={DraftFeedScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { booting, token } = useAuth();
  if (booting) return null;

  return (
    <NavigationContainer>
      {/* All three routes stay registered regardless of auth state: a fresh
          registration needs Login -> Onboarding -> MainTabs to navigate
          forward without screens disappearing mid-flow, while a returning
          user with a stored token just starts on MainTabs. */}
      <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={token ? "MainTabs" : "Login"}>
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
