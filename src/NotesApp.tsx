import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryParam } from "./useQueryParam";
import "./NotesApp.css";

const MAX_URL_LENGTH = 2000;
const CARET_SESSION_STORAGE_KEY = "notes-app-selection";
const SPLIT_PERCENT_SESSION_STORAGE_KEY = "notes-app-split-percent";
const DEFAULT_SPLIT_PERCENT = 50;
const MIN_SPLIT_PERCENT = 20;
const MAX_SPLIT_PERCENT = 80;
const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const MAX_PREVIEW_URL_LABEL_LENGTH = 60;

function safeBtoa(input: string) {
  return btoa(encodeURIComponent(input));
}

function safeAtob(input: string) {
  return decodeURIComponent(atob(input));
}

function safeDecodeNote(note: string | null): string {
  if (!note) {
    return "";
  }

  try {
    return safeAtob(note);
  } catch {
    return "";
  }
}

function clampSplitPercent(value: number): number {
  return Math.min(MAX_SPLIT_PERCENT, Math.max(MIN_SPLIT_PERCENT, value));
}

function readStoredSplitPercent(): number {
  try {
    const rawValue = window.sessionStorage.getItem(SPLIT_PERCENT_SESSION_STORAGE_KEY);

    if (!rawValue) {
      return DEFAULT_SPLIT_PERCENT;
    }

    const parsedValue = Number.parseFloat(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return DEFAULT_SPLIT_PERCENT;
    }

    return clampSplitPercent(parsedValue);
  } catch {
    return DEFAULT_SPLIT_PERCENT;
  }
}

type StoredSelection = {
  note: string;
  selectionStart: number;
  selectionEnd: number;
};

function readStoredSelection(): StoredSelection | null {
  try {
    const rawValue = window.sessionStorage.getItem(CARET_SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredSelection>;

    if (
      typeof parsedValue.note !== "string" ||
      typeof parsedValue.selectionStart !== "number" ||
      typeof parsedValue.selectionEnd !== "number"
    ) {
      return null;
    }

    return {
      note: parsedValue.note,
      selectionStart: parsedValue.selectionStart,
      selectionEnd: parsedValue.selectionEnd,
    };
  } catch {
    return null;
  }
}

function writeStoredSelection(
  note: string,
  selectionStart: number,
  selectionEnd: number
): void {
  try {
    window.sessionStorage.setItem(
      CARET_SESSION_STORAGE_KEY,
      JSON.stringify({ note, selectionStart, selectionEnd })
    );
  } catch {
    // Ignore storage errors and keep editing functional.
  }
}

function insertTextAtSelection(
  element: HTMLTextAreaElement,
  text: string
): string {
  const selectionStart = element.selectionStart;
  const selectionEnd = element.selectionEnd;

  const nextValue =
    element.value.slice(0, selectionStart) +
    text +
    element.value.slice(selectionEnd);

  const nextCaretPosition = selectionStart + text.length;
  element.setSelectionRange(nextCaretPosition, nextCaretPosition);

  return nextValue;
}

const TEXT_SHORTCUTS = [
  { shortcut: "(v)", replacement: "✅" },
  { shortcut: "(m)", replacement: "👨‍💻" },
  { shortcut: "(...)", replacement: "⋯" },
];

function replaceTextShortcuts(
  value: string,
  caretPosition: number
): { value: string; caretPosition: number } {
  let nextValue = value;
  let nextCaretPosition = caretPosition;

  TEXT_SHORTCUTS.forEach(({ shortcut, replacement }) => {
    const valueBeforeCaret = nextValue.slice(0, nextCaretPosition);
    const matchesBeforeCaret = valueBeforeCaret.split(shortcut).length - 1;

    nextValue = nextValue.split(shortcut).join(replacement);
    nextCaretPosition -=
      matchesBeforeCaret * (shortcut.length - replacement.length);
  });

  return {
    value: nextValue,
    caretPosition: Math.max(0, nextCaretPosition),
  };
}

function splitTrailingUrlPunctuation(value: string): {
  urlText: string;
  trailingText: string;
} {
  const match = value.match(/[),.!?:;]+$/);

  if (!match) {
    return { urlText: value, trailingText: "" };
  }

  const trailingText = match[0];

  return {
    urlText: value.slice(0, -trailingText.length),
    trailingText,
  };
}

function normalizeUrl(url: string): string {
  return url.startsWith("www.") ? `https://${url}` : url;
}

function shortenUrlLabel(url: string): string {
  if (url.length <= MAX_PREVIEW_URL_LABEL_LENGTH) {
    return url;
  }

  return `${url.slice(0, MAX_PREVIEW_URL_LABEL_LENGTH - 1)}…`;
}

function renderTextWithLinks(text: string, keyPrefix: string): ReactNode[] {
  const matches = Array.from(text.matchAll(URL_PATTERN));

  if (matches.length === 0) {
    return [text];
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, matchIndex) => {
    const rawUrl = match[0];
    const matchIndexStart = match.index ?? 0;

    if (matchIndexStart > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndexStart));
    }

    const { urlText, trailingText } = splitTrailingUrlPunctuation(rawUrl);

    if (urlText.length > 0) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${matchIndex}`}
          className="notes-app-preview-link"
          href={normalizeUrl(urlText)}
          target="_blank"
          rel="noreferrer"
        >
          {shortenUrlLabel(urlText)}
        </a>
      );
    }

    if (trailingText.length > 0) {
      nodes.push(trailingText);
    }

    lastIndex = matchIndexStart + rawUrl.length;
  });

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderFormattedNote(note: string): ReactNode[] {
  return note.split("\n").map((line, lineIndex) => {
    if (line === "") {
      return (
        <p key={`line-${lineIndex}`} className="notes-app-preview-line">
          <br />
        </p>
      );
    }

    const parts = line.split(/(~~.*?~~)/g);

    return (
      <p key={`line-${lineIndex}`} className="notes-app-preview-line">
        {parts.map((part, partIndex) => {
          const isStrikethrough =
            part.startsWith("~~") && part.endsWith("~~") && part.length >= 4;

          if (!isStrikethrough) {
            return (
              <span key={`part-${lineIndex}-${partIndex}`}>
                {renderTextWithLinks(part, `part-${lineIndex}-${partIndex}`)}
              </span>
            );
          }

          return (
            <del key={`part-${lineIndex}-${partIndex}`}>
              {renderTextWithLinks(
                part.slice(2, -2),
                `part-${lineIndex}-${partIndex}`
              )}
            </del>
          );
        })}
      </p>
    );
  });
}

function NotesApp(): ReactNode {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const { getQueryParam, setQueryParam } = useQueryParam();
  const [note, setNote] = useState(() => safeDecodeNote(getQueryParam("n")));
  const [splitPercent, setSplitPercent] = useState(() => readStoredSplitPercent());
  const encodedNote = safeBtoa(note);
  const nextSearch = encodedNote ? `?n=${encodedNote}` : "";
  const currentUrlLength =
    window.location.origin.length +
    window.location.pathname.length +
    nextSearch.length +
    window.location.hash.length;
  const charactersLeft = MAX_URL_LENGTH - currentUrlLength;

  const handleNoteChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    const { value: nextNote, caretPosition } = replaceTextShortcuts(
      event.currentTarget.value,
      event.currentTarget.selectionStart
    );
    pendingSelectionRef.current = { start: caretPosition, end: caretPosition };
    setNote(nextNote);
    setQueryParam("n", safeBtoa(nextNote));
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    const nextNote = insertTextAtSelection(event.currentTarget, "\t");
    const nextCaretPosition = event.currentTarget.selectionStart;
    pendingSelectionRef.current = {
      start: nextCaretPosition,
      end: nextCaretPosition,
    };
    setNote(nextNote);
    setQueryParam("n", safeBtoa(nextNote));
  };

  const handleSelectionChange = (
    event: React.SyntheticEvent<HTMLTextAreaElement>
  ): void => {
    writeStoredSelection(
      note,
      event.currentTarget.selectionStart,
      event.currentTarget.selectionEnd
    );
  };

  const handleDividerPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ): void => {
    const main = mainRef.current;

    if (!main || window.matchMedia("(max-width: 800px)").matches) {
      return;
    }

    event.preventDefault();
    const { left, width } = main.getBoundingClientRect();

    const updateSplitFromPointer = (clientX: number): void => {
      const nextSplitPercent = clampSplitPercent(
        ((clientX - left) / width) * 100
      );
      setSplitPercent(nextSplitPercent);
    };

    updateSplitFromPointer(event.clientX);

    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);

    const handlePointerMove = (moveEvent: PointerEvent): void => {
      updateSplitFromPointer(moveEvent.clientX);
    };

    const handlePointerUp = (): void => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.focus();
    const storedSelection = readStoredSelection();

    if (storedSelection?.note === editor.value) {
      const selectionStart = Math.min(
        storedSelection.selectionStart,
        editor.value.length
      );
      const selectionEnd = Math.min(storedSelection.selectionEnd, editor.value.length);
      editor.setSelectionRange(selectionStart, selectionEnd);
      return;
    }

    const caretPosition = editor.value.length;
    editor.setSelectionRange(caretPosition, caretPosition);
  }, []);

  useEffect(() => {
    const nextNote = safeDecodeNote(getQueryParam("n"));
    setNote((currentNote) => (currentNote === nextNote ? currentNote : nextNote));
  }, [getQueryParam]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    const pendingSelection = pendingSelectionRef.current;

    if (!editor || pendingSelection === null) {
      return;
    }

    editor.setSelectionRange(pendingSelection.start, pendingSelection.end);
    pendingSelectionRef.current = null;
  }, [note]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    writeStoredSelection(note, editor.selectionStart, editor.selectionEnd);
  }, [note]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        SPLIT_PERCENT_SESSION_STORAGE_KEY,
        String(splitPercent)
      );
    } catch {
      // Ignore storage errors and keep resizing functional.
    }
  }, [splitPercent]);

  return (
    <div className="notes-app-shell">
      <div
        ref={mainRef}
        className="notes-app-main"
        style={
          {
            "--editor-width": `${splitPercent}%`,
            "--preview-width": `${100 - splitPercent}%`,
          } as React.CSSProperties
        }
      >
        <textarea
          ref={editorRef}
          value={note}
          onChange={handleNoteChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          className="notes-app"
          spellCheck={false}
        />
        <div
          className="notes-app-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor and preview"
          aria-valuemin={MIN_SPLIT_PERCENT}
          aria-valuemax={MAX_SPLIT_PERCENT}
          aria-valuenow={Math.round(splitPercent)}
          onPointerDown={handleDividerPointerDown}
        />
        <div className="notes-app-preview" aria-label="Formatted note preview">
          {note ? (
            renderFormattedNote(note)
          ) : (
            <p className="notes-app-preview-placeholder">
              Use <code>~~text~~</code> to show strikethrough here.
            </p>
          )}
        </div>
      </div>
      <div className="notes-app-counter" aria-live="polite">
        {charactersLeft >= 0
          ? `${charactersLeft} characters left`
          : `${Math.abs(charactersLeft)} characters over limit`}
      </div>
    </div>
  );
}

export default NotesApp;
