import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/types";
import { api } from "../api";
import type { DraftFeedEvent } from "../api";
import { useAppState } from "../AppState";
import { NavBar } from "../components/NavBar";
import { HRule } from "../components/Section";
import { Avatar } from "../components/Avatar";
import { colors, fonts } from "../theme";
import { relativeTime } from "../format";

type Props = BottomTabScreenProps<TabParamList, "DraftFeed">;

export function DraftFeedScreen({ navigation }: Props) {
  const { socket } = useAppState();
  const [events, setEvents] = useState<DraftFeedEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.draftFeed().then(setEvents).catch(() => {});
    }, [])
  );

  useEffect(() => {
    if (!socket) return;
    const onNew = (ev: DraftFeedEvent) => setEvents((prev) => [ev, ...prev]);
    socket.on("draft:new", onNew);
    return () => {
      socket.off("draft:new", onNew);
    };
  }, [socket]);

  return (
    <View style={styles.screen}>
      <NavBar onBack={() => navigation.navigate("Home")} backTitle="DRAFT FEED" />
      <View style={styles.intro}>
        <Text style={styles.introText}>Every player can be drafted by one manager only</Text>
        <HRule marginTop={10} marginBottom={0} />
      </View>
      <FlatList
        data={events}
        keyExtractor={(ev) => ev.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar size={32} initials={item.initials} />
            <View style={styles.mid}>
              <Text style={styles.line}>
                <Text style={[styles.manager, item.isMe && { color: colors.accent700 }]}>{item.manager}</Text>
                <Text style={styles.plain}> drafted </Text>
                <Text style={styles.player}>{item.player}</Text>
              </Text>
              <Text style={styles.sub}>
                {item.posLabel} · {item.club}
              </Text>
            </View>
            <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  intro: { paddingHorizontal: 16, paddingTop: 16 },
  introText: { fontSize: 11, color: colors.textMuted55, fontFamily: fonts.body },
  list: { paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  mid: { flex: 1, gap: 2 },
  line: { fontSize: 13, lineHeight: 17 },
  manager: { fontFamily: fonts.heading, color: colors.text },
  plain: { color: colors.text, fontFamily: fonts.body },
  player: { fontFamily: fonts.heading, color: colors.text },
  sub: { fontSize: 11, color: colors.textMuted55, fontFamily: fonts.body },
  time: { fontSize: 10, color: colors.textMuted45, fontFamily: fonts.body },
});
