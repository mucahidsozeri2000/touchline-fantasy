import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, Plus, Minus, Check } from "lucide-react-native";
import {
  Screen, NavBar, H, Body, Micro, Tag, Button, IconButton, Input, Segmented, Card, StatRow, Avatar, HR, EmptyState,
} from "../components/ui";
import { colors, space, clubColor } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type PosFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";

const STATUS_KEY: Record<string, string> = {
  Leading: "leading",
  Outbid: "outbid",
  Open: "open",
  Sealed: "sealed",
  "Bid In": "bidIn",
};

function initialsFor(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveAuctionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<PosFilter>("ALL");
  const [now, setNow] = useState(Date.now());
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [showExtension, setShowExtension] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const auctionQ = useQuery({
    queryKey: ["auction", leagueId, position, search],
    queryFn: () => api.auction(leagueId!, position, search || undefined),
    enabled: !!leagueId,
    refetchInterval: 5000,
  });

  const waiversQ = useQuery({
    queryKey: ["waivers", leagueId],
    queryFn: () => api.waivers(leagueId!),
    enabled: !!leagueId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!auctionQ.data) return;
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const lot of auctionQ.data.lots as any[]) {
        if (next[lot.playerId] === undefined || next[lot.playerId] < lot.nextBidFloor) {
          next[lot.playerId] = lot.nextBidFloor;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [auctionQ.data]);

  const invalidateAuction = () => queryClient.invalidateQueries({ queryKey: ["auction", leagueId] });

  const bidMut = useMutation({
    mutationFn: ({ playerId, amount }: { playerId: string; amount: number }) => api.bid(leagueId!, playerId, amount),
    onSuccess: (data: any) => {
      invalidateAuction();
      if (data?.extended) {
        setShowExtension(true);
        setTimeout(() => setShowExtension(false), 6000);
      }
    },
    onError: (e: any) => Alert.alert(t("errorGeneric"), e?.message ?? ""),
  });

  const counterMut = useMutation({
    mutationFn: (playerId: string) => api.counterBid(leagueId!, playerId),
    onSuccess: (_data, playerId) => {
      invalidateAuction();
      setDismissedAlerts((prev) => ({ ...prev, [playerId]: true }));
    },
    onError: (e: any) => Alert.alert(t("errorGeneric"), e?.message ?? ""),
  });

  const blindMut = useMutation({
    mutationFn: (enabled: boolean) => api.setBlind(leagueId!, enabled),
    onSuccess: invalidateAuction,
    onError: (e: any) => Alert.alert(t("errorGeneric"), e?.message ?? "Only the commissioner can change this."),
  });

  const claimMut = useMutation({
    mutationFn: (playerId: string) => api.claimWaiver(leagueId!, playerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waivers", leagueId] }),
    onError: (e: any) => Alert.alert(t("errorGeneric"), e?.message ?? ""),
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("auctionNavTitle")} onBack={() => navigation.goBack()} />
        <View style={{ padding: space[4] }}>
          <Body muted>{t("notInLeagueYet")}</Body>
        </View>
      </Screen>
    );
  }

  const data = auctionQ.data as any;
  const lots: any[] = data?.lots ?? [];
  const blindRound: boolean = data?.blindRound ?? false;
  const outbidAlerts: any[] = (data?.outbidAlerts ?? []).filter((a: any) => !dismissedAlerts[a.playerId]);

  const nearestClosesAt = lots.length ? Math.min(...lots.map((l) => new Date(l.closesAt).getTime())) : null;
  const remainingMs = nearestClosesAt != null ? nearestClosesAt - now : null;
  const countdown = remainingMs != null ? formatCountdown(remainingMs) : "--:--";

  const POSITION_OPTIONS: { label: string; value: PosFilter }[] = [
    { label: t("all"), value: "ALL" },
    { label: "GK", value: "GK" },
    { label: "DEF", value: "DEF" },
    { label: "MID", value: "MID" },
    { label: "FWD", value: "FWD" },
  ];

  return (
    <Screen>
      <NavBar
        title={t("auctionNavTitle")}
        onBack={() => navigation.goBack()}
        right={<Tag label={t("liveTag")} variant="accent" />}
      />
      <ScrollView>
        <View style={styles.countdownStrip}>
          <Micro style={{ color: colors.accent100 }}>{blindRound ? t("closesInBlind") : t("closesIn")}</Micro>
          <H level={3} style={{ color: colors.bg, marginTop: 2 }}>{countdown}</H>
        </View>

        {showExtension && !blindRound ? (
          <View style={styles.extensionBanner}>
            <Body style={{ color: colors.accent800 }}>{t("extensionBanner")}</Body>
          </View>
        ) : null}

        {outbidAlerts.map((a) => (
          <View key={a.playerId} style={styles.alertRow}>
            <Body style={{ flex: 1 }}>
              {a.newLeader} {t("outbidAlert")} {a.playerName} — £{a.topBid}m
            </Body>
            <Button title={t("counter")} variant="secondary" onPress={() => counterMut.mutate(a.playerId)} />
          </View>
        ))}

        <View style={{ padding: space[4], gap: space[4] }}>
          <Pressable style={styles.toggleRow} onPress={() => blindMut.mutate(!blindRound)}>
            <View style={[styles.checkbox, blindRound && styles.checkboxChecked]}>
              {blindRound ? <Check size={14} color={colors.bg} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Body>{t("blindRound")}</Body>
              <Micro>{blindRound ? t("blindHintOn") : t("blindHintOff")}</Micro>
            </View>
          </Pressable>

          <StatRow
            items={[
              { label: t("freeFunds"), value: `£${data?.stats?.freeFunds ?? 0}m` },
              { label: t("committed"), value: `£${data?.stats?.committed ?? 0}m` },
              { label: t("leadingCount"), value: data?.stats?.leading ?? 0 },
            ]}
          />

          <View style={styles.searchRow}>
            <Search size={16} color={colors.textMuted} />
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchPlaceholder")}
              style={{ flex: 1, borderWidth: 0, backgroundColor: "transparent" }}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Segmented value={position} onChange={setPosition} options={POSITION_OPTIONS} />

          {lots.length === 0 ? (
            <EmptyState
              icon={<Search size={28} color={colors.textMuted} />}
              text={search ? `${t("noLotsMatch")} "${search}"` : t("noLotsMatch")}
            />
          ) : (
            <View style={{ gap: space[3] }}>
              {lots.map((lot) => {
                const draft = drafts[lot.playerId] ?? lot.nextBidFloor;
                const statusKey = STATUS_KEY[lot.status] ?? "open";
                const statusVariant = lot.status === "Leading" ? "accent" : "outline";
                return (
                  <Card key={lot.lotId}>
                    <View style={{ flexDirection: "row", gap: space[3], alignItems: "center" }}>
                      <Avatar initials={initialsFor(lot.name)} accentColor={clubColor(lot.club)} />
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontWeight: "700" }}>{lot.name}</Body>
                        <Micro>{lot.position} · {lot.club} · £{lot.listPrice}m</Micro>
                      </View>
                      <Tag label={t(statusKey)} variant={statusVariant as any} />
                    </View>

                    <HR style={{ marginVertical: space[2] }} />

                    {blindRound ? (
                      <Micro>—— · {lot.bidCount} bids</Micro>
                    ) : lot.topBid != null ? (
                      <Micro>£{lot.topBid}m · {lot.topBidder}</Micro>
                    ) : (
                      <Micro>{t("open")}</Micro>
                    )}

                    <View style={styles.stepperRow}>
                      <IconButton onPress={() => setDrafts((p) => ({ ...p, [lot.playerId]: Math.max(lot.nextBidFloor, round1(draft - 0.5)) }))}>
                        <Minus size={16} color={colors.text} />
                      </IconButton>
                      <Body style={{ minWidth: 74, textAlign: "center", fontWeight: "700" }}>£{draft.toFixed(1)}m</Body>
                      <IconButton onPress={() => setDrafts((p) => ({ ...p, [lot.playerId]: round1(draft + 0.5) }))}>
                        <Plus size={16} color={colors.text} />
                      </IconButton>
                      <Button
                        title={lot.myBid != null ? t("bidIn") : t("bid")}
                        onPress={() => bidMut.mutate({ playerId: lot.playerId, amount: draft })}
                        style={{ marginLeft: "auto" }}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

          <HR />

          <H level={5}>{t("waiverPool")}</H>
          <View style={{ gap: space[3] }}>
            {(waiversQ.data ?? []).map((w: any) => (
              <View key={w.playerId} style={styles.waiverRow}>
                <Avatar initials={initialsFor(w.name)} accentColor={clubColor(w.club)} size={36} />
                <View style={{ flex: 1 }}>
                  <Body>{w.name}</Body>
                  <Micro>{w.club} · {w.reason}</Micro>
                  <Micro>{t("claimOrder", { n: w.myPriority ?? "—" })}</Micro>
                </View>
                <Button
                  title={w.claimed ? t("claimed") : t("claim")}
                  disabled={w.claimed}
                  variant={w.claimed ? "secondary" : "primary"}
                  onPress={() => claimMut.mutate(w.playerId)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  countdownStrip: { backgroundColor: colors.accent, paddingHorizontal: space[4], paddingVertical: space[3] },
  extensionBanner: { backgroundColor: colors.accent100, paddingHorizontal: space[4], paddingVertical: space[2] },
  alertRow: {
    flexDirection: "row", alignItems: "center", gap: space[3],
    paddingHorizontal: space[4], paddingVertical: space[2],
    backgroundColor: colors.accent100, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: colors.divider, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: space[2],
    borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface,
    paddingHorizontal: space[3],
  },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[1] },
  waiverRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
});
