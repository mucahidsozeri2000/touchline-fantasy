import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { Button } from "../components/Button";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const STEPS = [
  { num: "1", title: "One player, one manager", body: "Every Champions League player can be drafted by only one manager in your league. Move fast when the window opens." },
  { num: "2", title: "The window has a clock", body: "Transfers open at a set time and lock at the deadline. Miss it and an automatic squad is assigned to you." },
  { num: "3", title: "Real matches, real points", body: "Your squad scores from actual Champions League fixtures. Pick a captain each week to double their return." },
];

export function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index >= STEPS.length - 1;

  const enterApp = () => navigation.replace("MainTabs", { screen: "Home" });
  const next = () => (isLast ? enterApp() : setIndex((i) => i + 1));

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.numBox}>
          <Text style={styles.num}>{step.num}</Text>
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.text}>{step.body}</Text>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, { width: i === index ? 20 : 6, backgroundColor: i === index ? colors.accent : colors.divider }]} />
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        <Button title={isLast ? "Start Managing" : "Next"} onPress={next} block />
        <Button title="Skip" onPress={enterApp} variant="ghost" block />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingHorizontal: 32 },
  numBox: { width: 64, height: 64, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  num: { fontFamily: fonts.heading, fontSize: 24, color: colors.accent700 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, textAlign: "center" },
  text: { fontSize: 13, lineHeight: 19, color: colors.textMuted55, textAlign: "center", maxWidth: 280, fontFamily: fonts.body },
  dots: { flexDirection: "row", gap: 6, marginTop: 8 },
  dot: { height: 6 },
  actions: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 8 },
});
