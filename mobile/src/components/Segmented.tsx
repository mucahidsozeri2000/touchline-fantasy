import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.opt, i > 0 && styles.optBorder, active && styles.optActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", borderWidth: 1, borderColor: colors.divider, alignSelf: "flex-start", overflow: "hidden" },
  opt: { paddingVertical: 7, paddingHorizontal: 12 },
  optBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  optActive: { backgroundColor: colors.accent },
  label: { fontSize: 13, color: colors.text, fontFamily: fonts.body },
  labelActive: { color: colors.bg },
});
