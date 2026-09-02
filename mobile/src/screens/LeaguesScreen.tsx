import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/types";
import { api } from "../api";
import type { League } from "../api";
import { NavBar } from "../components/NavBar";
import { Tag } from "../components/Tag";
import { TrendUpIcon } from "../components/Icons";
import { colors, fonts } from "../theme";

type Props = BottomTabScreenProps<TabParamList, "Leagues">;

export function LeaguesScreen(_props: Props) {
  const [league, setLeague] = useState<League | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.league().then(setLeague).catch(() => {});
    }, [])
  );

  const me = league?.standings.find((s) => s.isMe);

  return (
    <View style={styles.screen}>
      <NavBar right={<Tag label={league?.name ?? ""} />} />
      <View style={styles.rankCard}>
        <View>
          <Text style={styles.rankLabel}>YOUR RANK</Text>
          <Text style={styles.rankValue}>{me ? ordinal(me.rank) : "—"}</Text>
        </View>
        <View style={styles.trendRow}>
          <TrendUpIcon size={16} color={colors.accent700} strokeWidth={2.5} />
          <Text style={styles.trendText}>{me ? me.gw : 0} pts this GW</Text>
        </View>
      </View>
      <FlatList
        data={league?.standings ?? []}
        keyExtractor={(s) => s.managerId}
        contentContainerStyle={styles.listPad}
        ListHeaderComponent={
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, styles.colPos]}>Pos</Text>
            <Text style={[styles.th, styles.colManager]}>Manager</Text>
            <Text style={[styles.th, styles.colNum]}>GW</Text>
            <Text style={[styles.th, styles.colNum]}>Total</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.tr, item.isMe && styles.trMe]}>
            <Text style={[styles.td, styles.colPos, item.isMe && styles.tdMe]}>{item.rank}</Text>
            <Text style={[styles.td, styles.colManager, item.isMe && styles.tdMe]}>{item.manager}</Text>
            <Text style={[styles.td, styles.colNum, item.isMe && styles.tdMe]}>{item.gw}</Text>
            <Text style={[styles.td, styles.colNum, item.isMe && styles.tdMe]}>{item.total}</Text>
          </View>
        )}
      />
    </View>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rankCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rankLabel: { fontFamily: fonts.heading, fontSize: 11, letterSpacing: 1, color: colors.text, marginBottom: 2 },
  rankValue: { fontFamily: fonts.heading, fontSize: 32, color: colors.text },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendText: { fontSize: 13, fontFamily: fonts.heading, color: colors.accent700 },
  listPad: { paddingHorizontal: 16, paddingBottom: 16 },
  tr: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider, alignItems: "center" },
  thead: { borderBottomWidth: 2 },
  trMe: { backgroundColor: colors.accent100 },
  colPos: { width: 36 },
  colManager: { flex: 1 },
  colNum: { width: 56, textAlign: "right" },
  th: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted60, fontFamily: fonts.body },
  td: { fontSize: 14, color: colors.text, fontFamily: fonts.body },
  tdMe: { fontFamily: fonts.heading },
});
