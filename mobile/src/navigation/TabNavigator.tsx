import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home as HomeIcon, Shield, ArrowLeftRight, Trophy } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors, font } from "../theme";
import HomeScreen from "../screens/HomeScreen";
import SquadScreen from "../screens/SquadScreen";
import TransfersScreen from "../screens/TransfersScreen";
import LeaguesScreen from "../screens/LeaguesScreen";
import { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<string, any> = { Home: HomeIcon, Squad: Shield, Transfers: ArrowLeftRight, Leagues: Trophy };
const LABEL_KEY: Record<string, string> = { Home: "tabHome", Squad: "tabSquad", Transfers: "tabTransfers", Leagues: "tabLeagues" };

function CustomTabBar({ state, navigation }: any) {
  const { t } = useTranslation();
  // Android draws edge-to-edge, so without this the gesture pill sits on top
  // of the tab labels.
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const Icon = ICONS[route.name];
        const color = focused ? colors.accent700 : colors.neutral600;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.tabItem}
          >
            <Icon size={20} color={color} strokeWidth={2} />
            <Text style={[styles.tabLabel, { color }]}>{t(LABEL_KEY[route.name])}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Squad" component={SquadScreen} />
      <Tab.Screen name="Transfers" component={TransfersScreen} />
      <Tab.Screen name="Leagues" component={LeaguesScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 2, borderTopColor: colors.divider, backgroundColor: colors.bg },
  tabItem: { flex: 1, alignItems: "center", gap: 4, paddingTop: 8, paddingBottom: 10 },
  tabLabel: { fontFamily: font.headingFamily, fontWeight: "800", fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" },
});
