import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen, H, Body, Field, Input, Button, Segmented } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";

const MIN_PASSWORD_LENGTH = 8;

export default function LoginScreen() {
  const { t } = useTranslation();
  const { register, login, language, setLanguage } = useApp();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signingUp = mode === "signUp";
  const canSubmit =
    email.trim().includes("@") &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (!signingUp || (teamName.trim().length > 0 && coachName.trim().length > 0));

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Setting `manager` (inside register/login) is what flips RootNavigator
      // to its authenticated stack — no manual navigation needed here.
      if (signingUp) {
        await register({
          email: email.trim(),
          password,
          teamName: teamName.trim(),
          coachName: coachName.trim(),
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      // Shown in the form rather than an Alert: the reason a sign-in failed is
      // the whole point of this screen, and Alert is a no-op on web.
      setError(err?.message ?? String(err));
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

          <View style={{ marginTop: space[6] }}>
            <Segmented
              value={mode}
              onChange={(v) => { setMode(v as "signIn" | "signUp"); setError(null); }}
              options={[
                { label: t("signIn"), value: "signIn" },
                { label: t("signUp"), value: "signUp" },
              ]}
            />
          </View>

          <View style={{ marginTop: space[6], gap: space[4] }}>
            <Field label={t("emailLabel")}>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder={t("emailPh")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </Field>
            <Field label={t("passwordLabel")} hint={signingUp ? t("passwordHint") : undefined}>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder={t("passwordPh")}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType={signingUp ? "newPassword" : "password"}
              />
            </Field>

            {signingUp ? (
              <>
                <Field label={t("teamNameLabel")}>
                  <Input value={teamName} onChangeText={setTeamName} placeholder={t("teamNamePh")} autoCapitalize="words" />
                </Field>
                <Field label={t("coachNameLabel")}>
                  <Input value={coachName} onChangeText={setCoachName} placeholder={t("coachNamePh")} autoCapitalize="words" />
                </Field>
              </>
            ) : null}

            {error ? (
              <View style={styles.error}>
                <Body style={{ color: colors.accent700 }}>{error}</Body>
              </View>
            ) : null}

            <Button
              title={signingUp ? t("createAccount") : t("signIn")}
              onPress={submit}
              disabled={!canSubmit || busy}
              block
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], flexGrow: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  error: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: space[3], paddingVertical: space[2] },
});
