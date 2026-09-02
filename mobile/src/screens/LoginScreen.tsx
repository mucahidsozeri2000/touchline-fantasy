import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../AuthContext";
import { Button } from "../components/Button";
import { GoogleIcon } from "../components/Icons";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { register, guestLogin } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [busy, setBusy] = useState(false);

  const disabled = !teamName.trim() || !coachName.trim() || busy;

  const enterLeague = async () => {
    setBusy(true);
    try {
      await register(teamName.trim(), coachName.trim());
      navigation.replace("Onboarding");
    } catch (e) {
      Alert.alert("Couldn't create your account", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    setBusy(true);
    try {
      await guestLogin();
      navigation.replace("Onboarding");
    } catch (e) {
      Alert.alert("Couldn't sign in", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>TOUCHLINE</Text>
        <Text style={styles.subtitle}>Draft your Champions League squad and manage it like a Head Coach.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Team Name</Text>
          <TextInput style={styles.input} placeholder="e.g. FC Northbank" placeholderTextColor={colors.textMuted50} value={teamName} onChangeText={setTeamName} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Head Coach Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Alex Morgan" placeholderTextColor={colors.textMuted50} value={coachName} onChangeText={setCoachName} />
        </View>
        <Button title="Enter League" onPress={enterLeague} disabled={disabled} block />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button title="Continue with Google" onPress={signInGoogle} variant="secondary" block left={<GoogleIcon />} disabled={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingVertical: 32, justifyContent: "center", gap: 28 },
  titleBlock: { gap: 6 },
  title: { fontFamily: fonts.heading, fontSize: 26, letterSpacing: 0.5, color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted55, lineHeight: 18, fontFamily: fonts.body },
  form: { gap: 14 },
  field: { gap: 5 },
  label: { fontSize: 12, color: colors.textMuted70, fontFamily: fonts.body },
  input: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerLabel: { fontSize: 11, color: colors.textMuted50, fontFamily: fonts.body },
});
