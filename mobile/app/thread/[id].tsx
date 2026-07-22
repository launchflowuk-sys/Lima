import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type Message, type Thread, type ThreadDraft } from "@/lib/api";
import {
  AnimatedListItem,
  Avatar,
  Badge,
  Button,
  EmptyState,
  HtmlBody,
  Screen,
  ScreenHeader,
  Skeleton,
} from "@/components/ui";
import { colors, font, radius, relativeTime, statusTone } from "@/constants/theme";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<ThreadDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<"approve" | "reject" | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.thread(id);
      setThread(data.thread);
      setMessages(data.messages);
      setDraft(data.draft);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Open the editable composer pre-filled with the existing AI draft.
  function reviewDraft() {
    if (!draft) return;
    setBody(draft.bodyText);
    setComposerOpen(true);
  }

  // No draft yet — ask the agent to generate one, then open it for editing.
  async function generate() {
    if (!id) return;
    setGenerating(true);
    try {
      const { draft: created } = await api.generateDraft(id);
      setDraft(created);
      setBody(created.bodyText);
      setComposerOpen(true);
    } catch (e) {
      Alert.alert("Couldn't generate reply", e instanceof Error ? e.message : "Error");
    } finally {
      setGenerating(false);
    }
  }

  async function approve() {
    if (!draft) return;
    setSending("approve");
    try {
      await api.approve(draft.id, body);
      setComposerOpen(false);
      setDraft(null);
      await load(); // pulls in the freshly sent outbound message + new thread status
    } catch (e) {
      Alert.alert("Send failed", e instanceof Error ? e.message : "Error");
    } finally {
      setSending(null);
    }
  }

  async function reject() {
    if (!draft) return;
    setSending("reject");
    try {
      await api.reject(draft.id);
      setComposerOpen(false);
      setDraft(null);
      await load();
    } catch (e) {
      Alert.alert("Reject failed", e instanceof Error ? e.message : "Error");
    } finally {
      setSending(null);
    }
  }

  const tone = thread ? statusTone(thread.status) : null;
  const bodyWidth = width - 84;
  const busy = sending !== null;

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        bar
        title={thread?.subject || "Thread"}
        subtitle={thread?.businessName}
        right={tone ? <Badge label={tone.label} fg={tone.fg} bg={tone.bg} dot /> : undefined}
      />

      {loading ? (
        <View style={{ padding: 20, gap: 16 }}>
          <Skeleton width="100%" height={130} radius={radius.xl} />
          <Skeleton width="100%" height={110} radius={radius.xl} />
          <Skeleton width="100%" height={150} radius={radius.xl} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Couldn't load thread" subtitle={error} />
      ) : messages.length === 0 ? (
        <EmptyState icon="message-square" title="No messages yet" subtitle="This conversation is empty." />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m, index) => (
              <AnimatedListItem key={m.id} index={index}>
                <MessageCard message={m} bodyWidth={bodyWidth} />
              </AnimatedListItem>
            ))}
          </ScrollView>

          <ReplyDock
            draft={draft}
            composerOpen={composerOpen}
            body={body}
            onChangeBody={setBody}
            generating={generating}
            sending={sending}
            busy={busy}
            onGenerate={generate}
            onReview={reviewDraft}
            onApprove={approve}
            onReject={reject}
            onCancel={() => setComposerOpen(false)}
          />
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

interface ReplyDockProps {
  draft: ThreadDraft | null;
  composerOpen: boolean;
  body: string;
  onChangeBody: (t: string) => void;
  generating: boolean;
  sending: "approve" | "reject" | null;
  busy: boolean;
  onGenerate: () => void;
  onReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}

/** Bottom reply surface: generate → review/edit → approve & send / reject. */
function ReplyDock({
  draft,
  composerOpen,
  body,
  onChangeBody,
  generating,
  sending,
  busy,
  onGenerate,
  onReview,
  onApprove,
  onReject,
  onCancel,
}: ReplyDockProps) {
  const blockedReason = draft?.autoSendBlockedReason ?? null;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        gap: 12,
      }}
    >
      {composerOpen && draft ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="zap" size={13} color={colors.violet} />
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.inkMuted }}>
              AI suggested reply — edit before sending
            </Text>
          </View>
          <View style={{ backgroundColor: colors.canvas, borderRadius: radius.lg, padding: 14 }}>
            <TextInput
              multiline
              value={body}
              onChangeText={onChangeBody}
              editable={!busy}
              style={{
                minHeight: 120,
                maxHeight: 220,
                fontFamily: font.regular,
                fontSize: 15,
                color: colors.ink,
                lineHeight: 22,
                textAlignVertical: "top",
              }}
            />
          </View>
          {blockedReason ? (
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.amber }}>
              Held for review: {blockedReason}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button
              label="Approve & send"
              icon="send"
              onPress={onApprove}
              loading={sending === "approve"}
              disabled={busy || !body.trim()}
              full={false}
              style={{ flex: 1 }}
            />
            <Button
              label="Reject"
              variant="secondary"
              onPress={onReject}
              loading={sending === "reject"}
              disabled={busy}
              full={false}
              style={{ width: 110 }}
            />
          </View>
          <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={busy} />
        </>
      ) : draft ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="zap" size={13} color={colors.violet} />
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.inkMuted }}>
              AI suggested reply
            </Text>
          </View>
          <Text
            numberOfLines={3}
            style={{ fontFamily: font.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 20 }}
          >
            {draft.bodyText}
          </Text>
          {blockedReason ? (
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.amber }}>
              Held for review: {blockedReason}
            </Text>
          ) : null}
          <Button label="Review & send" icon="corner-up-left" onPress={onReview} />
        </>
      ) : (
        <Button
          label="Generate AI reply"
          icon="zap"
          onPress={onGenerate}
          loading={generating}
          disabled={generating}
        />
      )}
    </View>
  );
}

function MessageCard({ message, bodyWidth }: { message: Message; bodyWidth: number }) {
  const outbound = message.direction === "outbound";
  const senderName = outbound ? "Agent Lima" : message.fromName || message.fromAddress || "Unknown sender";
  const senderAddress = outbound ? "Sent on your behalf" : message.fromAddress;

  return (
    <View
      style={{
        backgroundColor: outbound ? "#EFF6FF" : colors.surface,
        borderRadius: radius["2xl"],
        borderWidth: 1,
        borderColor: outbound ? "#DBEAFE" : colors.line,
        padding: 18,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Avatar name={senderName} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14.5, color: colors.ink }} numberOfLines={1}>
              {senderName}
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.inkMuted }}>
              {relativeTime(message.sentAt)}
            </Text>
          </View>
          {senderAddress ? (
            <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.inkMuted, marginTop: 1 }} numberOfLines={1}>
              {senderAddress}
            </Text>
          ) : null}
        </View>
        {outbound ? (
          <Badge label="Sent" fg={colors.primary} bg="#DBEAFE" />
        ) : null}
      </View>

      {/* Body */}
      <HtmlBody html={message.bodyHtmlSanitized} text={message.bodyText || message.snippet} width={bodyWidth} />
    </View>
  );
}
