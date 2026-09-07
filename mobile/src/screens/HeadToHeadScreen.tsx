import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Screen, NavBar, H, Body, Micro, Tag, Card, HR, Table, EmptyState } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { Swords } from "lucide-react-native";

const GAMEWEEK = 6;

type Scoreboard = {
  myScore: number;
  oppScore: number;
  opponentTeam: string;
  opponentCoach: string;
  leading: boolean;
  margin: number;
};
type Differential = { side: "me" | "opp"; name: string; mine: boolean; pts: number };
type TableRow = { manager: string; w: number; d: number; l: number; pts: number; me?: boolean };
type NextFixture = { gameweek: number; opponent: string };

export default function HeadToHeadScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();

  const h2hQ = useQuery({
    queryKey: ["h2h", leagueId, GAMEWEEK],
    queryFn: () => api.h2h(leagueId!, GAMEWEEK),
    enabled: !!leagueId,
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("headToHeadTitle")} onBack={() => navigation.goBack()} />
        <EmptyState icon={<Swords size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const data = h2hQ.data as
    | { scoreboard: Scoreboard | null; differentials: Differential[]; table: TableRow[]; nextFixtures: NextFixture[] }
    | undefined;

  return (
    <Screen>
      <NavBar title={t("headToHeadTitle")} onBack={() => navigation.goBack()} right={<Tag label={`GW ${GAMEWEEK}`} variant="outline" />} />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        {data?.scoreboard ? (
          <ScoreboardCard scoreboard={data.scoreboard} />
        ) : (
          <EmptyState icon={<Swords size={28} color={colors.textMuted} />} text={t("noOpponentThisWeek")} />
        )}

        <HR />

        <View style={{ gap: space[3] }}>
          <H level={5}>{t("differentials")}</H>
          {!data || data.differentials.length === 0 ? (
            <Body muted>{t("noDifferentials")}</Body>
          ) : (
            data.differentials.map((d, i) => <DifferentialRow key={`${d.side}-${d.name}-${i}`} diff={d} />)
          )}
        </View>

        <HR />

        <View style={{ gap: space[3] }}>
          <H level={5}>{t("h2hTable")}</H>
          {data && data.table.length > 0 ? (
            <Table
              columns={[
                { key: "manager", label: t("manager"), flex: 2 },
                { key: "w", label: "W", align: "right" },
                { key: "d", label: "D", align: "right" },
                { key: "l", label: "L", align: "right" },
                { key: "pts", label: "Pts", align: "right" },
              ]}
              rows={data.table.map((r) => ({ ...r, highlight: r.me }))}
              rowKey={(r) => r.manager}
            />
          ) : (
            <Body muted>{t("noPredictionOptions")}</Body>
          )}
        </View>

        <HR />

        <View style={{ gap: space[3] }}>
          <H level={5}>{t("nextFixtures")}</H>
          {!data || data.nextFixtures.length === 0 ? (
            <Body muted>{t("noPredictionOptions")}</Body>
          ) : (
            data.nextFixtures.map((f) => (
              <View key={f.gameweek} style={styles.fixtureRow}>
                <Micro>{`GW ${f.gameweek}`}</Micro>
                <Body>{f.opponent}</Body>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ScoreboardCard({ scoreboard }: { scoreboard: Scoreboard }) {
  const { t } = useTranslation();
  const total = scoreboard.myScore + scoreboard.oppScore;
  const myShare = total > 0 ? (scoreboard.myScore / total) * 100 : 50;
  const statusKey = scoreboard.leading ? "leadingBy" : "trailingBy";

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Micro>{t("you")}</Micro>
          <H level={1} style={{ marginTop: 4 }}>{scoreboard.myScore}</H>
        </View>
        <View style={styles.divider} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Micro>{scoreboard.opponentTeam}</Micro>
          <H level={1} style={{ marginTop: 4 }}>{scoreboard.oppScore}</H>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, myShare))}%` }]} />
      </View>

      <Body muted style={{ textAlign: "center" }}>
        {t(statusKey, { opponent: scoreboard.opponentTeam, n: scoreboard.margin })}
      </Body>
    </Card>
  );
}

function DifferentialRow({ diff }: { diff: Differential }) {
  const { t } = useTranslation();
  const isMine = diff.side === "me";
  return (
    <View style={styles.diffRow}>
      <View style={{ flex: 1 }}>
        <Body>{diff.name}</Body>
      </View>
      <Tag label={isMine ? t("you") : t("opponent")} variant={isMine ? "accent" : "neutral"} />
      <Micro style={{ minWidth: 40, textAlign: "right" }}>{diff.pts >= 0 ? "+" : ""}{diff.pts} {t("ptsShort")}</Micro>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { width: 2, alignSelf: "stretch", backgroundColor: colors.divider, marginHorizontal: space[3] },
  barTrack: { height: 8, backgroundColor: colors.neutral200, width: "100%", marginTop: space[3] },
  barFill: { height: 8, backgroundColor: colors.accent },
  fixtureRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.divider },
  diffRow: { flexDirection: "row", alignItems: "center", gap: space[2], paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.divider },
});
