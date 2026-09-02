import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  block?: boolean;
  disabled?: boolean;
  left?: React.ReactNode;
  style?: any;
}

export function Button({ title, onPress, variant = "primary", block, disabled, left, style }: ButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        block && styles.block,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {left}
        <Text
          style={[
            styles.label,
            variant === "primary" && styles.labelPrimary,
            variant === "secondary" && styles.labelSecondary,
            variant === "ghost" && styles.labelGhost,
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" },
  block: { width: "100%", alignSelf: "stretch" },
  primary: { backgroundColor: colors.accent },
  secondary: { borderColor: colors.divider, backgroundColor: "transparent" },
  ghost: { backgroundColor: "transparent", paddingHorizontal: 4 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.heading, fontSize: 14, letterSpacing: 0 },
  labelPrimary: { color: colors.bg },
  labelSecondary: { color: colors.text },
  labelGhost: { color: colors.accent },
});
