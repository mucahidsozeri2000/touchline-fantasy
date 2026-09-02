import React, { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/types";
import { useAuth } from "../AuthContext";
import { useAppState } from "../AppState";
import { Avatar } from "../components/Avatar";
import { H6, HRule, SectionHeading } from "../components/Section";
import { NavBar } from "../components/NavBar";
import { Tag } from "../components/Tag";
import { Segmented } from "../components/Segmented";
import { ChevronRightIcon } from "../components/Icons";
import { colors, fonts } from "../theme";
import { formatDeadline } from "../format";
import type { Phase } from "../api";

type Props = BottomTabScreenProps<TabParamList, "Home">;

function heroFor(phase: Phase, deadlineLabel: string) {
  if (phase === "waiting") {
    return {
      bg: colors.surface,
      color: colors.text,
      kicker: "Draft window",
      title: "Transfers open soon",
      body: `The market opens ${deadlineLabel}. Your current squad stays locked until then.`,
      cta: "View Rules",
      btnBg: colors.bg,
      btnColor: colors.text,
      btnBorder: colors.text,
      go: "Rules" as const,
    };
  }
  if (phase === "open") {
    return {
      bg: colors.accent,
      color: colors.bg,
      kicker: "Draft window · live",
      title: "Transfers are open",
      body: `Window closes ${deadlineLabel} — pick before it locks.`,
      cta: "Make Transfers",
      btnBg: colors.bg,
      btnColor: colors.accent700,
      btnBorder: colors.bg,
      go: "Transfers" as const,
    };
  }
  return {
    bg: colors.surface,
    color: colors.text,
    kicker: "Draft window · closed",
    title: "Squads are locked",
    body: "The transfer window has closed. Managers who missed the deadline received an automatic squad. Real matches are underway.",
    cta: "View Results",
    btnBg: colors.accent,
    btnColor: colors.bg,
    btnBorder: colors.accent,
    go: "Results" as const,
  };
}

export function HomeScreen({ navigation }: Props) {
  const { me, refreshMe } = useAuth();
  const { window: win, setPhase } = useAppState();

  useFocusEffect(
    useCallback(() => {
      refreshMe();
    }, [refreshMe])
  );

  if (!me || !win) return <View style={styles.screen} />;

  const deadlineLabel = formatDeadline(win.closesAt);
  const hero = heroFor(win.phase, deadlineLabel);

  return (
    <View style={styles.screen}>
      <NavBar right={<Tag label="GW 3" />} />
      <View style={styles.coachRow}>
        <Avatar size={40} circle={false} initials={me.coachInitial} background={colors.accent} textColor={colors.bg} />
        <View>
          <Text style={styles.coachName}>{me.coachName}</Text>
          <Text style={styles.coachSub}>Head Coach · {me.teamName}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Segmented
          value={win.phase}
          onChange={(v) => setPhase(v)}
          options={[
            { value: "waiting", label: "Locked" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
        />

        <View style={[styles.hero, { backgroundColor: hero.bg }]}>
          <Text style={[styles.heroKicker, { color: hero.color }]}>{hero.kicker}</Text>
          <Text style={[styles.heroTitle, { color: hero.color }]}>{hero.title}</Text>
          <Text style={[styles.heroBody, { color: hero.color }]}>{hero.body}</Text>
          <Pressable
            onPress={() => navigation.navigate(hero.go)}
            style={[styles.heroBtn, { backgroundColor: hero.btnBg, borderColor: hero.btnBorder }]}
          >
            <Text style={[styles.heroBtnLabel, { color: hero.btnColor }]}>{hero.cta}</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCell, styles.statBorder]}>
            <H6>Rank</H6>
            <Text style={styles.statValue}>{ordinal(me.rank)}</Text>
          </View>
          <View style={[styles.statCell, styles.statBorder]}>
            <H6>Total Points</H6>
            <Text style={styles.statValue}>{me.totalPoints}</Text>
          </View>
          <View style={styles.statCell}>
            <H6>Squad Value</H6>
            <Text style={styles.statValue}>£{me.squadValue}M</Text>
          </View>
        </View>

        <View>
          <SectionHeading title="League" />
          <Pressable onPress={() => navigation.navigate("Leagues")} style={styles.listRow}>
            <Text style={styles.listRowLabel}>{me.leagueName}</Text>
            <ChevronRightIcon size={16} color={colors.text} />
          </Pressable>
        </View>

        <View>
          <SectionHeading title="More" />
          <View style={{ gap: 8 }}>
            <Pressable onPress={() => navigation.navigate("Rules")} style={styles.listRow}>
              <Text style={styles.listRowLabel}>Rules & Scoring</Text>
              <ChevronRightIcon size={16} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Results")} style={styles.listRow}>
              <Text style={styles.listRowLabel}>Match Results</Text>
              <ChevronRightIcon size={16} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("DraftFeed")} style={styles.listRow}>
              <Text style={styles.listRowLabel}>Draft Feed</Text>
              <ChevronRightIcon size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ordinal(n: number): string {
  if (n <= 0) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  coachName: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  coachSub: { fontSize: 11, color: colors.textMuted55, fontFamily: fonts.body },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  hero: { padding: 18, gap: 8 },
  heroKicker: { fontFamily: fonts.heading, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.85 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 25 },
  heroBody: { fontSize: 13, lineHeight: 18, opacity: 0.9, fontFamily: fonts.body },
  heroBtn: { marginTop: 6, width: "100%", paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, alignItems: "center" },
  heroBtnLabel: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },
  statsRow: { flexDirection: "row", borderWidth: 1, borderColor: colors.divider },
  statCell: { flex: 1, padding: 12, gap: 2 },
  statBorder: { borderRightWidth: 1, borderRightColor: colors.divider },
  statValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  listRow: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listRowLabel: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
});
