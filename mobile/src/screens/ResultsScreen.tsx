import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/types";
import { api } from "../api";
import type { Fixture } from "../api";
import { NavBar } from "../components/NavBar";
import { Tag } from "../components/Tag";
import { colors, fonts } from "../theme";
import { formatFixtureDate } from "../format";

type Props = BottomTabScreenProps<TabParamList, "Results">;

export function ResultsScreen({ navigation }: Props) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.fixtures().then(setFixtures).catch(() => {});
    }, [])
  );

  return (
    <View style={styles.screen}>
      <NavBar onBack={() => navigation.navigate("Home")} backTitle="MATCH RESULTS" />
      <View style={styles.tagRow}>
        <Tag label="GAMEWEEK 3 · FT" variant="accent" />
      </View>
      <FlatList
        data={fixtures}
        keyExtractor={(fx) => fx.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.matchRow}>
              <Text style={[styles.team, { textAlign: "left" }]}>{item.home}</Text>
              <Text style={styles.score}>{item.score}</Text>
              <Text style={[styles.team, { textAlign: "right" }]}>{item.away}</Text>
            </View>
            <View style={styles.footer}>
              <Text style={styles.date}>{formatFixtureDate(item.date)}</Text>
              <Text style={styles.pts}>{item.yourPts} pts from your squad</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tagRow: { paddingHorizontal: 16, paddingTop: 12 },
  list: { padding: 16, gap: 10 },
  card: { borderWidth: 1, borderColor: colors.divider },
  matchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  team: { flex: 1, fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  score: { fontFamily: fonts.heading, fontSize: 16, paddingHorizontal: 10, color: colors.text },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  date: { fontSize: 11, color: colors.textMuted55, fontFamily: fonts.body },
  pts: { fontSize: 11, fontFamily: fonts.heading, color: colors.accent700 },
});
