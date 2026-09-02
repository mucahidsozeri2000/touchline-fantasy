import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { BackIcon } from "./Icons";

export function NavBar({
  title = "TOUCHLINE",
  right,
  onBack,
  backTitle,
}: {
  title?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  backTitle?: string;
}) {
  return (
    <View style={styles.wrap}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <BackIcon size={20} color={colors.text} />
        </Pressable>
      )}
      <Text style={styles.brand}>{onBack ? backTitle : title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
  },
  backBtn: { padding: 0 },
  brand: { fontFamily: fonts.heading, fontSize: 16, marginRight: "auto", color: colors.text },
});
