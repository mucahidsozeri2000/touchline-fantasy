import React from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react-native";
import { Screen, NavBar, H, Body, Micro, Tag, Card, EmptyState } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Result = { home: string; away: string; homeScore: number; awayScore: number; date: string; gameweek: number; yourPts: number };

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function MatchResultsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();

  const resultsQ = useQuery({
    queryKey: ["results", leagueId],
    queryFn: () => api.results(leagueId!) as Promise<Result[]>,
    enabled: !!leagueId,
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("matchResults")} onBack={() => navigation.goBack()} />
        <EmptyState icon={<Trophy size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const results = resultsQ.data ?? [];
  const gw = results[0]?.gameweek;

  return (
    <Screen>
      <NavBar
        title={t("matchResults")}
        onBack={() => navigation.goBack()}
        right={gw != null ? <Tag label={`${t("gameweek")} ${gw} · ${t("ft")}`} variant="outline" /> : undefined}
      />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[3] }}>
        {results.length === 0 ? (
          <EmptyState icon={<Trophy size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
        ) : (
          results.map((r, i) => <FixtureCard key={`${r.home}-${r.away}-${i}`} result={r} />)
        )}
      </ScrollView>
    </Screen>
  );
}

function FixtureCard({ result }: { result: Result }) {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Body style={{ flex: 1 }}>{result.home}</Body>
        <H level={5} style={{ marginHorizontal: space[2] }}>{result.homeScore} – {result.awayScore}</H>
        <Body style={{ flex: 1, textAlign: "right" }}>{result.away}</Body>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Micro>{formatDate(result.date)}</Micro>
        <Micro>{t("ptsFromSquad", { n: result.yourPts })}</Micro>
      </View>
    </Card>
  );
}
