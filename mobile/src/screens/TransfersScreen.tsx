import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/types";
import { api } from "../api";
import type { MarketPlayer, Position } from "../api";
import { useAuth } from "../AuthContext";
import { useAppState } from "../AppState";
import { NavBar } from "../components/NavBar";
import { Tag } from "../components/Tag";
import { H6 } from "../components/Section";
import { Segmented } from "../components/Segmented";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { CheckIcon, ClockIcon, LockIcon, PlusIcon } from "../components/Icons";
import { colors, fonts } from "../theme";
import { formatDeadline } from "../format";

type Props = BottomTabScreenProps<TabParamList, "Transfers">;

export function TransfersScreen(_props: Props) {
  const { me, refreshMe } = useAuth();
  const { window: win } = useAppState();
  const [filter, setFilter] = useState<Position | "ALL">("ALL");
  const [market, setMarket] = useState<MarketPlayer[]>([]);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const load = useCallback((pos: Position | "ALL") => {
    api.market(pos).then(setMarket).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
      refreshMe();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter])
  );

  const toggleShort = (id: string) => {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shortlistValue = useMemo(
    () => market.filter((p) => shortlist.has(p.id)).reduce((s, p) => s + p.price, 0),
    [market, shortlist]
  );

  const confirm = async () => {
    setConfirming(true);
    try {
      const res = await api.confirmTransfers([...shortlist]);
      setShortlist(new Set());
      load(filter);
      refreshMe();
      if (res.rejected.length) {
        Alert.alert(
          "Some picks didn't go through",
          res.rejected.map((r) => `${r.playerId}: ${r.reason}`).join("\n")
        );
      }
    } catch (e) {
      Alert.alert("Couldn't confirm transfers", e instanceof Error ? e.message : String(e));
    } finally {
      setConfirming(false);
    }
  };

  if (!win) return <View style={styles.screen} />;

  const tag = win.phase === "waiting" ? "Locked" : win.phase === "open" ? "Open" : "Closed";

  return (
    <View style={styles.screen}>
      <NavBar right={<Tag label={tag} />} />

      {win.phase === "waiting" && (
        <View style={styles.center}>
          <ClockIcon size={40} color={colors.neutral600} strokeWidth={1.5} />
          <Text style={styles.centerTitle}>Transfer window locked</Text>
          <Text style={styles.centerBody}>The market opens {formatDeadline(win.opensAt)}. Check back then to draft your squad.</Text>
        </View>
      )}

      {win.phase !== "waiting" && (
        <>
          {win.phase === "closed" && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedTitle}>Window closed — squads locked</Text>
              <Text style={styles.closedBody}>Managers who didn't confirm transfers received an automatic squad.</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={[styles.statCell, styles.statBorder]}>
              <H6>Budget Left</H6>
              <Text style={[styles.statValue, { color: colors.accent700 }]}>£{me?.budgetRemaining ?? "—"}M</Text>
            </View>
            <View style={styles.statCell}>
              <H6>Shortlisted</H6>
              <Text style={styles.statValue}>
                {shortlist.size} · £{shortlistValue.toFixed(1)}M
              </Text>
            </View>
          </View>
          <View style={styles.filterRow}>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "ALL", label: "All" },
                { value: "GK", label: "GK" },
                { value: "DEF", label: "DEF" },
                { value: "MID", label: "MID" },
                { value: "FWD", label: "FWD" },
              ]}
            />
          </View>
          <FlatList
            data={market}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.row, { opacity: item.taken ? 0.55 : 1 }]}>
                <Avatar size={34} initials={item.initials} photoUrl={item.photoUrl} background={colors.surface} />
                <View style={styles.rowMid}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {item.taken ? (
                    <Text style={styles.rowSub}>Drafted by {item.takenBy}</Text>
                  ) : (
                    <Text style={styles.rowSub}>
                      {item.club} · {item.position} · £{item.price.toFixed(1)}M · Form {item.form}
                    </Text>
                  )}
                </View>
                {item.taken ? (
                  <View style={styles.lockBtn}>
                    <LockIcon size={15} color={colors.neutral500} />
                  </View>
                ) : item.canPick ? (
                  <Pressable
                    onPress={() => toggleShort(item.id)}
                    style={[
                      styles.pickBtn,
                      { backgroundColor: shortlist.has(item.id) ? colors.accent : "transparent", borderColor: shortlist.has(item.id) ? colors.accent : colors.divider },
                    ]}
                  >
                    {shortlist.has(item.id) ? <CheckIcon size={16} color={colors.bg} /> : <PlusIcon size={16} color={colors.text} />}
                  </Pressable>
                ) : null}
              </View>
            )}
          />
          <View style={styles.footer}>
            <Button
              title={win.phase === "closed" ? "Window Closed" : confirming ? "Confirming…" : "Confirm Transfers"}
              onPress={confirm}
              disabled={shortlist.size === 0 || win.phase !== "open" || confirming}
              block
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  centerTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  centerBody: { fontSize: 13, color: colors.textMuted55, textAlign: "center", maxWidth: 260, fontFamily: fonts.body },
  closedBanner: { padding: 14, paddingHorizontal: 16, backgroundColor: colors.accent100, borderBottomWidth: 2, borderBottomColor: colors.divider },
  closedTitle: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent700 },
  closedBody: { fontSize: 12, marginTop: 2, color: colors.text, fontFamily: fonts.body },
  statsRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: colors.divider },
  statCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, gap: 2 },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.divider },
  statValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  filterRow: { marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
  list: { paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowMid: { flex: 1, gap: 2 },
  rowName: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  rowSub: { fontSize: 11, color: colors.textMuted55, fontFamily: fonts.body },
  pickBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  lockBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.divider },
  footer: { padding: 16, borderTopWidth: 2, borderTopColor: colors.divider },
});
