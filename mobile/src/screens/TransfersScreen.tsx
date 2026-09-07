import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Check, Lock } from "lucide-react-native";
import { Screen, H, Body, Micro, Tag, StatRow, Button, Avatar, Segmented, EmptyState } from "../components/ui";
import { colors, space, clubColor } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Position = "ALL" | "GK" | "DEF" | "MID" | "FWD";
type Phase = "locked" | "open" | "closed";

type MarketPlayer = {
  playerId: string;
  name: string;
  club: string;
  clubColor: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  price: number;
  initials: string;
  ownedByMe: boolean;
  drafted: boolean;
  draftedBy: string | null;
};

const PHASE_LABEL_KEY: Record<Phase, "phaseLocked" | "phaseOpen" | "phaseClosed"> = {
  locked: "phaseLocked",
  open: "phaseOpen",
  closed: "phaseClosed",
};

function pseudoForm(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (5.2 + (h % 38) / 10).toFixed(1);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d
    .toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .toUpperCase();
}

export default function TransfersScreen() {
  const { t } = useTranslation();
  const { leagueId } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [position, setPosition] = useState<Position>("ALL");
  const [shortlist, setShortlist] = useState<string[]>([]);

  const transfersQ = useQuery({
    queryKey: ["transfers", leagueId, position],
    queryFn: () => api.transfers(leagueId!, position),
    enabled: !!leagueId,
  });
  const leagueQ = useQuery({ queryKey: ["league", leagueId], queryFn: () => api.league(leagueId!), enabled: !!leagueId });

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmTransfers(leagueId!, shortlist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["squad", leagueId] });
      setShortlist([]);
    },
  });

  const players: MarketPlayer[] = transfersQ.data?.players ?? [];
  const phase: Phase = transfersQ.data?.phase ?? "locked";

  const toggleShortlist = (playerId: string) => {
    setShortlist((cur) => (cur.includes(playerId) ? cur.filter((id) => id !== playerId) : [...cur, playerId]));
  };

  const shortlistValue = useMemo(
    () => players.filter((p) => shortlist.includes(p.playerId)).reduce((sum, p) => sum + p.price, 0),
    [players, shortlist]
  );

  if (!leagueId) {
    return (
      <Screen>
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

  if (transfersQ.isLoading) {
    return (
      <Screen>
        <View style={styles.nav}>
          <H level={4}>{t("brand")}</H>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.nav}>
        <H level={4}>{t("brand")}</H>
        <Tag label={t(PHASE_LABEL_KEY[phase])} variant="outline" />
      </View>

      {phase === "locked" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space[3], padding: space[8] }}>
          <Clock size={40} color={colors.neutral600} strokeWidth={1.5} />
          <H level={5}>{t("transferLockedTitle")}</H>
          <Body muted style={{ textAlign: "center", maxWidth: 260 }}>
            {t("transferLockedBody", { when: formatDate(leagueQ.data?.auctionOpensAt) })}
          </Body>
        </View>
      ) : (
        <>
          {phase === "closed" ? (
            <View style={styles.closedBanner}>
              <Body style={{ fontWeight: "800" as const, color: colors.accent700 }}>{t("transferClosedBanner")}</Body>
              <Micro style={{ marginTop: 2 }}>{t("transferClosedNote")}</Micro>
            </View>
          ) : null}

          <StatRow
            items={[
              { label: t("budgetLeft"), value: `£${transfersQ.data?.budgetRemaining ?? 0}M` },
              { label: t("shortlisted"), value: `${shortlist.length} · £${shortlistValue.toFixed(1)}M` },
            ]}
          />

          <View style={{ paddingHorizontal: space[4], paddingTop: space[3] }}>
            <Segmented
              value={position}
              onChange={setPosition}
              options={[
                { label: t("all"), value: "ALL" as const },
                { label: "GK", value: "GK" as const },
                { label: "DEF", value: "DEF" as const },
                { label: "MID", value: "MID" as const },
                { label: "FWD", value: "FWD" as const },
              ]}
            />
          </View>

          <ScrollView contentContainerStyle={{ padding: space[4], gap: 2 }}>
            {players.length === 0 ? (
              <EmptyState icon={<Clock size={26} color={colors.neutral500} strokeWidth={1.5} />} text={t("noLotsMatch")} />
            ) : (
              players.map((p) => {
                const isShortlisted = shortlist.includes(p.playerId);
                const takenByOther = p.drafted && !p.ownedByMe;
                const canPick = !p.drafted && phase === "open";
                return (
                  <View key={p.playerId} style={[styles.row, (takenByOther || p.ownedByMe) && { opacity: 0.55 }]}>
                    <Avatar initials={p.initials} size={34} accentColor={clubColor(p.club)} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Body style={{ fontWeight: "800" as const }}>{p.name}</Body>
                      {takenByOther ? (
                        <Micro>{t("draftedBy")} {p.draftedBy}</Micro>
                      ) : p.ownedByMe ? (
                        <Micro>{t("yourRoster")}</Micro>
                      ) : (
                        <Micro>{p.club} · {p.position} · £{p.price}M · {t("form")} {pseudoForm(p.playerId)}</Micro>
                      )}
                    </View>
                    {canPick ? (
                      <Pressable
                        onPress={() => toggleShortlist(p.playerId)}
                        style={[styles.toggleBtn, isShortlisted && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                      >
                        {isShortlisted ? (
                          <Check size={16} color={colors.bg} strokeWidth={2.5} />
                        ) : (
                          <Plus size={16} color={colors.text} strokeWidth={2.5} />
                        )}
                      </Pressable>
                    ) : (
                      <View style={styles.lockedBtn}>
                        <Lock size={15} color={colors.neutral500} strokeWidth={2} />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.confirmBar}>
            {confirmMutation.isError ? (
              <Micro style={{ color: colors.riskHigh }}>{(confirmMutation.error as Error)?.message ?? t("errorGeneric")}</Micro>
            ) : null}
            <Button
              title={t("confirmTransfers")}
              onPress={() => confirmMutation.mutate()}
              disabled={shortlist.length === 0 || phase !== "open" || confirmMutation.isPending}
              block
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 2, borderBottomColor: colors.divider },
  closedBanner: { padding: space[3], backgroundColor: colors.accent100, borderBottomWidth: 2, borderBottomColor: colors.divider },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2] + 2, borderBottomWidth: 1, borderBottomColor: colors.divider },
  toggleBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.divider },
  lockedBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.divider },
  confirmBar: { padding: space[3], borderTopWidth: 2, borderTopColor: colors.divider, gap: space[2] },
});
