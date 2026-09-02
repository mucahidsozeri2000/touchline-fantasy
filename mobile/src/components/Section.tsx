import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export function HRule({ marginTop = 6, marginBottom = 10 }: { marginTop?: number; marginBottom?: number }) {
  return <View style={[styles.hr, { marginTop, marginBottom }]} />;
}

export function H6({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.h6, style]}>{children}</Text>;
}

export function SectionHeading({ title }: { title: string }) {
  return (
    <View>
      <H6>{title}</H6>
      <HRule />
    </View>
  );
}

const styles = StyleSheet.create({
  hr: { height: 2, backgroundColor: colors.divider },
  h6: {
    fontFamily: fonts.heading,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.text,
  },
});
