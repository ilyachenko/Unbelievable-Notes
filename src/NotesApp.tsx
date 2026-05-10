import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryParam } from "./useQueryParam";
import "./NotesApp.css";

const MAX_URL_LENGTH = 2000;
const CARET_SESSION_STORAGE_KEY = "notes-app-selection";

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

function renderFormattedNote(note: string): ReactNode[] {
  return note.split("\n").map((line, lineIndex) => {
    const parts = line.split(/(~~.*?~~)/g);

    return (
      <p key={`line-${lineIndex}`} className="notes-app-preview-line">
        {parts.map((part, partIndex) => {
          const isStrikethrough =
            part.startsWith("~~") && part.endsWith("~~") && part.length >= 4;

          if (!isStrikethrough) {
            return (
              <span key={`part-${lineIndex}-${partIndex}`}>{part}</span>
            );
          }

          return (
            <del key={`part-${lineIndex}-${partIndex}`}>
              {part.slice(2, -2)}
            </del>
          );
        })}
      </p>
    );
  });
}

function NotesApp(): ReactNode {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const { getQueryParam, setQueryParam } = useQueryParam();
  const [note, setNote] = useState(() => safeDecodeNote(getQueryParam("n")));
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

  return (
    <div className="notes-app-shell">
      <div className="notes-app-main">
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
