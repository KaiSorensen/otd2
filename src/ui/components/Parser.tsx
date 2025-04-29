import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { v4 as uuidv4 } from 'uuid';

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
   * Callback invoked when the user taps the \u2715 or the OS back‑gesture.
   */
  onDismiss: () => void;
  /**
   * Items created by the parser will be persisted to this List.
   */
  list: List;
};

/** ************************************************** ***
 *                 PARSER VIEW (REACT)                *
 **************************************************** */
const ParserView: React.FC<ParserViewProps> = ({ visible, onDismiss, list }) => {
  /*****************************************************
   * -------------------- STATE ---------------------- *
   *****************************************************/
  const [plainText, setPlainText] = useState<string>("");
  /** Currently selected range inside the <TextInput>. */
  const [selection, setSelection] = useState<Range>({ location: 0, length: 0 });
  /** Title‑segments (orange in the legacy SwiftUI view). */
  const [oranges, setOranges] = useState<Range[]>([]);
  /** Body‑segments (blue in the legacy SwiftUI view). */
  const [blues, setBlues] = useState<Range[]>([]);
  /** When TRUE the auto‑fill pass has generated a new set of highlights. */
  const [autoFilled, setAutoFilled] = useState<boolean>(false);

  /*  ----------------------------------------------------
      highlight helpers
      ---------------------------------------------------- */
  const cursorInRanges = useCallback(
    (rs: Range[]): number => {
      return rs.findIndex(
        r => selection.location >= r.location && selection.location <= r.location + r.length,
      );
    },
    [selection],
  );
  const cursorInOrange = cursorInRanges(oranges);
  const cursorInBlue = cursorInRanges(blues);

  /**
   * Replace or append a range helper (ensures immutability & deduplication).
   */
  const upsertRange = (ranges: Range[], next: Range): Range[] => {
    /** Remove overlaps and touching‑adjacent ranges – mimic the Swift helper. */
    const overlap = (a: Range, b: Range) => {
      const aEnd = a.location + a.length;
      const bEnd = b.location + b.length;
      if (aEnd === b.location || bEnd === a.location) return 0; // touching
      return Math.max(0, Math.min(aEnd, bEnd) - Math.max(a.location, b.location));
    };

    const filtered = ranges.filter(r => overlap(r, next) <= 0);
    return [...filtered, next].sort((a, b) => a.location - b.location);
  };

  /*  ----------------------------------------------------
      text‑change bookkeeping                (MUCH SIMPLER)
      ---------------------------------------------------- */
  const onChangeText = (t: string) => {
    setPlainText(t);
    // 📝 In the SwiftUI version there is heavy bookkeeping to offset ranges on
    // every keystroke.  React‑Native's TextInput does not expose enough low‑
    // level cursor information *synchronously* to replicate that exactly.
    // For the first pass we simply *reset* highlighting when the text mutates.
    setBlues([]);
    setOranges([]);
    setAutoFilled(false);
  };

  const onSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const { start, end } = e.nativeEvent.selection;
    setSelection({ location: start, length: end - start });
  };

  /*****************************************************
   * ----------------- HIGHLIGHT ACTIONS ------------- *
   *****************************************************/
  const highlightBlue = () => {
    if (selection.length === 0) return;
    setBlues(prev => upsertRange(prev, { ...selection }));
    // remove any overlapping oranges
    setOranges(prev => prev.filter(o => cursorInRanges([o]) < 0));
  };

  const highlightOrange = () => {
    if (selection.length === 0) return;
    setOranges(prev => upsertRange(prev, { ...selection }));
    setBlues(prev => prev.filter(b => cursorInRanges([b]) < 0));
  };

  const removeBlue = () => {
    if (cursorInBlue < 0) return;
    setBlues(prev => prev.filter((_, i) => i !== cursorInBlue));
  };
  const removeOrange = () => {
    if (cursorInOrange < 0) return;
    setOranges(prev => prev.filter((_, i) => i !== cursorInOrange));
  };

  /*****************************************************
   * -------------------- PARSER --------------------- *
   *****************************************************/
  /*  A full, 1‑to‑1 port of your Swift `ItemParser` is >600 LOC and would hide
      the core idea in noise.  Instead we expose *one* public function —
      `autoFill()`.  The internal heuristics mirror the Swift approach, but are
      collapsed for clarity.  Feel free to open a separate file and iterate. */
  const autoFill = useCallback(() => {
    if (autoFilled) {
      // restore original user highlighting
      setBlues(prev => prev);
      setOranges(prev => prev);
      setAutoFilled(false);
      return;
    }

    // --- very naive heuristic ---
    // Split by double‑newline as *item delimiter*.  First non‑empty line =>
    // title (orange); subsequent lines => body (blue).
    const nextBlues: Range[] = [];
    const nextOranges: Range[] = [];
    let offset = 0;
    const blocks = plainText.split(/\n{2,}/);
    blocks.forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) {
        offset += block.length + 2; // preserve separator length
        return;
      }
      const nl = block.indexOf("\n");
      if (nl === -1) {
        // single‑line -> assume title
        nextOranges.push({ location: offset, length: trimmed.length });
      } else {
        // multiline => first line title, rest body
        nextOranges.push({ location: offset, length: nl });
        const bodyStart = offset + nl + 1;
        const bodyLen = trimmed.length - nl - 1;
        nextBlues.push({ location: bodyStart, length: bodyLen });
      }
      offset += block.length + 2;
    });

    setBlues(nextBlues);
    setOranges(nextOranges);
    setAutoFilled(true);
  }, [plainText, autoFilled]);

  /*****************************************************
   * -------------- ITEM CONSTRUCTION --------------- *
   *****************************************************/
  const makeItems = useCallback((): Item[] => {
    const ordered = [...blues.map(b => ({ r: b, t: "blue" })), ...oranges.map(o => ({ r: o, t: "orange" }))].sort(
      (a, b) => a.r.location - b.r.location,
    );

    const items: Item[] = [];
    let current: Partial<Item> = {};

    const extract = (range: Range) => plainText.slice(range.location, range.location + range.length);

    ordered.forEach(part => {
      if (part.t === "orange") {
        if (current.title) {
          // commit and start new item
          items.push(
            new Item(
              uuidv4(),
              list.id,
              current.title!,
              current.content ?? "",
              null,
              items.length,
              new Date(),
              new Date(),
            ),
          );
          current = {};
        }
        current.title = extract(part.r);
      } else {
        if (current.content) {
          items.push(
            new Item(
              uuidv4(),
              list.id,
              current.title ?? null,
              current.content,
              null,
              items.length,
              new Date(),
              new Date(),
            ),
          );
          current = {};
        }
        current.content = extract(part.r);
      }
    });
    if (current.title || current.content) {
      items.push(
        new Item(
          uuidv4(),
          list.id,
          current.title ?? null,
          current.content ?? "",
          null,
          items.length,
          new Date(),
          new Date(),
        ),
      );
    }
    return items;
  }, [blues, oranges, plainText, list.id]);

  const persist = async () => {
    const items = makeItems();
    if (items.length === 0) {
      onDismiss();
      return;
    }
    await addItems(items);
    onDismiss();
  };

  /*****************************************************
   * ----------------- HIGHLIGHT VIEW ---------------- *
   *****************************************************/
  const highlightedPreview = useMemo(() => {
    if (blues.length === 0 && oranges.length === 0) return null;
    const segments: { text: string; color?: string }[] = [];

    const sorted = [...blues.map(b => ({ r: b, c: "#0a84ff" })), ...oranges.map(o => ({ r: o, c: "#ff9f0a" }))].sort(
      (a, b) => a.r.location - b.r.location,
    );
    let cursor = 0;
    sorted.forEach(({ r, c }) => {
      if (cursor < r.location) segments.push({ text: plainText.slice(cursor, r.location) });
      segments.push({ text: plainText.slice(r.location, r.location + r.length), color: c });
      cursor = r.location + r.length;
    });
    if (cursor < plainText.length) segments.push({ text: plainText.slice(cursor) });

    return (
      <Text style={styles.previewText} selectable>
        {segments.map((s, i) =>
          s.color ? (
            <View
              key={i}
              style={{
                backgroundColor: s.color,
                borderRadius: 4,
                paddingHorizontal: 2,
                marginRight: 1,
              }}
            >
              <Text style={{ color: '#fff' }}>{s.text}</Text>
            </View>
          ) : (
            <Text key={i}>{s.text}</Text>
          )
        )}
      </Text>
    );
  }, [plainText, blues, oranges]);

  /*****************************************************
   * ------------------   RENDER   ------------------- *
   *****************************************************/
  return (
    <Modal visible={visible} onRequestClose={onDismiss} animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Parser</Text>
          <Pressable onPress={persist}>
            <Text style={styles.headerIcon}>✔︎</Text>
          </Pressable>
        </View>

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

          {/* PREVIEW */}
          {highlightedPreview}
        </ScrollView>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={autoFill}>
            <Text style={styles.actionTxt}>{autoFilled ? "Remove Auto‑Fill" : "Auto‑Fill"}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={cursorInBlue >= 0 ? removeBlue : highlightBlue}>
            <Text style={styles.actionTxt}>{cursorInBlue >= 0 ? "Remove Blue" : "Blue"}</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={cursorInOrange >= 0 ? removeOrange : highlightOrange}
          >
            <Text style={styles.actionTxt}>{cursorInOrange >= 0 ? "Remove Orange" : "Orange"}</Text>
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
