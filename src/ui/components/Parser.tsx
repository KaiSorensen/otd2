import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  SafeAreaView,
} from "react-native";
import { addItems } from "../../wdb/wdbService";
import { List } from "../../classes/List";
import { Item } from "../../classes/Item";
import { v4 as uuidv4 } from "uuid";

export interface Range {
  location: number;
  length: number;
}

export type ParserViewProps = {
  visible: boolean;
  onDismiss: () => void;
  list: List;
};

/** Fallback: one‑or‑more new‑lines of either LF or CRLF */
const GENERIC_DELIM = /\r?\n+/g;

/**
 * Regex helpers
 */
const NL_RE = /\r?\n/g;            // single newline token (CRLF or LF)
const SP_TAB = /[ \t]+/g;           // spaces and tabs only – no newlines

const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

/**
 * Build a constant‑width wildcard segment (e.g. .{3})
 */
const wild = (n: number) => (n > 0 ? `.{${n}}` : "");

/**
 * Infer a delimiter based _only_ on the gaps between **consecutive** highlighted ranges.
 * – requires ≥ 2 manual highlights
 * – ignores any text before the first highlight
 *
 *  ❖ Rule 2 (non‑newline single‑char delimiter) takes priority over Rule 3 (newline delimiter).
 */
function inferDelimiter(text: string, ranges: Range[]): RegExp | null {
  if (ranges.length < 2) return null;

  const sorted = [...ranges].sort((a, b) => a.location - b.location);
  const gaps = sorted.slice(0, -1).map((r, i) =>
    text.slice(r.location + r.length, sorted[i + 1].location)
  );

  // ───────────────────────────────────────────── Rule 2 ──────
  const anyNL = gaps.some((g) => NL_RE.test(g));
  if (!anyNL) {
    const distinctChars = new Set(gaps.join(""));
    if (distinctChars.size === 1) {
      const ch = [...distinctChars][0]!;
      const counts = gaps.map((g) => g.length);
      const uniform = counts.every((c) => c === counts[0]);
      if (uniform) {
        return new RegExp(`${reEscape(ch)}{${counts[0]}}`, "g");
      }
    }
  }

  // ───────────────────────────────────────────── Rule 3 ──────
  const nlCounts = gaps.map((g) => (g.match(NL_RE) || []).length);
  const uniformNL = nlCounts.every((c) => c === nlCounts[0]);
  if (!uniformNL || nlCounts[0] === 0) return GENERIC_DELIM;
  const NL = nlCounts[0];

  // Build wildcard counts around/between NL tokens using FIRST gap as the template
  // After stripping space/tab sequences adjacent to NL tokens.
  const template = gaps[0];
  const parts = template.split(NL_RE); // length = NL+1
  const counts: number[] = parts.map((p) => p.replace(SP_TAB, "").length);

  // Compose pattern: wildcard + [ \t]*\\r?\\n[ \t]* segments
  let pattern = "";
  for (let i = 0; i < NL; i++) {
    pattern += wild(counts[i]);
    pattern += `[\\t ]*\\r?\\n[\\t ]*`;
  }
  pattern += wild(counts[NL]);

  return new RegExp(pattern || GENERIC_DELIM.source, "g");
}

const ParserView: React.FC<ParserViewProps> = ({ visible, onDismiss, list }) => {
  const [plainText, setPlainText] = useState("");
  const [selection, setSelection] = useState<Range>({ location: 0, length: 0 });
  const [segments, setSegments] = useState<Range[]>([]);
  const [autoFilled, setAutoFilled] = useState(false);

  const cursorInRanges = useCallback(
    (rs: Range[]) =>
      rs.findIndex(
        (r) => selection.location >= r.location && selection.location <= r.location + r.length
      ),
    [selection]
  );
  const cursorInSegment = cursorInRanges(segments);

  const upsertRange = (ranges: Range[], next: Range): Range[] => {
    const overlap = (a: Range, b: Range) => {
      const aEnd = a.location + a.length;
      const bEnd = b.location + b.length;
      if (aEnd === b.location || bEnd === a.location) return 0;
      return Math.max(0, Math.min(aEnd, bEnd) - Math.max(a.location, b.location));
    };
    return [...ranges.filter((r) => overlap(r, next) <= 0), next].sort((a, b) => a.location - b.location);
  };

  const onChangeText = (t: string) => {
    setPlainText(t);
    setSegments([]);
    setAutoFilled(false);
  };
  const onSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    const { start, end } = e.nativeEvent.selection;
    setSelection({ location: start, length: end - start });
  };

  const toggleHighlight = () => {
    if (!selection.length) return;
    if (cursorInSegment >= 0) {
      setSegments((prev) => prev.filter((_, i) => i !== cursorInSegment));
    } else {
      setSegments((prev) => upsertRange(prev, { ...selection }));
    }
    setAutoFilled(false);
  };

  const autoFill = useCallback(() => {
    if (autoFilled) {
      setSegments((prev) => prev.slice(0, segments.length));
      setAutoFilled(false);
      return;
    }

    if (segments.length < 2) return;
    const delim = inferDelimiter(plainText, segments) ?? GENERIC_DELIM;
    const sorted = [...segments].sort((a, b) => a.location - b.location);
    const last = sorted[sorted.length - 1];
    const startPos = last.location + last.length;

    const next: Range[] = [];
    let cursor = startPos;
    let match: RegExpExecArray | null;
    delim.lastIndex = startPos;

    while ((match = delim.exec(plainText))) {
      const end = match.index;
      const slice = plainText.slice(cursor, end);
      const content = slice.replace(/^\s+|\s+$/g, "");
      if (content) {
        const loc = cursor + slice.indexOf(content);
        next.push({ location: loc, length: content.length });
      }
      cursor = match.index + match[0].length;
    }
    const tail = plainText.slice(cursor);
    const tailContent = tail.replace(/^\s+|\s+$/g, "");
    if (tailContent) {
      const loc = cursor + tail.indexOf(tailContent);
      next.push({ location: loc, length: tailContent.length });
    }

    setSegments([...segments, ...next]);
    setAutoFilled(true);
  }, [autoFilled, plainText, segments]);

  const makeItems = (): Item[] => {
    const src = segments.length ? segments : [{ location: 0, length: plainText.trim().length }];
    return src
      .sort((a, b) => a.location - b.location)
      .map((r, idx) => {
        // Extract the highlighted text, trim, replace tabs with &nbsp; and newlines with <br>
        const raw = plainText.slice(r.location, r.location + r.length).trim();
        const htmlContent = raw
          .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;") // 4 non-breaking spaces per tab
          .replace(/\r?\n/g, '<br>');
        return new Item(
          uuidv4(),
          list.id,
          htmlContent,
          null,
          idx,
          new Date(),
          new Date()
        );
      });
  };
  const persist = async () => {
    const items = makeItems().filter((i) => i.content);
    if (items.length) await addItems(items);
    onDismiss();
  };

  // Highlight overlay with trimmed-space debug highlights
  const HighlightLayer = useMemo(() => {
    if (!plainText) return null;
    const parts: { text: string; hl: boolean; ws: boolean }[] = [];
    let cursor = 0;
    const ordered = [...segments].sort((a, b) => a.location - b.location);
    ordered.forEach((r) => {
      if (cursor < r.location) {
        const pre = plainText.slice(cursor, r.location);
        parts.push({ text: pre, hl: false, ws: /^[ \t]+$/.test(pre) });
      }
      const mid = plainText.slice(r.location, r.location + r.length);
      parts.push({ text: mid, hl: true, ws: false });
      cursor = r.location + r.length;
    });
    if (cursor < plainText.length) {
      const post = plainText.slice(cursor);
      parts.push({ text: post, hl: false, ws: /^[ \t]+$/.test(post) });
    }
    return (
      <Text style={styles.hlText} pointerEvents="none">
        {parts.map((p, i) => (
          <Text
            key={i}
            style={
              p.hl
                ? styles.hlSpan
                : p.ws
                ? styles.wsSpan
                : undefined
            }
          >{p.text}</Text>
        ))}
      </Text>
    );
  }, [plainText, segments]);

  return (
    <Modal visible={visible} onRequestClose={onDismiss} animationType="slide">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <Pressable onPress={onDismiss} hitSlop={12}><Text style={styles.close}>×</Text></Pressable>
            <Text style={styles.title}>Parse Items</Text>
            <Pressable onPress={persist} hitSlop={12}><Text style={styles.done}>✔︎</Text></Pressable>
          </View>
          <ScrollView style={styles.scroll} keyboardDismissMode="interactive">
            <View style={styles.overlay}>{HighlightLayer}</View>
            <TextInput
              style={styles.input}
              multiline
              value={plainText}
              onChangeText={onChangeText}
              selection={{ start: selection.location, end: selection.location + selection.length }}
              onSelectionChange={onSelectionChange}
              placeholder="Paste text here…"
            />
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={styles.btn} onPress={autoFill}><Text style={styles.btnTxt}>{autoFilled ? "Clear" : "Auto‑Fill"}</Text></Pressable>
            <Pressable style={styles.btn} onPress={toggleHighlight}><Text style={styles.btnTxt}>{cursorInSegment >= 0 ? "Un‑highlight" : "Highlight"}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default ParserView;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f7" },
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#d1d1d6" },
  title: { fontSize: 18, fontWeight: "600" },
  close: { fontSize: 24 },
  done: { fontSize: 20 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0 },
  hlText: { fontSize: 16, lineHeight: 22 },
  hlSpan: { backgroundColor: "#0a84ff", color: "#fff", borderRadius: 4, paddingHorizontal: 2 },
  wsSpan: { backgroundColor: "rgba(255,0,0,0.3)" },
  input: { fontSize: 16, lineHeight: 22, color: "#000", backgroundColor: "transparent", padding: 0, textAlignVertical: "top" },
  actions: { flexDirection: "row", justifyContent: "space-evenly", padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#d1d1d6", backgroundColor: "#f9f9fb" },
  btn: { backgroundColor: "#d1d1d6", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  btnTxt: { fontSize: 14, fontWeight: "500" },
});
