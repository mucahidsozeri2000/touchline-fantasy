import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/types";
import { api } from "../api";
import type { RulesInfo } from "../api";
import { NavBar } from "../components/NavBar";
import { SectionHeading } from "../components/Section";
import { colors, fonts } from "../theme";

type Props = BottomTabScreenProps<TabParamList, "Rules">;

export function RulesScreen({ navigation }: Props) {
  const [rules, setRules] = useState<RulesInfo | null>(null);

  useEffect(() => {
    api.rules().then(setRules).catch(() => {});
  }, []);

  return (
    <View style={styles.screen}>
      <NavBar onBack={() => navigation.navigate("Home")} backTitle="RULES & SCORING" />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <SectionHeading title="Draft Window" />
          <Text style={styles.p}>
            Every real user manages one squad as Head Coach. Transfers open when the window opens and close at the published
            deadline. Any manager who has not confirmed transfers when the window closes is assigned an automatic squad from
            remaining budget.
          </Text>
        </View>
        <View>
          <SectionHeading title="Player Ownership" />
          <Text style={styles.p}>
            Each Champions League player can be drafted by only one manager per league. Once drafted, a player is locked and
            removed from the market for everyone else until the next transfer window.
          </Text>
        </View>
        {rules && (
          <View>
            <SectionHeading title="Squad Rules" />
            <View>
              <Row label="Squad size" value={`${rules.squadSize} players`} />
              <Row label="Starting XI" value={rules.startingXi} />
              <Row label="Bench" value={`${rules.bench} players`} />
              <Row label="Budget" value={`£${rules.budget.toFixed(1)}M`} />
              <Row label="Max per club" value={`${rules.maxPerClub} players`} last />
            </View>
          </View>
        )}
        {rules && (
          <View>
            <SectionHeading title="Scoring" />
            <View style={styles.table}>
              <View style={[styles.tr, styles.thead]}>
                <Text style={[styles.th, { flex: 1 }]}>Action</Text>
                <Text style={styles.th}>Points</Text>
              </View>
              {rules.scoring.map((row) => (
                <View style={styles.tr} key={row.action}>
                  <Text style={[styles.td, { flex: 1 }]}>{row.action}</Text>
                  <Text style={styles.td}>{row.points}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 18 },
  p: { fontSize: 13, lineHeight: 20, color: colors.text, fontFamily: fonts.body },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { fontSize: 13, color: colors.text, fontFamily: fonts.body },
  rowValue: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  table: { width: "100%" },
  tr: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  thead: { borderBottomWidth: 2 },
  th: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted60, fontFamily: fonts.body },
  td: { fontSize: 14, color: colors.text, fontFamily: fonts.body },
});
