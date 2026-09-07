import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen, H, Body, Button } from "../components/ui";
import { colors, space } from "../theme";
import { RootStackParamList } from "../navigation/types";
import { useApp } from "../store/AppContext";

const STEPS = [
  { num: "1", titleKey: "onboardTitle1", bodyKey: "onboardBody1" },
  { num: "2", titleKey: "onboardTitle2", bodyKey: "onboardBody2" },
  { num: "3", titleKey: "onboardTitle3", bodyKey: "onboardBody3" },
] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  function finish() {
    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  }

  function next() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  const current = STEPS[step];

  return (
    <Screen>
      <View style={styles.content}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={styles.numberBox}>
            <H level={2} style={{ color: colors.bg }}>{current.num}</H>
          </View>
          <H level={3} style={{ marginTop: space[6] }}>{t(current.titleKey)}</H>
          <Body muted style={{ marginTop: space[3] }}>{t(current.bodyKey)}</Body>
        </View>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Button title={isLast ? t("startManaging") : t("next")} onPress={next} block />
        <Button title={t("skip")} variant="ghost" onPress={finish} style={{ alignSelf: "center", marginTop: space[3] }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: space[6] },
  numberBox: { width: 64, height: 64, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  dots: { flexDirection: "row", gap: 6, marginBottom: space[6] },
  dot: { width: 8, height: 8, backgroundColor: colors.neutral300 },
  dotActive: { width: 24, backgroundColor: colors.accent },
});
