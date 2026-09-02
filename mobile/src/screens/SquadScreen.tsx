import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/types";
import { api } from "../api";
import type { Squad, SquadMarker } from "../api";
import { useAuth } from "../AuthContext";
import { useAppState } from "../AppState";
import { NavBar } from "../components/NavBar";
import { Tag } from "../components/Tag";
import { H6, SectionHeading } from "../components/Section";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { colors, fonts } from "../theme";
import { formatDeadline } from "../format";

type Props = BottomTabScreenProps<TabParamList, "Squad">;

const ROW_TOP: Record<"gk" | "def" | "mid" | "fwd", number> = { gk: 90, def: 71, mid: 46, fwd: 14 };

export function SquadScreen(_props: Props) {
  const { me, refreshMe } = useAuth();
  const { window: win } = useAppState();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api.squad().then(setSquad).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshMe();
    }, [load, refreshMe])
  );

  const toggleCaptain = async (playerId: string) => {
    await api.setCaptain(playerId);
    load();
  };

  const saveSquad = () => {
    setSaved(true);
    load();
    refreshMe();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={styles.screen}>
      <NavBar right={<Tag label="GW 3" />} />
      <View style={styles.deadline}>
        <Text style={styles.deadlineLabel}>DEADLINE</Text>
        <Text style={styles.deadlineValue}>{win ? formatDeadline(win.closesAt) : "—"}</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCell, styles.statBorder]}>
          <H6>Budget Left</H6>
          <Text style={[styles.statValue, { color: colors.accent700 }]}>£{me?.budgetRemaining ?? "—"}M</Text>
        </View>
        <View style={styles.statCell}>
          <H6>Transfers</H6>
          <Text style={styles.statValue}>Unlimited</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pitch}>
          <View style={styles.halfway} />
          <View style={styles.centerCircle} />
          <View style={styles.boxTop} />
          <View style={styles.boxBottom} />

          {squad?.gk.map((p) => <Marker key={p.id} player={p} top={ROW_TOP.gk} left={50} onPress={toggleCaptain} />)}
          {rowFor(squad?.defMarkers).map((m) => (
            <Marker key={m.player.id} player={m.player} top={ROW_TOP.def} left={m.left} onPress={toggleCaptain} />
          ))}
          {rowFor(squad?.midMarkers).map((m) => (
            <Marker key={m.player.id} player={m.player} top={ROW_TOP.mid} left={m.left} onPress={toggleCaptain} />
          ))}
          {rowFor(squad?.fwdMarkers).map((m) => (
            <Marker key={m.player.id} player={m.player} top={ROW_TOP.fwd} left={m.left} onPress={toggleCaptain} />
          ))}
        </View>

        {!squad || (squad.gk.length + squad.defMarkers.length + squad.midMarkers.length + squad.fwdMarkers.length + squad.bench.length === 0) ? (
          <Text style={styles.emptyNote}>Your squad is empty. Head to Transfers to draft players once the window is open.</Text>
        ) : null}

        <View>
          <SectionHeading title="Bench" />
          <View style={styles.benchRow}>
            {(squad?.bench ?? []).map((p) => (
              <View key={p.id} style={styles.benchToken}>
                <Avatar size={38} initials={p.initials} photoUrl={p.photoUrl} />
                <Text style={styles.benchName}>{p.shortName}</Text>
              </View>
            ))}
          </View>
        </View>

        <Button title={saved ? "Saved" : "Save Squad"} onPress={saveSquad} block />
      </ScrollView>
    </View>
  );
}

function rowFor(list?: SquadMarker[]): { player: SquadMarker; left: number }[] {
  if (!list || !list.length) return [];
  return list.map((player, i) => ({ player, left: ((i + 1) / (list.length + 1)) * 100 }));
}

function Marker({ player, top, left, onPress }: { player: SquadMarker; top: number; left: number; onPress: (id: string) => void }) {
  const isCap = player.isCaptain;
  return (
    <Pressable onPress={() => onPress(player.id)} style={[styles.marker, { top: `${top}%`, left: `${left}%` }]}>
      <Avatar size={42} initials={player.initials} photoUrl={player.photoUrl} borderColor={isCap ? colors.accent : colors.divider} borderWidth={2} />
      <Text style={[styles.markerName, { color: isCap ? colors.accent700 : colors.text }]}>{player.shortName}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  deadline: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  deadlineLabel: { fontFamily: fonts.heading, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.bg },
  deadlineValue: { fontFamily: fonts.heading, fontSize: 14, color: colors.bg },
  statsRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: colors.divider },
  statCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, gap: 2 },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.divider },
  statValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  scrollContent: { padding: 16, gap: 14 },
  pitch: { width: "100%", height: 440, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.divider, position: "relative" },
  halfway: { position: "absolute", left: 0, right: 0, top: "50%", height: 2, backgroundColor: colors.divider },
  centerCircle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 84,
    height: 84,
    marginLeft: -42,
    marginTop: -42,
    borderWidth: 2,
    borderColor: colors.divider,
    borderRadius: 42,
  },
  boxBottom: { position: "absolute", left: "50%", bottom: 0, width: 150, height: 60, marginLeft: -75, borderWidth: 2, borderColor: colors.divider, borderBottomWidth: 0 },
  boxTop: { position: "absolute", left: "50%", top: 0, width: 150, height: 60, marginLeft: -75, borderWidth: 2, borderColor: colors.divider, borderTopWidth: 0 },
  marker: { position: "absolute", marginLeft: -21, marginTop: -21, alignItems: "center", gap: 3 },
  markerName: { fontSize: 9, fontFamily: fonts.heading, letterSpacing: 0.2, backgroundColor: colors.bg, paddingHorizontal: 4 },
  emptyNote: { fontSize: 13, color: colors.textMuted55, textAlign: "center", lineHeight: 19, fontFamily: fonts.body },
  benchRow: { flexDirection: "row", gap: 10, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, justifyContent: "space-around" },
  benchToken: { alignItems: "center", gap: 3 },
  benchName: { fontSize: 9, fontFamily: fonts.heading, letterSpacing: 0.2, color: colors.text },
});
