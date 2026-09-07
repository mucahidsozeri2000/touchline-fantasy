import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Minus, Plus } from "lucide-react-native";
import { Screen, NavBar, H, Body, Micro, Field, Input, Button, Segmented, Tag, HR, Table } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";

export default function LeagueSetupScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { setActiveLeague } = useApp();
  const [tab, setTab] = useState<"create" | "join">("create");

  // Create tab state
  const [name, setName] = useState("");
  const [managersText, setManagersText] = useState("8");
  const [budget, setBudget] = useState(120);
  const [opens, setOpens] = useState("Sat 12 Sep · 18:30");
  const [closes, setCloses] = useState("Sat 19 Sep · 18:30");
  const [created, setCreated] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const managersNum = parseInt(managersText, 10);
  const managersValid = Number.isFinite(managersNum) && managersNum >= 4 && managersNum <= 20;

  function bumpManagers(delta: number) {
    const base = Number.isFinite(managersNum) ? managersNum : 8;
    const next = Math.min(20, Math.max(4, base + delta));
    setManagersText(String(next));
  }

  async function createLeague() {
    if (!name.trim() || !managersValid || busy) return;
    setBusy(true);
    try {
      const league = await api.createLeague({
        name: name.trim(),
        managerCap: managersNum,
        budgetPerManager: budget,
        auctionOpensAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        auctionClosesAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      });
      setCreated(league);
      setActiveLeague(league.id, league.name);
    } catch (err: any) {
      Alert.alert(t("errorGeneric"), err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  // Join tab state
  const [code, setCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [openLeagues, setOpenLeagues] = useState<any[] | null>(null);

  async function loadOpenLeagues() {
    setOpenLeagues(await api.openLeagues());
  }
  React.useEffect(() => {
    if (tab === "join" && openLeagues === null) loadOpenLeagues();
  }, [tab]);

  async function joinByCode(inviteCode: string) {
    if (!inviteCode.trim() || joinBusy) return;
    setJoinBusy(true);
    try {
      const league = await api.joinLeague(inviteCode.trim());
      setActiveLeague(league.id, league.name);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t("errorGeneric"), err.message ?? String(err));
    } finally {
      setJoinBusy(false);
    }
  }

  return (
    <Screen>
      <NavBar title={t("setupTitle")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { label: t("create"), value: "create" },
            { label: t("join"), value: "join" },
          ]}
        />

        {tab === "create" ? (
          created ? (
            <View style={{ gap: space[4] }}>
              <View style={styles.codePanel}>
                <Micro>{t("inviteCode")}</Micro>
                <H level={3} style={{ letterSpacing: 4, marginTop: 4 }}>{created.inviteCode}</H>
                <Tag label={t("share")} variant="outline" style={{ marginTop: space[2] }} />
              </View>
              <Table
                columns={[{ key: "k", label: "" }, { key: "v", label: "", align: "right" }]}
                rowKey={(r) => r.k}
                rows={[
                  { k: t("managers"), v: managersNum },
                  { k: t("budgetPerManager"), v: `£${budget}m` },
                  { k: t("opens"), v: opens },
                  { k: t("closes"), v: closes },
                ]}
              />
              <Button title={t("tabHome")} onPress={() => navigation.goBack()} block />
            </View>
          ) : (
            <View style={{ gap: space[4] }}>
              <Field label={t("leagueNameLabel")}>
                <Input value={name} onChangeText={setName} placeholder={t("leagueNamePh")} />
              </Field>

              <Field label={t("managers")}>
                <View style={styles.stepperRow}>
                  <Pressable style={styles.stepperBtn} onPress={() => bumpManagers(-1)}>
                    <Minus size={16} color={colors.text} />
                  </Pressable>
                  <Input
                    value={managersText}
                    onChangeText={setManagersText}
                    keyboardType="number-pad"
                    style={{ flex: 1, textAlign: "center" }}
                  />
                  <Pressable style={styles.stepperBtn} onPress={() => bumpManagers(1)}>
                    <Plus size={16} color={colors.text} />
                  </Pressable>
                </View>
                <Micro style={{ marginTop: 4 }}>
                  {managersValid
                    ? `${managersNum} ${managersNum % 2 === 0 ? t("evenHint") : t("oddHint")}`
                    : "Enter 4–20"}
                </Micro>
              </Field>

              <Field label={t("budgetPerManager")}>
                <View style={styles.stepperRow}>
                  <Pressable style={styles.stepperBtn} onPress={() => setBudget((b) => Math.max(60, b - 10))}>
                    <Minus size={16} color={colors.text} />
                  </Pressable>
                  <Body style={{ flex: 1, textAlign: "center" }}>£{budget}m</Body>
                  <Pressable style={styles.stepperBtn} onPress={() => setBudget((b) => Math.min(300, b + 10))}>
                    <Plus size={16} color={colors.text} />
                  </Pressable>
                </View>
              </Field>

              <HR />
              <Micro style={{ textTransform: "uppercase", letterSpacing: 1 }}>{t("auctionWindow")}</Micro>
              <Field label={t("opens")}>
                <Input value={opens} onChangeText={setOpens} />
              </Field>
              <Field label={t("closes")}>
                <Input value={closes} onChangeText={setCloses} />
              </Field>
              <Micro>{t("openSaleNote")}</Micro>

              <Button
                title={t("createLeague")}
                onPress={createLeague}
                disabled={!name.trim() || !managersValid || busy}
                block
              />
            </View>
          )
        ) : (
          <View style={{ gap: space[4] }}>
            <Field label={t("joinWithCode")}>
              <View style={styles.stepperRow}>
                <Input value={code} onChangeText={setCode} style={{ flex: 1 }} autoCapitalize="characters" />
                <Button title={t("join")} onPress={() => joinByCode(code)} disabled={!code.trim() || joinBusy} />
              </View>
            </Field>

            <HR />
            <Micro style={{ textTransform: "uppercase", letterSpacing: 1 }}>{t("openLeagues")}</Micro>
            {(openLeagues ?? []).map((l) => (
              <Pressable key={l.id} style={styles.leagueRow} onPress={() => joinByCode(l.inviteCode)}>
                <View>
                  <Body>{l.name}</Body>
                  <Micro>{l.seatsFilled}/{l.seatsTotal} {t("seatsFilled")}</Micro>
                </View>
                <Tag label={t("join")} variant="outline" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codePanel: { padding: space[4], backgroundColor: colors.surface, alignItems: "flex-start" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  stepperBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.divider },
  leagueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider },
});
