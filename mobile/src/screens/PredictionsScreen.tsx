import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, NavBar, H, Body, Micro, Tag, StatRow, Card, HR, Button, Table, EmptyState } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { Target } from "lucide-react-native";

const GAMEWEEK = 6;

type TopScorerOption = { id: string; manager: string; formHint: string };
type Fixture = { id: string; home: string; away: string };
type Pick = "home" | "draw" | "away";

export default function PredictionsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();
  const qc = useQueryClient();

  const predictionsQ = useQuery({
    queryKey: ["predictions", leagueId, GAMEWEEK],
    queryFn: () => api.predictions(leagueId!, GAMEWEEK),
    enabled: !!leagueId,
  });

  const [topScorer, setTopScorer] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>({});

  useEffect(() => {
    if (predictionsQ.data?.myPrediction) {
      setTopScorer(predictionsQ.data.myPrediction.topScorerPick ?? null);
      const seeded: Record<string, Pick> = {};
      for (const p of predictionsQ.data.myPrediction.picks ?? []) seeded[p.fixtureId] = p.pick;
      setPicks(seeded);
    }
  }, [predictionsQ.data?.myPrediction]);

  const submitMut = useMutation({
    mutationFn: () => {
      const picksArray = Object.entries(picks).map(([fixtureId, pick]) => ({ fixtureId, pick }));
      return api.submitPrediction(leagueId!, GAMEWEEK, topScorer ?? "", picksArray);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions", leagueId, GAMEWEEK] }),
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("predictionsTitle")} onBack={() => navigation.goBack()} />
        <EmptyState icon={<Target size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const data = predictionsQ.data as
    | {
        stats: { accuracy: number; streak: number; bonus: number };
        topScorerOptions: TopScorerOption[];
        fixtures: Fixture[];
        myPrediction: { topScorerPick: string; picks: { fixtureId: string; pick: Pick }[] } | null;
        table: { manager: string; hit: number; miss: number; bonus: number; me?: boolean }[];
      }
    | undefined;

  const canSubmit = !!topScorer && !!data && Object.keys(picks).length === data.fixtures.length;

  return (
    <Screen>
      <NavBar title={t("predictionsTitle")} onBack={() => navigation.goBack()} right={<Tag label={`GW ${GAMEWEEK}`} variant="outline" />} />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <StatRow
          items={[
            { label: t("accuracy"), value: data ? `${data.stats.accuracy}%` : "—" },
            { label: t("streak"), value: data ? data.stats.streak : "—" },
            { label: t("bonusPoints"), value: data ? data.stats.bonus : "—" },
          ]}
        />

        <View style={{ gap: space[3] }}>
          <H level={5}>{t("topScorerThisWeek")}</H>
          {!data || data.topScorerOptions.length === 0 ? (
            <Body muted>{t("noPredictionOptions")}</Body>
          ) : (
            <View style={{ gap: 1, backgroundColor: colors.divider }}>
              {data.topScorerOptions.map((opt) => (
                <TopScorerRow key={opt.id} option={opt} selected={topScorer === opt.id} onPress={() => setTopScorer(opt.id)} />
              ))}
            </View>
          )}
        </View>

        <HR />

        <View style={{ gap: space[3] }}>
          <H level={5}>{t("scoreCalls")}</H>
          {!data || data.fixtures.length === 0 ? (
            <Body muted>{t("noPredictionOptions")}</Body>
          ) : (
            data.fixtures.map((fx) => (
              <FixtureRow
                key={fx.id}
                fixture={fx}
                value={picks[fx.id]}
                onChange={(pick) => setPicks((prev) => ({ ...prev, [fx.id]: pick }))}
              />
            ))
          )}
        </View>

        <Button title={t("submitPredictions")} onPress={() => submitMut.mutate()} disabled={!canSubmit || submitMut.isPending} block />
        {submitMut.isSuccess ? <Micro style={{ color: colors.accent }}>{t("predictionsSaved")}</Micro> : null}

        <HR />

        <View style={{ gap: space[3] }}>
          <H level={5}>{t("predictionTable")}</H>
          {data && data.table.length > 0 ? (
            <Table
              columns={[
                { key: "manager", label: t("manager"), flex: 2 },
                { key: "hit", label: t("hit"), align: "right" },
                { key: "miss", label: t("miss"), align: "right" },
                { key: "bonus", label: t("bonus"), align: "right" },
              ]}
              rows={data.table.map((r) => ({ ...r, highlight: r.me }))}
              rowKey={(r) => r.manager}
            />
          ) : (
            <Body muted>{t("noPredictionOptions")}</Body>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function TopScorerRow({ option, selected, onPress }: { option: TopScorerOption; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.optionRow, selected && { backgroundColor: colors.accent100 }]} onPress={onPress}>
      <View style={[styles.radioOuter, selected && { borderColor: colors.accent }]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Body>{option.manager}</Body>
        <Micro>{option.formHint}</Micro>
      </View>
    </Pressable>
  );
}

function FixtureRow({ fixture, value, onChange }: { fixture: Fixture; value?: Pick; onChange: (p: Pick) => void }) {
  const { t } = useTranslation();
  const options: { label: string; value: Pick }[] = [
    { label: t("home"), value: "home" },
    { label: t("draw"), value: "draw" },
    { label: t("away"), value: "away" },
  ];
  return (
    <Card>
      <Body style={{ fontWeight: "700" }}>
        {fixture.home} <Micro>vs</Micro> {fixture.away}
      </Body>
      <View style={styles.seg}>
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.segOpt, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.divider }, active && { backgroundColor: colors.accent }]}
            >
              <Micro style={{ color: active ? colors.bg : colors.text }}>{opt.label}</Micro>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  optionRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[3], paddingHorizontal: space[3], backgroundColor: colors.bg },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.divider, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.accent },
  seg: { flexDirection: "row", borderWidth: 1, borderColor: colors.divider, overflow: "hidden", marginTop: space[2] },
  segOpt: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
});
