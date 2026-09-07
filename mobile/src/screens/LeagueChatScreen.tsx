import React, { useRef, useState } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, NavBar, Body, Micro, Tag, Input, IconButton, EmptyState } from "../components/ui";
import { colors, space } from "../theme";
import { useApp } from "../store/AppContext";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { Send, MessageCircle } from "lucide-react-native";

type ChatMessage = { id: string; sender: string; text: string; sentAt: string; me: boolean };

export default function LeagueChatScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { leagueId, leagueName } = useApp();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);

  const chatQ = useQuery({
    queryKey: ["chat", leagueId],
    queryFn: () => api.chat(leagueId!),
    enabled: !!leagueId,
    refetchInterval: 4000,
  });

  const sendMut = useMutation({
    mutationFn: (text: string) => api.sendChat(leagueId!, text),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["chat", leagueId] });
    },
  });

  if (!leagueId) {
    return (
      <Screen>
        <NavBar title={t("leagueChatTitle")} onBack={() => navigation.goBack()} />
        <EmptyState icon={<MessageCircle size={28} color={colors.textMuted} />} text={t("errorGeneric")} />
      </Screen>
    );
  }

  const messages = (chatQ.data as ChatMessage[] | undefined) ?? [];

  const submit = () => {
    const text = draft.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  };

  return (
    <Screen>
      <NavBar title={t("leagueChatTitle")} onBack={() => navigation.goBack()} right={leagueName ? <Tag label={leagueName} variant="outline" /> : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        {messages.length === 0 ? (
          <EmptyState icon={<MessageCircle size={28} color={colors.textMuted} />} text={t("noMessagesYet")} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: space[4], gap: space[3] }}
            renderItem={({ item }) => <ChatBubble message={item} locale={i18n.language} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={styles.inputBar}>
          <View style={{ flex: 1 }}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={t("chatPlaceholder")}
              onSubmitEditing={submit}
              returnKeyType="send"
              blurOnSubmit={false}
            />
          </View>
          <IconButton onPress={submit} style={{ backgroundColor: colors.accent }}>
            <Send size={18} color={colors.bg} />
          </IconButton>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ChatBubble({ message, locale }: { message: ChatMessage; locale: string }) {
  const { t } = useTranslation();
  const label = message.me ? t("you") : message.sender;
  return (
    <View style={{ alignItems: message.me ? "flex-end" : "flex-start" }}>
      <View style={[styles.bubbleMeta, { flexDirection: message.me ? "row-reverse" : "row" }]}>
        <Micro style={{ fontWeight: "700" as any }}>{label}</Micro>
        <Micro>{relativeTime(message.sentAt, locale, t)}</Micro>
      </View>
      <View style={[styles.bubble, message.me ? styles.bubbleMe : styles.bubbleOther]}>
        <Body style={message.me ? { color: colors.accent800 } : undefined}>{message.text}</Body>
      </View>
    </View>
  );
}

function relativeTime(iso: string, _locale: string, t: (key: string, opts?: any) => string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("minutesShort", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursShort", { n: hours });
  const days = Math.floor(hours / 24);
  return t("daysShort", { n: days });
}

const styles = StyleSheet.create({
  bubbleMeta: { gap: space[2], marginBottom: 3, alignItems: "baseline" },
  bubble: { maxWidth: "82%", paddingVertical: space[2], paddingHorizontal: space[3] },
  bubbleMe: { backgroundColor: colors.accent100 },
  bubbleOther: { backgroundColor: colors.surface },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    padding: space[3],
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
});
