import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export function Tag({ label, variant = "outline" }: { label: string; variant?: "outline" | "accent" }) {
  return (
    <View style={[styles.base, variant === "outline" ? styles.outline : styles.accent]}>
      <Text style={[styles.label, variant === "outline" ? styles.labelOutline : styles.labelAccent]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 3, paddingHorizontal: 10, alignSelf: "flex-start" },
  outline: { borderWidth: 1, borderColor: colors.accent },
  accent: { backgroundColor: colors.accent100 },
  label: { fontSize: 11, letterSpacing: 0.2, fontFamily: fonts.body },
  labelOutline: { color: colors.accent },
  labelAccent: { color: colors.accent800 },
});
