import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Screen, NavBar, Body, Micro, Avatar, HR } from "../components/ui";
import { colors, font, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

function initialsFor(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function relativeTime(iso: string, t: (k: string, opts?: any) => string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return t("justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("minutesShort", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("hoursShort", { n: hr });
  const day = Math.floor(hr / 24);
  return t("daysShort", { n: day });
}

export default function DraftFeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();

  const feedQ = useQuery({
    queryKey: ["draftFeed", leagueId],
    queryFn: () => api.draftFeed(leagueId!),
    enabled: !!leagueId,
    refetchInterval: 5000,
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("draftFeed")} onBack={() => navigation.goBack()} />
        <View style={{ padding: space[4] }}>
          <Body muted>{t("notInLeagueYet")}</Body>
        </View>
      </Screen>
    );
  }

  const items: any[] = feedQ.data ?? [];

  return (
    <Screen>
      <NavBar title={t("draftFeed")} onBack={() => navigation.goBack()} />
      <View style={{ padding: space[4] }}>
        <Body muted>{t("everyPlayerOnce")}</Body>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item, i) => `${item.player}-${item.time}-${i}`}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[8] }}
        ItemSeparatorComponent={() => <HR style={{ marginVertical: space[2] }} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar initials={initialsFor(item.manager)} size={36} />
            <View style={{ flex: 1 }}>
              <Body>
                <Text style={{ fontFamily: font.headingFamily, fontWeight: "800", color: item.me ? colors.accent : colors.text }}>
                  {item.manager}
                </Text>
                {" "}{t("draftedMiddle")}{" "}
                <Text style={{ fontWeight: "700" }}>{item.player}</Text>
              </Body>
              <Micro>{item.position} · {item.club}</Micro>
            </View>
            <Micro>{relativeTime(item.time, t)}</Micro>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
});
