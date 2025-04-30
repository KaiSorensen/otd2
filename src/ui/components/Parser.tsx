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
} from "react-native";
import { addItems } from "../../wdb/wdbService";
import { List } from "../../classes/List";
import { Item } from "../../classes/Item";
import { v4 as uuidv4 } from "uuid";

/**
 * A lightweight replacement for NSRange
 */
export interface Range {
  location: number;
  length: number;
}

export type ParserViewProps = {
  /**
   * Controls visibility from parent component
   */
  visible: boolean;
  /**
   * Callback invoked when the user taps the × or the OS back‑gesture.
   */
  onDismiss: () => void;
  /**
   * Items created by the parser will be persisted to this List.
   */
  list: List;
};

/**
 * A simplified parser that produces content‑only Items.
 * — No title handling
 * — Single highlight colour (blue)
 * — Optional auto‑fill that splits on blank lines
 */
const ParserView: React.FC<ParserViewProps> = ({ visible, onDismiss, list }) => {
  /*****************************************************
   * -------------------- STATE ---------------------- *
   *****************************************************/
  const [plainText, setPlainText] = useState<string>("");
  /** Current selection range inside the <TextInput>. */
  const [selection, setSelection] = useState<Range>({ location: 0, length: 0 });
  /** User‑selected (or auto‑generated) segments to convert into Items. */
  const [segments, setSegments] = useState<Range[]>([]);
  /** Toggles whether the current highlight set came from auto‑fill. */
  const [autoFilled, setAutoFilled] = useState<boolean>(false);

  /*****************************************************
   * ----------------- UTILITIES --------------------- *
   *****************************************************/
  /** Does the cursor sit inside *any* of the provided ranges? Returns index or −1. */
  const cursorInRanges = useCallback(
    (rs: Range[]): number =>
      rs.findIndex(
        r => selection.location >= r.location && selection.location <= r.location + r.length,
      ),
    [selection],
  );
  const cursorInSegment = cursorInRanges(segments);

  /** Insert or replace a range, collapsing overlaps & adjacencies. */
  const upsertRange = (ranges: Range[], next: Range): Range[] => {
    const overlap = (a: Range, b: Range) => {
      const aEnd = a.location + a.length;
      const bEnd = b.location + b.length;
      if (aEnd === b.location || bEnd === a.location) return 0; // touching
      return Math.max(0, Math.min(aEnd, bEnd) - Math.max(a.location, b.location));
    };
    const filtered = ranges.filter(r => overlap(r, next) <= 0);
    return [...filtered, next].sort((a, b) => a.location - b.location);
  };

  /*****************************************************
   * ---------------- TEXT INPUT --------------------- *
   *****************************************************/
  const onChangeText = (t: string) => {
    setPlainText(t);
    setSegments([]);         // wipe highlights – cheaper than re‑offsetting
    setAutoFilled(false);
  };

  const onSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const { start, end } = e.nativeEvent.selection;
    setSelection({ location: start, length: end - start });
  };

  /*****************************************************
   * --------------- HIGHLIGHT ACTIONS --------------- *
   *****************************************************/
  const toggleHighlight = () => {
    if (selection.length === 0) return;
    if (cursorInSegment >= 0) {
      // remove existing
      setSegments(prev => prev.filter((_, i) => i !== cursorInSegment));
    } else {
      setSegments(prev => upsertRange(prev, { ...selection }));
    }
    setAutoFilled(false);
  };

  /*****************************************************
   * -------------------- AUTOFILL ------------------- *
   *****************************************************/
  const autoFill = useCallback(() => {
    if (autoFilled) {
      setSegments([]);        // clear auto‑fill highlights
      setAutoFilled(false);
      return;
    }

    const next: Range[] = [];
    let offset = 0;
    plainText.split(/\n{2,}/).forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) {
        offset += block.length + 2;
        return;
      }
      next.push({ location: offset + block.indexOf(trimmed), length: trimmed.length });
      offset += block.length + 2;
    });

    setSegments(next);
    setAutoFilled(true);
  }, [plainText, autoFilled]);

  /*****************************************************
   * ---------------- ITEM CONSTRUCTION -------------- *
   *****************************************************/
  const makeItems = (): Item[] => {
    const ranges = segments.length
      ? segments
      : [
          {
            location: 0,
            length: plainText.trim().length,
          },
        ];

    return ranges
      .sort((a, b) => a.location - b.location)
      .map((r, idx) => {
        const content = plainText.slice(r.location, r.location + r.length).trim();
        return new Item(
          uuidv4(),
          list.id,
          content,
          null,          // image
          idx,           // order
          new Date(),
          new Date(),
        );
      });
  };

  const persist = async () => {
    const items = makeItems().filter(i => i.content.length); // ignore blanks
    if (items.length) await addItems(items);
    onDismiss();
  };

  /*****************************************************
   * ----------------- HIGHLIGHT VIEW ---------------- *
   *****************************************************/
  const highlightedPreview = useMemo(() => {
    if (segments.length === 0) return null;
    const segs: { text: string; highlight: boolean }[] = [];
    let cursor = 0;
    const ordered = [...segments].sort((a, b) => a.location - b.location);

    ordered.forEach(r => {
      if (cursor < r.location) segs.push({ text: plainText.slice(cursor, r.location), highlight: false });
      segs.push({ text: plainText.slice(r.location, r.location + r.length), highlight: true });
      cursor = r.location + r.length;
    });
    if (cursor < plainText.length) segs.push({ text: plainText.slice(cursor), highlight: false });

    return (
      <Text style={styles.previewText} selectable>
        {segs.map((s, i) =>
          s.highlight ? (
            <View
              key={i}
              style={{
                backgroundColor: "#0a84ff",
                borderRadius: 4,
                paddingHorizontal: 2,
                marginRight: 1,
              }}
            >
              <Text style={{ color: "#fff" }}>{s.text}</Text>
            </View>
          ) : (
            <Text key={i}>{s.text}</Text>
          ),
        )}
      </Text>
    );
  }, [plainText, segments]);

  /*****************************************************
   * -------------------- RENDER --------------------- *
   *****************************************************/
  return (
    <Modal visible={visible} onRequestClose={onDismiss} animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Parser</Text>
          <Pressable onPress={persist}>
            <Text style={styles.headerIcon}>✔︎</Text>
          </Pressable>
        </View>

        {/* INPUT + PREVIEW */}
        <ScrollView style={styles.body} keyboardDismissMode="interactive">
          <TextInput
            style={styles.input}
            multiline
            value={plainText}
            onChangeText={onChangeText}
            placeholder="Paste text here…"
            selection={{ start: selection.location, end: selection.location + selection.length }}
            onSelectionChange={onSelectionChange}
          />
          {highlightedPreview}
        </ScrollView>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={autoFill}>
            <Text style={styles.actionTxt}>{autoFilled ? "Clear Auto‑Fill" : "Auto‑Fill"}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={toggleHighlight}>
            <Text style={styles.actionTxt}>
              {cursorInSegment >= 0 ? "Remove Highlight" : "Highlight"}
            </Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onDismiss}>
            <Text style={styles.actionTxt}>×</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ParserView;

/*****************************************************
 * -------------------- STYLES ---------------------- *
 *****************************************************/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerIcon: {
    fontSize: 20,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  input: {
    minHeight: 140,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-evenly",
    padding: 12,
  },
  actionBtn: {
    backgroundColor: "#d1d1d6",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  closeBtn: {
    marginLeft: "auto",
    backgroundColor: "#ff3b30",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionTxt: {
    fontSize: 14,
    fontWeight: "500",
  },
});
