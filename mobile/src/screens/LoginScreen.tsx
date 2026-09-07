import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen, H, Body, Field, Input, Button, Segmented } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { enter, google, language, setLanguage } = useApp();
  const [teamName, setTeamName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = teamName.trim().length > 0 && coachName.trim().length > 0;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      // Setting `manager` (inside enter()) flips RootNavigator to its
      // authenticated stack, which mounts fresh at "Onboarding" because
      // needsOnboarding is now true — no manual navigation needed here.
      await enter(teamName.trim(), coachName.trim());
    } catch (err: any) {
      Alert.alert(t("errorGeneric"), err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      await google();
    } catch (err: any) {
      Alert.alert(t("errorGeneric"), err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <H level={4}>{t("brand")}</H>
            <Segmented
              value={language}
              onChange={(v) => setLanguage(v as "en" | "tr")}
              options={[
                { label: "EN", value: "en" },
                { label: "TR", value: "tr" },
              ]}
            />
          </View>

          <View style={{ marginTop: space[8] }}>
            <H level={2}>{t("brand")}</H>
            <Body muted style={{ marginTop: space[2] }}>{t("tagline")}</Body>
          </View>

          <View style={{ marginTop: space[8], gap: space[4] }}>
            <Field label={t("teamNameLabel")}>
              <Input value={teamName} onChangeText={setTeamName} placeholder={t("teamNamePh")} autoCapitalize="words" />
            </Field>
            <Field label={t("coachNameLabel")}>
              <Input value={coachName} onChangeText={setCoachName} placeholder={t("coachNamePh")} autoCapitalize="words" />
            </Field>
            <Button title={t("enterLeague")} onPress={submit} disabled={!canSubmit || busy} block />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Body muted style={{ marginHorizontal: space[3] }}>{t("or")}</Body>
            <View style={styles.dividerLine} />
          </View>

          <Button title={t("google")} variant="secondary" onPress={submitGoogle} disabled={busy} block />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], flexGrow: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: space[6] },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
});
