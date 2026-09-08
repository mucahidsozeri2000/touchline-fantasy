import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ArrowLeftRight, Shirt } from "lucide-react-native";
import { Screen, H, Body, Micro, StatRow, Button, Avatar, HR, BottomSheet, EmptyState, IconButton, TAB_EDGES } from "../components/ui";
import { colors, space, clubColor } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type SlotDto = {
  slotId: string;
  playerId: string;
  name: string;
  club: string;
  clubColor: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  price: number;
  isCaptain: boolean;
  initials: string;
};

type Coord = { left: number; top: number };

const FORMATION: { gk: Coord; def: Coord[]; mid: Coord[]; fwd: Coord[] } = {
  gk: { left: 50, top: 90 },
  def: [{ left: 14, top: 68 }, { left: 38, top: 74 }, { left: 62, top: 74 }, { left: 86, top: 68 }],
  mid: [{ left: 26, top: 44 }, { left: 50, top: 48 }, { left: 74, top: 44 }],
  fwd: [{ left: 20, top: 16 }, { left: 50, top: 12 }, { left: 80, top: 16 }],
};

const MARKER = 42;
const BENCH_MARKER = 38;

function formatDeadline(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d
    .toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .toUpperCase();
}

export default function SquadScreen() {
  const { t } = useTranslation();
  const { leagueId } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const squadQ = useQuery({ queryKey: ["squad", leagueId], queryFn: () => api.squad(leagueId!), enabled: !!leagueId });
  const leagueQ = useQuery({ queryKey: ["league", leagueId], queryFn: () => api.league(leagueId!), enabled: !!leagueId });

  const captainMutation = useMutation({
    mutationFn: (playerId: string) => api.setCaptain(leagueId!, playerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["squad", leagueId] }),
  });
  const swapMutation = useMutation({
    mutationFn: ({ starterId, benchId }: { starterId: string; benchId: string }) => api.swap(leagueId!, starterId, benchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squad", leagueId] });
      setSelectedStarterId(null);
    },
  });

  const starters: SlotDto[] = squadQ.data?.starters ?? [];
  const bench: SlotDto[] = squadQ.data?.bench ?? [];

  const selectedPlayer = useMemo(() => starters.find((s) => s.playerId === selectedStarterId) ?? null, [starters, selectedStarterId]);
  const benchOptions = useMemo(
    () => (selectedPlayer ? bench.filter((b) => b.position === selectedPlayer.position) : []),
    [bench, selectedPlayer]
  );

  const grouped = useMemo(
    () => ({
      gk: starters.filter((s) => s.position === "GK"),
      def: starters.filter((s) => s.position === "DEF"),
      mid: starters.filter((s) => s.position === "MID"),
      fwd: starters.filter((s) => s.position === "FWD"),
    }),
    [starters]
  );

  if (!leagueId) {
    return (
      <Screen edges={TAB_EDGES}>
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

  if (squadQ.isLoading) {
    return (
      <Screen edges={TAB_EDGES}>
        <View style={styles.nav}>
          <H level={4}>{t("brand")}</H>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  const handleSave = () => {
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["squad", leagueId] });
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <Screen edges={TAB_EDGES}>
      <View style={styles.nav}>
        <H level={4}>{t("brand")}</H>
      </View>

      <View style={styles.deadlineStrip}>
        <Micro style={styles.deadlineLabel}>{t("deadline")}</Micro>
        <Body style={styles.deadlineValue}>{formatDeadline(leagueQ.data?.auctionClosesAt)}</Body>
      </View>

      <StatRow
        items={[
          { label: t("budgetLeft"), value: `£${squadQ.data?.budgetRemaining ?? 0}M` },
          { label: t("freeTransfers"), value: squadQ.data?.freeTransfers ?? 0 },
        ]}
      />

      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <View style={styles.pitch}>
          <View style={styles.halfway} />
          <View style={styles.centerCircle} />
          <View style={[styles.penaltyBox, { top: 0, borderTopWidth: 0 }]} />
          <View style={[styles.penaltyBox, { bottom: 0, borderBottomWidth: 0 }]} />

          {grouped.gk[0] ? <Marker player={grouped.gk[0]} coord={FORMATION.gk} onPress={() => setSelectedStarterId(grouped.gk[0].playerId)} /> : null}
          {grouped.def.map((p, i) => (FORMATION.def[i] ? <Marker key={p.playerId} player={p} coord={FORMATION.def[i]} onPress={() => setSelectedStarterId(p.playerId)} /> : null))}
          {grouped.mid.map((p, i) => (FORMATION.mid[i] ? <Marker key={p.playerId} player={p} coord={FORMATION.mid[i]} onPress={() => setSelectedStarterId(p.playerId)} /> : null))}
          {grouped.fwd.map((p, i) => (FORMATION.fwd[i] ? <Marker key={p.playerId} player={p} coord={FORMATION.fwd[i]} onPress={() => setSelectedStarterId(p.playerId)} /> : null))}
        </View>

        <View>
          <H level={6}>{t("bench")}</H>
          <HR style={{ marginVertical: 6 }} />
          <View style={styles.benchRow}>
            {bench.map((p) => (
              <View key={p.playerId} style={{ alignItems: "center", gap: 3 }}>
                <Avatar initials={p.initials} size={BENCH_MARKER} accentColor={clubColor(p.club)} />
                <Micro style={{ color: colors.text, fontWeight: "800" as const }}>{p.name}</Micro>
              </View>
            ))}
          </View>
        </View>

        <Button title={saved ? t("saved") : t("saveSquad")} onPress={handleSave} block />
      </ScrollView>

      <BottomSheet visible={!!selectedPlayer} onClose={() => setSelectedStarterId(null)}>
        {selectedPlayer ? (
          <View style={{ gap: space[4] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
              <Avatar initials={selectedPlayer.initials} size={40} accentColor={clubColor(selectedPlayer.club)} />
              <View style={{ flex: 1 }}>
                <H level={5}>{selectedPlayer.name}</H>
                <Micro>{selectedPlayer.club} · {selectedPlayer.position} · £{selectedPlayer.price}M</Micro>
              </View>
              <IconButton onPress={() => setSelectedStarterId(null)}>
                <X size={20} color={colors.text} strokeWidth={2} />
              </IconButton>
            </View>

            <Button
              title={selectedPlayer.isCaptain ? t("removeCaptain") : t("makeCaptain")}
              variant={selectedPlayer.isCaptain ? "secondary" : "primary"}
              onPress={() => captainMutation.mutate(selectedPlayer.playerId)}
              disabled={captainMutation.isPending}
              block
            />

            <View>
              <H level={6}>{t("swapWith")}</H>
              <HR style={{ marginVertical: 6 }} />
              {benchOptions.length === 0 ? (
                <EmptyState icon={<Shirt size={26} color={colors.neutral500} strokeWidth={1.5} />} text={t("noBenchOptions")} />
              ) : (
                <View style={{ gap: space[2] }}>
                  {benchOptions.map((b) => (
                    <Pressable
                      key={b.playerId}
                      style={styles.swapRow}
                      onPress={() => swapMutation.mutate({ starterId: selectedPlayer.playerId, benchId: b.playerId })}
                      disabled={swapMutation.isPending}
                    >
                      <Avatar initials={b.initials} size={32} accentColor={clubColor(b.club)} />
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontWeight: "800" as const }}>{b.name}</Body>
                        <Micro>{b.club} · £{b.price}M</Micro>
                      </View>
                      <ArrowLeftRight size={16} color={colors.accent700} strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

function Marker({ player, coord, onPress }: { player: SlotDto; coord: Coord; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        left: `${coord.left}%`,
        top: `${coord.top}%`,
        marginLeft: -(MARKER / 2 + 8),
        marginTop: -(MARKER / 2),
        width: MARKER + 16,
        alignItems: "center",
        gap: 3,
      }}
    >
      <Avatar initials={player.initials} size={MARKER} accentColor={clubColor(player.club)} ring={player.isCaptain} />
      <Micro style={styles.nameChip}>{player.name}</Micro>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 2, borderBottomColor: colors.divider },
  deadlineStrip: { backgroundColor: colors.accent, paddingHorizontal: space[4], paddingVertical: space[3], flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  deadlineLabel: { color: colors.accent100, textTransform: "uppercase", letterSpacing: 1 },
  deadlineValue: { color: colors.bg, fontWeight: "800" as const },
  pitch: { width: "100%", aspectRatio: 0.83, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.divider, position: "relative" },
  halfway: { position: "absolute", left: 0, right: 0, top: "50%", height: 2, backgroundColor: colors.divider },
  centerCircle: { position: "absolute", left: "50%", top: "50%", width: 84, height: 84, marginLeft: -42, marginTop: -42, borderRadius: 42, borderWidth: 2, borderColor: colors.divider },
  penaltyBox: { position: "absolute", left: "29.5%", right: "29.5%", height: "14%", borderWidth: 2, borderColor: colors.divider },
  nameChip: { fontSize: 9, fontWeight: "800" as const, color: colors.text, backgroundColor: colors.bg, paddingHorizontal: 4, paddingVertical: 1 },
  benchRow: { flexDirection: "row", justifyContent: "space-around", padding: space[3], backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
  swapRow: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[3], borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
});
