import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Screen, NavBar, H, Body, Micro, Tag, Button, Segmented, StatRow, Avatar, HR } from "../components/ui";
import { colors, space, clubColor } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type MoverFilter = "risers" | "fallers";

function initialsFor(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function ReauctionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();
  const [moverFilter, setMoverFilter] = useState<MoverFilter>("risers");

  const reauctionQ = useQuery({
    queryKey: ["reauction", leagueId],
    queryFn: () => api.reauction(leagueId!),
    enabled: !!leagueId,
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("reauctionNavTitle")} onBack={() => navigation.goBack()} />
        <View style={{ padding: space[4] }}>
          <Body muted>{t("notInLeagueYet")}</Body>
        </View>
      </Screen>
    );
  }

  const data = reauctionQ.data as any;
  const cleared: any[] = data?.cleared ?? [];
  const movers: any[] = data?.movers ?? [];
  const filteredMovers = movers.filter((m) => (moverFilter === "risers" ? m.delta > 0 : m.delta < 0));

  const MOVER_OPTIONS: { label: string; value: MoverFilter }[] = [
    { label: t("risers"), value: "risers" },
    { label: t("fallers"), value: "fallers" },
  ];

  return (
    <Screen>
      <NavBar
        title={t("reauctionNavTitle")}
        onBack={() => navigation.goBack()}
        right={<Tag label={data?.round ?? "QF"} variant="outline" />}
      />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <View style={styles.banner}>
          <Body style={{ color: colors.accent800 }}>{t("reauctionExplainer")}</Body>
        </View>

        <StatRow
          items={[
            { label: t("refunded"), value: `£${data?.stats?.refunded ?? 0}m` },
            { label: t("newBudget"), value: `£${data?.stats?.newBudget ?? 0}m` },
            { label: t("openSlots"), value: data?.stats?.openSlots ?? 0 },
          ]}
        />

        <View>
          <H level={5}>{t("clearedFromSquad")}</H>
          {cleared.length === 0 ? (
            <Micro style={{ marginTop: space[2] }}>—</Micro>
          ) : (
            <View style={{ marginTop: space[2], gap: space[3] }}>
              {cleared.map((c, i) => (
                <View key={`${c.name}-${i}`}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Body style={{ textDecorationLine: "line-through" }}>{c.name}</Body>
                    <Body style={{ fontWeight: "700" }}>+£{c.refund}m</Body>
                  </View>
                  <Micro>{c.club} · {c.reason}</Micro>
                  {i < cleared.length - 1 ? <HR style={{ marginTop: space[2], marginVertical: 0 }} /> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space[2] }}>
            <H level={5}>{t("weeklyRerating")}</H>
          </View>
          <Segmented value={moverFilter} onChange={setMoverFilter} options={MOVER_OPTIONS} />

          <View style={{ marginTop: space[3], gap: space[3] }}>
            {filteredMovers.map((m) => (
              <View key={m.playerId} style={styles.moverRow}>
                <Avatar initials={initialsFor(m.name)} accentColor={clubColor(m.club)} size={36} />
                <View style={{ flex: 1 }}>
                  <Body>{m.name}</Body>
                  <Micro>{m.position} · {m.club}</Micro>
                  <Micro>{m.reason}</Micro>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Body style={{ fontWeight: "700" }}>£{m.newPrice}m</Body>
                  <Micro style={{ color: m.delta > 0 ? colors.accent700 : colors.textMuted }}>
                    {m.delta > 0 ? "+" : ""}{m.delta}m
                  </Micro>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Button title={t("enterReauction")} onPress={() => navigation.navigate("LiveAuction")} block />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.accent100, padding: space[3] },
  moverRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
});
