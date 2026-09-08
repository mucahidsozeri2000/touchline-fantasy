import React from "react";
import {
  View, Text, Pressable, TextInput, StyleSheet, ViewStyle, TextStyle,
  PressableProps, TextInputProps, ScrollView,
} from "react-native";
// react-native's own SafeAreaView is iOS-only — on Android it renders as a
// plain View and applies no insets at all, so content slides under the notch.
// Android draws edge-to-edge by default, which makes that very visible.
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius, space, type as ttype } from "../theme";

// ── Screen shell ─────────────────────────────────────────────────────────
// Tab screens sit above the tab bar, which insets itself, so they pass
// TAB_EDGES to avoid padding the bottom twice.
export const TAB_EDGES = ["top", "left", "right"] as const;

export function Screen({
  children,
  style,
  edges = ["top", "left", "right", "bottom"],
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: readonly ("top" | "bottom" | "left" | "right")[];
}) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

export function HR({ style }: { style?: ViewStyle }) {
  return <View style={[styles.hr, style]} />;
}

// ── Nav bar ──────────────────────────────────────────────────────────────
export function NavBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const { ChevronLeft } = require("lucide-react-native");
  return (
    <View style={styles.nav}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 2 }}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
      ) : null}
      <Text style={styles.navBrand}>{title}</Text>
      {right}
    </View>
  );
}

// ── Text primitives ──────────────────────────────────────────────────────
export function H(props: { level?: 1 | 2 | 3 | 4 | 5 | 6; style?: TextStyle; children: React.ReactNode }) {
  const size = { 1: ttype.h1, 2: ttype.h2, 3: ttype.h3, 4: ttype.h4, 5: ttype.h5, 6: ttype.h6 }[props.level ?? 4];
  return (
    <Text
      style={[
        { fontFamily: font.headingFamily, fontWeight: "800", color: colors.text, fontSize: size, lineHeight: size * 1.15 },
        props.level === 6 ? { letterSpacing: 1, textTransform: "uppercase" } : null,
        props.style,
      ]}
    >
      {props.children}
    </Text>
  );
}

export function Body({ style, muted, children }: { style?: TextStyle; muted?: boolean; children: React.ReactNode }) {
  return (
    <Text style={[{ fontFamily: font.bodyFamily, fontSize: ttype.body, color: muted ? colors.textMuted : colors.text, lineHeight: 21 }, style]}>
      {children}
    </Text>
  );
}

export function Micro({ style, children }: { style?: TextStyle; children: React.ReactNode }) {
  return <Text style={[{ fontFamily: font.bodyFamily, fontSize: ttype.micro, color: colors.textMuted }, style]}>{children}</Text>;
}

// ── Buttons ──────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost";
export function Button({
  title, onPress, variant = "primary", disabled, block, icon, style, textStyle, inverted,
}: {
  title: string; onPress?: () => void; variant?: BtnVariant; disabled?: boolean; block?: boolean;
  icon?: React.ReactNode; style?: ViewStyle; textStyle?: TextStyle; inverted?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btnBase,
        variant === "primary" && { backgroundColor: inverted ? colors.white : colors.accent },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.divider, backgroundColor: "transparent" },
        variant === "ghost" && { backgroundColor: "transparent", paddingHorizontal: 4 },
        block && { width: "100%", justifyContent: "flex-start" },
        pressed && variant === "primary" && { backgroundColor: inverted ? colors.neutral200 : colors.accent600 },
        pressed && variant === "secondary" && { backgroundColor: "rgba(32,30,29,0.07)" },
        pressed && variant === "ghost" && { backgroundColor: colors.accent100 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.btnText,
          variant === "primary" && { color: inverted ? colors.accent : colors.bg },
          variant === "secondary" && { color: colors.text },
          variant === "ghost" && { color: colors.accent },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.neutral200 }, style]}>
      {children}
    </Pressable>
  );
}

// ── Tags ─────────────────────────────────────────────────────────────────
type TagVariant = "accent" | "neutral" | "outline";
export function Tag({ label, variant = "neutral", style, textStyle }: { label: string; variant?: TagVariant; style?: ViewStyle; textStyle?: TextStyle }) {
  return (
    <View
      style={[
        styles.tag,
        variant === "accent" && { backgroundColor: colors.accent100 },
        variant === "neutral" && { backgroundColor: colors.neutral100 },
        variant === "outline" && { borderWidth: 1, borderColor: colors.accent },
        style,
      ]}
    >
      <Text
        style={[
          styles.tagText,
          variant === "accent" && { color: colors.accent800 },
          variant === "neutral" && { color: colors.neutral800 },
          variant === "outline" && { color: colors.accent },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Fields ───────────────────────────────────────────────────────────────
export function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 5 }}>
      {label ? <Micro style={{ color: colors.text, opacity: 0.7 }}>{label}</Micro> : null}
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, props.style]}
      {...props}
    />
  );
}

// ── Segmented control ────────────────────────────────────────────────────
export function Segmented<T extends string>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segOpt, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.divider }, active && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.segOptText, active && { color: colors.bg }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Stat cell row ────────────────────────────────────────────────────────
export function StatRow({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 1, backgroundColor: colors.divider }}>
      {items.map((it, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: colors.bg, padding: space[3] }}>
          <Micro>{it.label}</Micro>
          <H level={4} style={{ marginTop: 2 }}>{String(it.value)}</H>
        </View>
      ))}
    </View>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────
export function Avatar({ initials, size = 40, accentColor, ring }: { initials: string; size?: number; accentColor?: string; ring?: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface,
          borderWidth: ring ? 2 : 1, borderColor: ring ? colors.accent : colors.divider,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: font.headingFamily, fontWeight: "800", fontSize: size * 0.32, color: colors.text }}>{initials}</Text>
      </View>
      {accentColor ? (
        <View style={{ position: "absolute", top: -1, right: -1, width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, backgroundColor: accentColor, borderWidth: 1.5, borderColor: colors.bg }} />
      ) : null}
    </View>
  );
}

// ── Simple table ─────────────────────────────────────────────────────────
export function Table({ columns, rows, rowKey }: { columns: { key: string; label: string; flex?: number; align?: "left" | "right" }[]; rows: any[]; rowKey: (r: any) => string }) {
  return (
    <View>
      <View style={styles.tableHeaderRow}>
        {columns.map((c) => (
          <Text key={c.key} style={[styles.tableHeaderCell, { flex: c.flex ?? 1, textAlign: c.align ?? "left" }]}>{c.label}</Text>
        ))}
      </View>
      {rows.map((r) => (
        <View key={rowKey(r)} style={[styles.tableRow, r.highlight && { backgroundColor: colors.accent100 }]}>
          {columns.map((c) => (
            <Text key={c.key} style={[styles.tableCell, { flex: c.flex ?? 1, textAlign: c.align ?? "left" }, r.highlight && { fontWeight: "700" }]}>
              {r[c.key]}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Bottom sheet ─────────────────────────────────────────────────────────
export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(45,43,43,0.5)" }]} onPress={onClose} />
      <View style={styles.sheet}>
        <ScrollView bounces={false}>{children}</ScrollView>
      </View>
    </View>
  );
}

export function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: space[8], gap: space[2] }}>
      {icon}
      <Body muted style={{ textAlign: "center" }}>{text}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  hr: { height: 2, backgroundColor: colors.divider, marginVertical: space[4] },
  nav: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 2, borderBottomColor: colors.divider },
  navBrand: { fontFamily: font.headingFamily, fontWeight: "800", fontSize: 16, marginRight: "auto", color: colors.text },
  btnBase: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: space[2], paddingHorizontal: space[3] * 1.2, borderRadius: radius.md },
  btnText: { fontFamily: font.headingFamily, fontWeight: "800", fontSize: 14 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  tag: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 0 },
  tagText: { fontSize: 11, letterSpacing: 0.3, fontFamily: font.bodyFamily },
  input: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md, fontFamily: font.bodyFamily },
  seg: { flexDirection: "row", borderWidth: 1, borderColor: colors.divider, overflow: "hidden" },
  segOpt: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 10 },
  segOptText: { fontSize: 13, color: colors.text, fontFamily: font.bodyFamily },
  card: { backgroundColor: colors.surface, padding: space[3], gap: space[2] },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: colors.divider, paddingBottom: 8, marginBottom: 4 },
  tableHeaderCell: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textMuted, fontFamily: font.bodyFamily },
  tableRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tableCell: { fontSize: 14, color: colors.text, fontFamily: font.bodyFamily },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "75%", backgroundColor: colors.bg, borderTopWidth: 2, borderTopColor: colors.divider, padding: space[4] },
});
