import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

interface AvatarProps {
  size: number;
  initials: string;
  photoUrl?: string | null;
  circle?: boolean;
  borderColor?: string;
  borderWidth?: number;
  background?: string;
  textColor?: string;
  fontSize?: number;
}

export function Avatar({
  size,
  initials,
  photoUrl,
  circle = true,
  borderColor = colors.divider,
  borderWidth = 1,
  background = colors.bg,
  textColor = colors.text,
  fontSize,
}: AvatarProps) {
  const shape = { width: size, height: size, borderRadius: circle ? size / 2 : 0 };
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[shape, styles.img, { borderColor, borderWidth }]} />;
  }
  return (
    <View style={[shape, styles.base, { borderColor, borderWidth, backgroundColor: background }]}>
      <Text style={[styles.text, { color: textColor, fontSize: fontSize ?? Math.round(size * 0.32) }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  img: { resizeMode: "cover" },
  text: { fontFamily: fonts.heading },
});
