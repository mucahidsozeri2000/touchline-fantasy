import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Radio, Users, ArrowLeftRight, Trophy, Plus, ChevronRight, Gavel, ListOrdered, RefreshCcw, Swords, Target, MessageCircle, PieChart, BookOpen, Lock } from "lucide-react-native";
import { Screen, H, Body, Micro, Tag, StatRow, Button, Avatar, HR, Segmented } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Phase = "locked" | "open" | "closed";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { manager, leagueId, leagueName } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [override, setOverride] = useState<Phase | "auto">("auto");

  const standingsQ = useQuery({ queryKey: ["standings", leagueId], queryFn: () => api.standings(leagueId!), enabled: !!leagueId });
  const profileQ = useQuery({ queryKey: ["profile", leagueId, manager?.id], queryFn: () => api.profile(leagueId!, manager!.id), enabled: !!leagueId && !!manager });
  const transfersQ = useQuery({ queryKey: ["transfers", leagueId], queryFn: () => api.transfers(leagueId!), enabled: !!leagueId });
  const paywallQ = useQuery({ queryKey: ["paywall", leagueId], queryFn: () => api.paywall(leagueId!), enabled: !!leagueId });

  if (!leagueId) {
    return (
      <Screen>
        <View style={styles.nav}>
          <H level={4}>{t("brand")}</H>
        </View>
        <View style={{ padding: space[4], gap: space[4] }}>
          <Body muted>You're not in a league yet.</Body>
          <Button title={t("newLeagueRow")} onPress={() => navigation.navigate("LeagueSetup")} block />
        </View>
      </Screen>
    );
  }

  const me = standingsQ.data?.standings?.find((s: any) => s.me);
  const phase: Phase = override === "auto" ? (standingsQ.data?.phase ?? "locked") : override;
  const isPro = paywallQ.data?.isPro;

  return (
    <Screen>
      <ScrollView>
        <View style={styles.nav}>
          <H level={4}>{t("brand")}</H>
          <Tag label={`GW ${me?.gw != null ? Math.min(6, 3) : 3}`} variant="outline" />
        </View>

        <View style={{ padding: space[4], gap: space[4] }}>
          <Pressable style={styles.profileRow} onPress={() => navigation.navigate("ManagerProfile", { managerId: manager?.id })}>
            <Avatar initials={manager?.avatarInitial ?? "?"} size={44} />
            <View style={{ flex: 1 }}>
              <H level={5}>{manager?.coachName}</H>
              <Micro>{t("headCoach")} · {manager?.teamName}</Micro>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>

          <Segmented
            value={override}
            onChange={setOverride}
            options={[
              { label: t("phaseLocked"), value: "locked" as const },
              { label: t("phaseOpen"), value: "open" as const },
              { label: t("phaseClosed"), value: "closed" as const },
            ]}
          />

          <HeroCard
            phase={phase}
            budgetLeft={transfersQ.data?.budgetRemaining}
            onCta={() => {
              if (phase === "locked") navigation.navigate("Rules");
              else if (phase === "open") navigation.navigate("Main");
              else navigation.navigate("MatchResults");
            }}
          />

          <StatRow
            items={[
              { label: t("rank"), value: me ? `${me.rank}` : "—" },
              { label: t("totalPoints"), value: me?.total ?? "—" },
              { label: t("squadValue"), value: profileQ.data ? `£${profileQ.data.stats.squadValue}m` : "—" },
            ]}
          />

          <Pressable style={styles.row} onPress={() => navigation.navigate("Main")}>
            <Body>{t("league")}</Body>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Micro>{leagueName}</Micro>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable style={styles.dashedRow} onPress={() => navigation.navigate("LeagueSetup")}>
            <Plus size={18} color={colors.accent} />
            <Body style={{ color: colors.accent }}>{t("newLeagueRow")}</Body>
          </Pressable>

          <HR style={{ marginVertical: space[2] }} />

          <MoreSection title={t("catLive")}>
            <MoreRow icon={Radio} label={t("matchdayLive")} live onPress={() => navigation.navigate("MatchdayLive")} />
            <MoreRow icon={Trophy} label={t("matchResults")} onPress={() => navigation.navigate("MatchResults")} />
          </MoreSection>

          <MoreSection title={t("catAuction")}>
            <MoreRow icon={Gavel} label={t("liveAuction")} onPress={() => navigation.navigate("LiveAuction")} />
            <MoreRow icon={ListOrdered} label={t("draftFeed")} onPress={() => navigation.navigate("DraftFeed")} />
            <MoreRow icon={RefreshCcw} label={t("reauctionPrices")} onPress={() => navigation.navigate("Reauction")} />
          </MoreSection>

          <MoreSection title={t("catCompete")}>
            <MoreRow icon={Swords} label={t("headToHead")} onPress={() => navigation.navigate("HeadToHead")} />
            <MoreRow icon={Target} label={t("predictions")} onPress={() => navigation.navigate("Predictions")} />
            <MoreRow icon={MessageCircle} label={t("leagueChat")} onPress={() => navigation.navigate("LeagueChat")} />
            <MoreRow icon={PieChart} label={t("exposureRisk")} onPress={() => navigation.navigate("ExposureRisk")} />
          </MoreSection>

          <MoreSection title={t("catInfo")}>
            <MoreRow icon={BookOpen} label={t("rulesScoring")} onPress={() => navigation.navigate("Rules")} />
            <MoreRow
              icon={isPro ? Trophy : Lock}
              label={t("leaguePass")}
              chip={isPro ? t("leaguePass") : t("phaseLocked")}
              chipVariant={isPro ? "accent" : "neutral"}
              onPress={() => navigation.navigate("LeaguePass")}
            />
          </MoreSection>
        </View>
      </ScrollView>
    </Screen>
  );
}

function HeroCard({ phase, budgetLeft, onCta }: { phase: Phase; budgetLeft?: number; onCta: () => void }) {
  const { t } = useTranslation();
  if (phase === "open") {
    return (
      <View style={[styles.hero, { backgroundColor: colors.accent }]}>
        <Micro style={{ color: colors.accent100 }}>{t("heroOpenKicker")}</Micro>
        <H level={4} style={{ color: colors.bg, marginTop: 4 }}>{t("heroOpenTitle")}</H>
        <Body style={{ color: colors.accent100, marginTop: 6 }}>
          {budgetLeft != null ? `£${budgetLeft}m ${t("budgetLeft").toLowerCase()} · 1 ${t("heroOpenBody")}` : t("heroOpenBody")}
        </Body>
        <Button title={t("makeTransfers")} onPress={onCta} inverted style={{ marginTop: space[3], alignSelf: "flex-start" }} />
      </View>
    );
  }
  if (phase === "closed") {
    return (
      <View style={styles.heroNeutral}>
        <Micro>{t("heroClosedKicker")}</Micro>
        <H level={4} style={{ marginTop: 4 }}>{t("heroClosedTitle")}</H>
        <Body muted style={{ marginTop: 6 }}>{t("heroClosedBody")}</Body>
        <Button title={t("viewResults")} onPress={onCta} style={{ marginTop: space[3], alignSelf: "flex-start" }} />
      </View>
    );
  }
  return (
    <View style={styles.heroNeutral}>
      <Micro>{t("heroWaitingKicker")}</Micro>
      <H level={4} style={{ marginTop: 4 }}>{t("heroWaitingTitle")}</H>
      <Body muted style={{ marginTop: 6 }}>{t("heroWaitingBody")}</Body>
      <Button title={t("viewRules")} onPress={onCta} variant="secondary" style={{ marginTop: space[3], alignSelf: "flex-start" }} />
    </View>
  );
}

function MoreSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space[1] }}>
      <Micro style={{ letterSpacing: 1, textTransform: "uppercase", marginTop: space[2] }}>{title}</Micro>
      {children}
    </View>
  );
}

function MoreRow({
  icon: Icon, label, onPress, live, chip, chipVariant = "accent",
}: { icon: any; label: string; onPress: () => void; live?: boolean; chip?: string; chipVariant?: "accent" | "neutral" }) {
  return (
    <Pressable style={[styles.row, live && { backgroundColor: colors.accent100 }]} onPress={onPress}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <Icon size={18} color={live ? colors.accent700 : colors.text} />
        <Body>{label}</Body>
        {live ? <View style={styles.pulseDot} /> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {chip ? <Tag label={chip} variant={chipVariant} /> : null}
        <ChevronRight size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 2, borderBottomColor: colors.divider },
  profileRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider },
  dashedRow: { flexDirection: "row", alignItems: "center", gap: space[2], borderWidth: 1, borderStyle: "dashed", borderColor: colors.divider, padding: space[3] },
  hero: { padding: space[4] },
  heroNeutral: { padding: space[4], backgroundColor: colors.surface },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
});
