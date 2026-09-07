import React from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Screen, NavBar, Body, Micro, HR, Table } from "../components/ui";
import { space } from "../theme";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Rules = {
  transferWindow: string;
  auction: string;
  ownership: string;
  squadRules: {
    squadSize: number;
    startingXi: number;
    benchSize: number;
    gkRange: [number, number];
    defRange: [number, number];
    midRange: [number, number];
    fwdRange: [number, number];
    maxPerClub: number;
  };
  scoring: {
    goal: { GK: number; DEF: number; MID: number; FWD: number };
    cleanSheet: { GK: number; DEF: number; MID: number; FWD: number };
    assist: number;
    yellow: number;
    red: number;
    captainMultiplier: number;
  };
};

export default function RulesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: () => api.rules() as Promise<Rules> });
  const r = rulesQ.data;

  return (
    <Screen>
      <NavBar title={t("rulesScoring")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <Section title={t("transferWindowRule")}>
          <Body muted>{r?.transferWindow ?? "…"}</Body>
        </Section>

        <HR />

        <Section title={t("auctionRule")}>
          <Body muted>{r?.auction ?? "…"}</Body>
        </Section>

        <HR />

        <Section title={t("ownershipRule")}>
          <Body muted>{r?.ownership ?? "…"}</Body>
        </Section>

        <HR />

        <Section title={t("squadRulesTitle")}>
          {r ? (
            <View style={{ gap: 4 }}>
              <Body muted>• {r.squadRules.squadSize}-player squad</Body>
              <Body muted>
                • 1 GK / {r.squadRules.defRange[0]}-{r.squadRules.defRange[1]} DEF / {r.squadRules.midRange[0]}-{r.squadRules.midRange[1]} MID / {r.squadRules.fwdRange[0]}-{r.squadRules.fwdRange[1]} FWD starting XI
              </Body>
              <Body muted>• {r.squadRules.benchSize}-player bench</Body>
              <Body muted>• max {r.squadRules.maxPerClub} per club</Body>
            </View>
          ) : (
            <Body muted>…</Body>
          )}
        </Section>

        <HR />

        <Section title={t("scoringTable")}>
          {r ? (
            <Table
              columns={[
                { key: "label", label: "", flex: 2 },
                { key: "value", label: "", flex: 1, align: "right" },
              ]}
              rowKey={(row) => row.label}
              rows={[
                { label: "Goal — GK", value: r.scoring.goal.GK },
                { label: "Goal — DEF", value: r.scoring.goal.DEF },
                { label: "Goal — MID", value: r.scoring.goal.MID },
                { label: "Goal — FWD", value: r.scoring.goal.FWD },
                { label: "Assist", value: r.scoring.assist },
                { label: "Clean Sheet — GK", value: r.scoring.cleanSheet.GK },
                { label: "Clean Sheet — DEF", value: r.scoring.cleanSheet.DEF },
                { label: "Clean Sheet — MID", value: r.scoring.cleanSheet.MID },
                { label: "Clean Sheet — FWD", value: r.scoring.cleanSheet.FWD },
                { label: "Yellow Card", value: r.scoring.yellow },
                { label: "Red Card", value: r.scoring.red },
                { label: "Captain", value: `×${r.scoring.captainMultiplier}` },
              ]}
            />
          ) : (
            <Body muted>…</Body>
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space[2] }}>
      <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{title}</Micro>
      {children}
    </View>
  );
}
