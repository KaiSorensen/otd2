import React, { useCallback, useMemo, useState, useRef } from "react";
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
const NL_RE = /\r?\n/g;
const SP_TAB = /[ \t]+/g;
const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
const wild = (n: number) => (n > 0 ? `(?:\\d+|[^\\d]){${n}}` : "");

/**
 * Infer delimiter regex from manual highlights
 */
function inferDelimiter(text: string, ranges: Range[]): RegExp | null {
  if (ranges.length < 2) return null;
  const sorted = [...ranges].sort((a, b) => a.location - b.location);
  const gaps = sorted.slice(0, -1).map((r, i) =>
    text.slice(r.location + r.length, sorted[i + 1].location)
  );

  // ── NEW: treat digit‑runs as a placeholder and ignore spaces/tabs ──
  const placeholder = "@N@";
  const normalized = gaps.map(g =>
    g
      // replace any sequence of digits with the same token
      .replace(/\d+/g, placeholder)
      // strip all spaces and tabs (but leave newlines intact)
      .replace(/[ \t]+/g, "")
  );
  console.log("gaps:", gaps.map(g => JSON.stringify(g)));
  console.log("normalized:", normalized);
  console.log("allEqual?", normalized.every(n => n === normalized[0]));

  if (normalized.every(n => n === normalized[0])) {
    // build a literal regex from the original gap, but:
    // 1) replace digits → placeholder
    // 2) strip spaces/tabs
    // 3) escape newline as literal \r?\n
    let rawGap = gaps[0]
      .replace(/\d+/g, placeholder)
      .replace(/[ \t]+/g, "")
      .replace(/\r?\n/g, "\\r?\\n");

    // escape everything except our placeholder
    let escaped = reEscape(rawGap);

    // restore \d+ for each placeholder
    let pattern = escaped.replace(new RegExp(placeholder, "g"), "\\d+");
    return new RegExp(pattern, "g");
  }

  // ── remaining rules unchanged ──

  // Rule 2: single‑char non‑newline delimiter
  const anyNL = gaps.some(g => NL_RE.test(g));
  if (!anyNL) {
    const chars = new Set(gaps.join(""));
    if (chars.size === 1) {
      const ch = [...chars][0]!;
      const counts = gaps.map(g => g.length);
      if (counts.every(c => c === counts[0])) {
        return new RegExp(`${reEscape(ch)}{${counts[0]}}`, "g");
      }
    }
  }

  // Rule 3: newline‑based delimiter
  const nlCounts = gaps.map(g => (g.match(NL_RE) || []).length);
  const uniformNL = nlCounts.every(c => c === nlCounts[0]);
  if (!uniformNL || nlCounts[0] === 0) return GENERIC_DELIM;
  const NL = nlCounts[0];
  const parts = gaps[0].split(NL_RE);
  const counts = parts.map(p => {
    // remove only spaces/tabs here, then count digit‑runs + other chars
    const trimmed = p.replace(/[ \t]+/g, "");
    const digitUnits = (trimmed.match(/\d+/g) || []).length;
    const nonDigitUnits = trimmed.replace(/\d+/g, "").length;
    return digitUnits + nonDigitUnits;
  });

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
  const manualCountRef = useRef(0);

  const cursorInSegment = useMemo(
    () =>
      segments.findIndex(
        (r) =>
          selection.location >= r.location &&
          selection.location <= r.location + r.length
      ),
    [selection, segments]
  );

  const upsertRange = (ranges: Range[], next: Range): Range[] => {
    const overlap = (a: Range, b: Range) => {
      const aEnd = a.location + a.length;
      const bEnd = b.location + b.length;
      return Math.max(0, Math.min(aEnd, bEnd) - Math.max(a.location, b.location));
    };
    return [...ranges.filter((r) => overlap(r, next) <= 0), next].sort(
      (a, b) => a.location - b.location
    );
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
    // toggle‑off if already auto‑filled
    if (autoFilled) {
      console.log("Clearing auto‑filled segments");
      setSegments(prev => prev.slice(0, manualCountRef.current));
      setAutoFilled(false);
      return;
    }
    if (segments.length < 2) return;
  
    manualCountRef.current = segments.length;
  
    // 1) infer your delimiter from the raw text+highlights
    const delim = inferDelimiter(plainText, segments) ?? GENERIC_DELIM;
  
    // 2) build a whitespace‑stripped version of plainText, but record an index map
    const indexMap: number[] = [];
    let matchText = "";
    for (let i = 0; i < plainText.length; i++) {
      const ch = plainText[i];
      if (ch === " " || ch === "\t") continue;   // drop spaces/tabs
      matchText += ch;
      indexMap.push(i);                          // map stripped idx → original idx
    }
  
    // 3) sort segments, find cursor in original text
    const sorted = [...segments].sort((a, b) => a.location - b.location);
    const last = sorted[sorted.length - 1];
    let cursor = last.location + last.length;
  
    // 4) find corresponding starting index in stripped text
    let normCursor = indexMap.findIndex(origIdx => origIdx >= cursor);
    if (normCursor < 0) normCursor = matchText.length;
    delim.lastIndex = normCursor;
  
    const next: Range[] = [];
    let match: RegExpExecArray | null;
  
    // 5) exec over the stripped text, map each match back to original
    while ((match = delim.exec(matchText))) {
      const strippedStart = match.index;
      const strippedEnd = strippedStart + match[0].length;
  
      // original start = indexMap[strippedStart]
      const origMatchStart = indexMap[strippedStart]!;
      // original end = indexMap[strippedEnd] or fallback to text end
      const origMatchEnd = indexMap[strippedEnd] ?? plainText.length;
  
      // slice the chunk *before* this delimiter in the original text
      const chunk = plainText.slice(cursor, origMatchStart).trim();
      if (chunk) {
        const loc = cursor + chunk.search(/\S/);
        next.push({ location: loc, length: chunk.length });
      }
  
      // advance both cursors
      cursor = origMatchEnd;
      normCursor = strippedEnd;
      delim.lastIndex = normCursor;
    }
  
    // 6) handle any tail after the last delimiter
    const tail = plainText.slice(cursor).trim();
    if (tail) {
      const loc = cursor + tail.search(/\S/);
      next.push({ location: loc, length: tail.length });
    }
  
    // 7) commit segments and mark autoFilled
    setSegments([...segments, ...next]);
    setAutoFilled(true);
  }, [autoFilled, plainText, segments]);

  const makeItems = (): Item[] => {
    const src = segments.length
      ? segments
      : [{ location: 0, length: plainText.trim().length }];
    return src
      .sort((a, b) => a.location - b.location)
      .map((r, idx) => {
        const raw = plainText.slice(r.location, r.location + r.length).trim();
        const htmlContent = raw
          .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
          .replace(/\r?\n/g, "<br>");
        return new Item(uuidv4(), list.id, htmlContent, null, idx, new Date(), new Date());
      });
  };

  const persist = async () => {
    const items = makeItems().filter((i) => i.content);
    if (items.length) await list.addItems(items);
    onDismiss();
  };

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
            style={p.hl ? styles.hlSpan : p.ws ? styles.wsSpan : undefined}
          >
            {p.text}
          </Text>
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
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Text style={styles.close}>×</Text>
            </Pressable>
            <Text style={styles.title}>Parse Items</Text>
            <Pressable onPress={persist} hitSlop={12}>
              <Text style={styles.done}>✔︎</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} keyboardDismissMode="interactive">
            <View style={styles.overlay}>{HighlightLayer}</View>
            <TextInput
              style={styles.input}
              multiline
              value={plainText}
              onChangeText={onChangeText}
              selection={{
                start: selection.location,
                end: selection.location + selection.length,
              }}
              onSelectionChange={onSelectionChange}
              placeholder="Paste text here…"
            />
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={styles.btn} onPress={autoFill}>
              <Text style={styles.btnTxt}>{autoFilled ? "Clear" : "Auto‑Fill"}</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={toggleHighlight}>
              <Text style={styles.btnTxt}>
                {cursorInSegment >= 0 ? "Un‑highlight" : "Highlight"}
              </Text>
            </Pressable>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d1d6",
  },
  title: { fontSize: 18, fontWeight: "600" },
  close: { fontSize: 24 },
  done: { fontSize: 20 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0 },
  hlText: { fontSize: 16, lineHeight: 22 },
  hlSpan: {
    backgroundColor: "#0a84ff",
    color: "#fff",
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  wsSpan: { backgroundColor: "rgba(255,0,0,0.3)" },
  input: {
    fontSize: 16,
    lineHeight: 22,
    color: "#000",
    backgroundColor: "transparent",
    padding: 0,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d1d6",
    backgroundColor: "#f9f9fb",
  },
  btn: {
    backgroundColor: "#d1d1d6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  btnTxt: { fontSize: 14, fontWeight: "500" },
});