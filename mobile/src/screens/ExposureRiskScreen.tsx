import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Screen, NavBar, H, Body, Micro, Tag, Card, HR, EmptyState } from "../components/ui";
import { colors, space, risk, clubColor } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { PieChart } from "lucide-react-native";

type RiskLevel = "low" | "medium" | "high";

type ClubExposure = {
  club: string;
  clubColor?: string;
  count: number;
  pts: number;
  proportion: number;
  tie: string;
  risk: RiskLevel;
};

type TimelineEntry = {
  round: string;
  note: string;
  state: "done" | "live" | "next" | "future";
};

export default function ExposureRiskScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();

  const riskQ = useQuery({
    queryKey: ["risk", leagueId],
    queryFn: () => api.risk(leagueId!),
    enabled: !!leagueId,
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("exposureRisk")} onBack={() => navigation.goBack()} />
        <EmptyState icon={<PieChart size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const data = riskQ.data as
    | { atRiskPct: number; biggestContributor: string | null; clubs: ClubExposure[]; timeline: TimelineEntry[] }
    | undefined;

  const currentRound = data?.timeline.find((e) => e.state === "live") ?? data?.timeline.find((e) => e.state === "next");

  return (
    <Screen>
      <NavBar
        title={t("exposureRisk")}
        onBack={() => navigation.goBack()}
        right={currentRound ? <Tag label={currentRound.round} variant="outline" /> : undefined}
      />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <View>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{t("pointsAtRisk")}</Micro>
          <H level={1} style={{ marginTop: 4 }}>{data ? `${data.atRiskPct}%` : "—"}</H>
          {data?.biggestContributor ? (
            <Body muted style={{ marginTop: space[1] }}>{data.biggestContributor}</Body>
          ) : null}
        </View>

        <HR />

        <View style={{ gap: space[3] }}>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{t("clubExposure")}</Micro>
          {!data || data.clubs.length === 0 ? (
            <Body muted>{t("noClubExposure")}</Body>
          ) : (
            data.clubs.map((c) => <ClubExposureCard key={c.club} club={c} />)
          )}
        </View>

        <HR />

        <View style={{ gap: space[3] }}>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{t("roundTimeline")}</Micro>
          {data?.timeline.map((entry, i) => <TimelineRow key={entry.round} entry={entry} last={i === data.timeline.length - 1} />)}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ClubExposureCard({ club }: { club: ClubExposure }) {
  const { t } = useTranslation();
  const riskColor = risk[club.risk];
  const label = club.risk === "low" ? t("riskLow") : club.risk === "medium" ? t("riskMedium") : t("riskHigh");
  const dot = club.clubColor ?? clubColor(club.club);
  return (
    <Card style={club.risk === "high" ? { borderWidth: 1, borderColor: risk.high } : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
          <View style={{ width: 10, height: 10, backgroundColor: dot }} />
          <H level={5}>{club.club}</H>
        </View>
        <View style={[styles.riskTag, { borderColor: riskColor }]}>
          <Micro style={{ color: riskColor }}>{label}</Micro>
        </View>
      </View>

      <Body muted>
        {club.count} {club.count === 1 ? t("playerSingular") : t("playerPlural")} · {club.pts} {t("ptsShort")}
      </Body>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, club.proportion))}%`, backgroundColor: riskColor }]} />
      </View>

      <Micro>{club.tie}</Micro>
    </Card>
  );
}

function TimelineRow({ entry, last }: { entry: TimelineEntry; last?: boolean }) {
  const dotStyle = (() => {
    switch (entry.state) {
      case "done":
        return { backgroundColor: colors.neutral500, borderWidth: 0 };
      case "live":
        return { backgroundColor: colors.accent, borderWidth: 0 };
      case "next":
        return { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.accent };
      case "future":
      default:
        return { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.neutral400 };
    }
  })();
  return (
    <View style={[styles.timelineRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <View style={[styles.timelineDot, dotStyle]} />
      <View style={{ flex: 1 }}>
        <H level={6}>{entry.round}</H>
        <Micro style={{ marginTop: 2 }}>{entry.note}</Micro>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  riskTag: { borderWidth: 1, paddingVertical: 3, paddingHorizontal: 8 },
  barTrack: { height: 6, backgroundColor: colors.neutral200, width: "100%" },
  barFill: { height: 6 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: space[3], paddingVertical: space[3] },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
});
