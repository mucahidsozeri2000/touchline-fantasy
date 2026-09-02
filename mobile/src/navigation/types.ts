import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabParamList = {
  Home: undefined;
  Squad: undefined;
  Transfers: undefined;
  Leagues: undefined;
  Rules: undefined;
  Results: undefined;
  DraftFeed: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
};
