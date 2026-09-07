import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react-native";
import { Screen, NavBar, H, Body, Micro, Tag, Segmented, Table, EmptyState } from "../components/ui";
import { colors, space, risk } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type FeedEvent = { minute: string; player: string; action: string; match: string; pts: string; mine: boolean };
type XiEntry = { name: string; club: string; isCaptain: boolean; state: "live" | "upcoming"; pts: number; status: string };
type TableRow = { manager: string; live: number; playing: string; me: boolean };
type LiveData = {
  header: { total: number; rank: number; playersLeft: number };
  feed: FeedEvent[];
  myXi: XiEntry[];
  liveTable: TableRow[];
};

type SubTab = "feed" | "myXi" | "league";

export default function MatchdayLiveScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();
  const [tab, setTab] = useState<SubTab>("feed");

  const liveQ = useQuery({
    queryKey: ["matchdayLive", leagueId],
    queryFn: () => api.matchdayLive(leagueId!) as Promise<LiveData>,
    enabled: !!leagueId,
    refetchInterval: 5000,
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("matchdayLive")} onBack={() => navigation.goBack()} />
        <EmptyState icon={<Radio size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const data = liveQ.data;

  return (
    <Screen>
      <NavBar
        title={t("matchdayLive")}
        onBack={() => navigation.goBack()}
        right={<Tag label="Live" variant="accent" />}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: space[8] }}>
        <View style={{ backgroundColor: colors.accent, padding: space[4] }}>
          <Micro style={{ color: colors.accent100, letterSpacing: 1, textTransform: "uppercase" }}>{t("livePoints")}</Micro>
          <H level={1} style={{ color: colors.bg, marginTop: 4 }}>{data ? data.header.total : "—"}</H>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space[3] }}>
            <Body style={{ color: colors.accent100 }}>
              {t("rank")} {data ? `#${data.header.rank}` : "—"} · {t("sinceKickoff")}
            </Body>
            <Body style={{ color: colors.accent100 }}>
              {data ? `${data.header.playersLeft} ${t("playersLeftToPlay")}` : "—"}
            </Body>
          </View>
        </View>

        <View style={{ padding: space[4] }}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { label: t("feed"), value: "feed" as const },
              { label: t("myXi"), value: "myXi" as const },
              { label: t("leagueTab"), value: "league" as const },
            ]}
          />
        </View>

        <View style={{ paddingHorizontal: space[4] }}>
          {tab === "feed" && <FeedList feed={data?.feed ?? []} />}
          {tab === "myXi" && <MyXiList xi={data?.myXi ?? []} />}
          {tab === "league" && <LeagueTable rows={data?.liveTable ?? []} />}
        </View>
      </ScrollView>
    </Screen>
  );
}

function FeedList({ feed }: { feed: FeedEvent[] }) {
  const { t } = useTranslation();
  if (feed.length === 0) {
    return <EmptyState icon={<Radio size={28} color={colors.textMuted} />} text={t("errorGeneric")} />;
  }
  return (
    <View>
      {feed.map((ev, i) => {
        const positive = !ev.pts.startsWith("-");
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <Micro style={{ width: 32 }}>{ev.minute}</Micro>
            <View style={{ flex: 1 }}>
              <Body style={ev.mine ? { color: colors.accent700, fontWeight: "700" as const } : undefined} muted={!ev.mine}>
                {ev.player} · {ev.action}
              </Body>
              <Micro>{ev.match}</Micro>
            </View>
            <Body style={{ color: positive ? risk.low : risk.high, fontWeight: "700" as const }}>{ev.pts}</Body>
          </View>
        );
      })}
    </View>
  );
}

function MyXiList({ xi }: { xi: XiEntry[] }) {
  const { t } = useTranslation();
  if (xi.length === 0) {
    return <EmptyState icon={<Radio size={28} color={colors.textMuted} />} text={t("errorGeneric")} />;
  }
  return (
    <View>
      {xi.map((p, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
          <View
            style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: p.state === "live" ? colors.accent : "transparent",
              borderWidth: p.state === "live" ? 0 : 2,
              borderColor: colors.neutral400,
            }}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Body>{p.name}</Body>
              {p.isCaptain ? <Tag label={t("captain")} variant="accent" /> : null}
            </View>
            <Micro>{p.club} · {p.status}</Micro>
          </View>
          <H level={5}>{p.pts}</H>
        </View>
      ))}
    </View>
  );
}

function LeagueTable({ rows }: { rows: TableRow[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <EmptyState icon={<Radio size={28} color={colors.textMuted} />} text={t("errorGeneric")} />;
  }
  return (
    <Table
      columns={[
        { key: "manager", label: t("manager"), flex: 2 },
        { key: "live", label: t("livePoints"), flex: 1, align: "right" },
        { key: "playing", label: t("playing"), flex: 1, align: "right" },
      ]}
      rowKey={(r) => r.manager}
      rows={rows.map((r) => ({ ...r, highlight: r.me }))}
    />
  );
}
