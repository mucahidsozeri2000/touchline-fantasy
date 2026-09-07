import React from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { Screen, H, Body, Micro, Tag, Button, Table } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

function ordinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export default function LeaguesScreen() {
  const { t } = useTranslation();
  const { leagueId, leagueName } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const standingsQ = useQuery({ queryKey: ["standings", leagueId], queryFn: () => api.standings(leagueId!), enabled: !!leagueId });

  if (!leagueId) {
    return (
      <Screen>
        <View style={styles.nav}>
          <H level={4}>{t("brand")}</H>
        </View>
        <View style={{ padding: space[4], gap: space[4] }}>
          <Body muted>{t("notInLeagueYet")}</Body>
          <Button title={t("newLeagueRow")} onPress={() => navigation.navigate("LeagueSetup")} block />
        </View>
      </Screen>
    );
  }

  if (standingsQ.isLoading) {
    return (
      <Screen>
        <View style={styles.nav}>
          <H level={4}>{t("brand")}</H>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  const standings: any[] = standingsQ.data?.standings ?? [];
  const me = standings.find((s) => s.me);
  const trend: number = me?.trend ?? 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === 0 ? colors.textMuted : colors.accent700;

  const rows = standings.map((s) => ({
    rowId: s.managerId,
    pos: s.rank,
    manager: s.manager,
    gw: s.gw,
    total: s.total,
    highlight: s.me,
  }));

  return (
    <Screen>
      <View style={styles.nav}>
        <H level={4}>{t("brand")}</H>
        <Tag label={leagueName ?? ""} variant="outline" />
      </View>

      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <View style={styles.rankCard}>
          <View>
            <Micro>{t("yourRank")}</Micro>
            <H level={2} style={{ marginTop: 2 }}>{me ? ordinal(me.rank) : "—"}</H>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <TrendIcon size={16} color={trendColor} strokeWidth={2.5} />
            <Body style={{ color: trendColor, fontWeight: "800" as const }}>
              {t("trendThisGw", { delta: trend > 0 ? `+${trend}` : `${trend}` })}
            </Body>
          </View>
        </View>

        <Table
          columns={[
            { key: "pos", label: t("rank"), flex: 0.7 },
            { key: "manager", label: t("manager"), flex: 2 },
            { key: "gw", label: "GW", flex: 0.8, align: "right" },
            { key: "total", label: t("totalPoints"), flex: 1, align: "right" },
          ]}
          rows={rows}
          rowKey={(r) => r.rowId}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 2, borderBottomColor: colors.divider },
  rankCard: { padding: space[4], backgroundColor: colors.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
