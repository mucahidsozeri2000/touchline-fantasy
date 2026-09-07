import React from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react-native";
import { Screen, NavBar, H, Body, Micro, Tag, Avatar, StatRow, HR, EmptyState } from "../components/ui";
import { colors, space, risk } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { Dict } from "../i18n/en";

type SeasonFormEntry = { label: string; pts: number };
type SigningEntry = { name: string; route: string; price: string | number; return: number };
type CareerEntry = { label: string; value: string | number };
type Profile = {
  coachName: string;
  teamName: string;
  league: string;
  badge?: string | null;
  stats: { squadValue: number; signings: number; bestGameweek: number };
  seasonForm: SeasonFormEntry[];
  signingHistory: SigningEntry[];
  career: CareerEntry[];
};

const ROUTE_KEYS: Partial<Record<string, keyof Dict>> = {
  AUCTION: "routeAuction",
  OPEN_SALE: "routeOpenSale",
  WAIVER: "routeWaiver",
  AUTO_ASSIGN: "routeAutoAssign",
};

export default function ManagerProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ManagerProfile">>();
  const { manager, leagueId } = useApp();
  const managerId = route.params?.managerId ?? manager?.id;

  const profileQ = useQuery({
    queryKey: ["profile", leagueId, managerId],
    queryFn: () => api.profile(leagueId!, managerId!) as Promise<Profile>,
    enabled: !!leagueId && !!managerId,
  });

  if (!leagueId || !managerId) {
    return (
      <Screen>
        <NavBar title={t("manager")} onBack={() => navigation.goBack()} />
        <EmptyState icon={<User size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const p = profileQ.data;
  const initials = p?.coachName ? p.coachName[0].toUpperCase() : "?";
  const maxPts = p ? Math.max(1, ...p.seasonForm.map((f) => f.pts)) : 1;

  return (
    <Screen>
      <NavBar title={t("manager")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <View style={{ alignItems: "center", gap: space[2] }}>
          <Avatar initials={initials} size={72} />
          <H level={3} style={{ marginTop: space[1] }}>{p?.coachName ?? "—"}</H>
          <Micro>{p ? `${p.teamName} · ${p.league}` : "—"}</Micro>
          {p?.badge ? <Tag label={p.badge} variant="accent" /> : null}
        </View>

        <StatRow
          items={[
            { label: t("squadValue"), value: p ? `£${p.stats.squadValue}m` : "—" },
            { label: t("signings"), value: p?.stats.signings ?? "—" },
            { label: t("bestGameweek"), value: p?.stats.bestGameweek ?? "—" },
          ]}
        />

        <HR />

        <View style={{ gap: space[3] }}>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{t("seasonForm")}</Micro>
          {!p || p.seasonForm.length === 0 ? (
            <Body muted>{t("noSeasonForm")}</Body>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, gap: space[2] }}>
              {p.seasonForm.map((f, i) => {
                const isBest = f.pts === maxPts;
                const h = Math.max(4, (f.pts / maxPts) * 120);
                return (
                  <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                    <View style={{ width: "100%", height: 96, justifyContent: "flex-end" }}>
                      <View style={{ height: h, backgroundColor: isBest ? colors.accent : colors.neutral300 }} />
                    </View>
                    <Micro>{f.label}</Micro>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <HR />

        <View style={{ gap: space[2] }}>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{t("signingHistory")}</Micro>
          {!p || p.signingHistory.length === 0 ? (
            <Body muted>{t("noSigningHistory")}</Body>
          ) : (
            p.signingHistory.map((s, i) => {
              const key = ROUTE_KEYS[s.route];
              const routeLabel = key ? t(key) : s.route;
              const positive = Number(s.return) >= 0;
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.divider,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Body>{s.name}</Body>
                    <Micro>{routeLabel} · {typeof s.price === "number" ? `£${s.price}m` : s.price}</Micro>
                  </View>
                  <Body style={{ color: positive ? risk.low : risk.high, fontWeight: "700" as const }}>
                    {positive ? "+" : ""}{s.return}
                  </Body>
                </View>
              );
            })
          )}
        </View>

        <HR />

        <View style={{ gap: space[1] }}>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase", marginBottom: space[1] }}>{t("career")}</Micro>
          {p?.career.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
              <Body muted>{c.label}</Body>
              <Body>{c.value}</Body>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
