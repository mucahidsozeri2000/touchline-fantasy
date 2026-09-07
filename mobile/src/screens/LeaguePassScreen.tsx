import React, { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Check, Ban } from "lucide-react-native";
import { Screen, H, Body, Micro, Tag, Card, Button, IconButton, HR, EmptyState } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Plan = { id: string; name: string; priceLabel: string; amountCents: number; detail: string };
type Unlock = { title: string; body: string };
type Paywall = { isPro: boolean; plans: Plan[]; unlocks: Unlock[]; neverForSale: string[] };

export default function LeaguePassScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId } = useApp();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const paywallQ = useQuery({
    queryKey: ["paywall", leagueId],
    queryFn: () => api.paywall(leagueId!) as Promise<Paywall>,
    enabled: !!leagueId,
  });

  const purchaseMut = useMutation({
    mutationFn: (plan: string) => api.purchase(leagueId!, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paywall", leagueId] });
    },
  });

  if (!leagueId) {
    return (
      <Screen>
        <TopBar onClose={() => navigation.goBack()} title={t("upgrade")} />
        <EmptyState icon={<X size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const data = paywallQ.data;
  const isPro = data?.isPro;
  const plan = data?.plans.find((p) => p.id === selectedPlan) ?? data?.plans[0];

  return (
    <Screen>
      <TopBar onClose={() => navigation.goBack()} title={t("upgrade")} />
      <ScrollView contentContainerStyle={{ paddingBottom: space[8] }}>
        <View style={{ backgroundColor: colors.accent, padding: space[4] }}>
          <H level={3} style={{ color: colors.bg }}>{t("onePayment")}</H>
          <Body style={{ color: colors.accent100, marginTop: 4 }}>{t("runSeasonUnlocked")}</Body>
          {isPro ? (
            <Tag label={t("purchased")} variant="neutral" style={{ marginTop: space[3], alignSelf: "flex-start", backgroundColor: colors.bg }} />
          ) : null}
        </View>

        <View style={{ padding: space[4], gap: space[3] }}>
          {isPro ? <Body muted>{t("proActive")}</Body> : null}

          {data?.plans.map((p) => {
            const active = (selectedPlan ?? data.plans[0]?.id) === p.id;
            return (
              <Pressable key={p.id} onPress={() => setSelectedPlan(p.id)}>
                <Card style={active ? { borderWidth: 2, borderColor: colors.accent } : { borderWidth: 1, borderColor: colors.divider }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                      <View style={[styles.radio, active && styles.radioActive]} />
                      <H level={5}>{p.name}</H>
                    </View>
                    <Body style={{ fontWeight: "700" as const }}>{p.priceLabel}</Body>
                  </View>
                  <Body muted>{p.detail}</Body>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <HR style={{ marginHorizontal: space[4] }} />

        <View style={{ padding: space[4], gap: space[2] }}>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{t("whatUnlocks")}</Micro>
          {data?.unlocks.map((u, i) => (
            <View key={i} style={{ flexDirection: "row", gap: space[2], alignItems: "flex-start" }}>
              <Check size={16} color={colors.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Body>{u.title}</Body>
                <Micro>{u.body}</Micro>
              </View>
            </View>
          ))}
        </View>

        <View style={{ padding: space[4], gap: space[2], backgroundColor: colors.surface, marginHorizontal: space[4] }}>
          <Micro style={{ letterSpacing: 1, textTransform: "uppercase" }}>{t("neverForSale")}</Micro>
          {data?.neverForSale.map((line, i) => (
            <View key={i} style={{ flexDirection: "row", gap: space[2], alignItems: "flex-start" }}>
              <Ban size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
              <Body muted style={{ flex: 1 }}>{line}</Body>
            </View>
          ))}
        </View>

        <View style={{ padding: space[4], gap: space[2] }}>
          <Button
            title={
              purchaseMut.isSuccess || isPro
                ? t("purchased")
                : plan
                ? t("getPlan", { name: plan.name })
                : t("loading")
            }
            onPress={() => plan && purchaseMut.mutate(plan.id)}
            disabled={!plan || isPro || purchaseMut.isPending || purchaseMut.isSuccess}
            block
          />
          <Button title={t("stayOnFree")} onPress={() => navigation.goBack()} variant="ghost" block />
        </View>
      </ScrollView>
    </Screen>
  );
}

function TopBar({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <View style={styles.nav}>
      <IconButton onPress={onClose}>
        <X size={20} color={colors.text} />
      </IconButton>
      <H level={4} style={{ marginLeft: space[1] }}>{title}</H>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row", alignItems: "center", gap: space[1],
    paddingHorizontal: space[3], paddingVertical: space[3],
    borderBottomWidth: 2, borderBottomColor: colors.divider,
  },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.divider },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },
});
