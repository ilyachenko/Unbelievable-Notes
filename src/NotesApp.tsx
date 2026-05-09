import { ReactNode, useEffect, useRef, useState } from "react";
import { useQueryParam } from "./useQueryParam";
import "./NotesApp.css";

const MAX_URL_LENGTH = 2000;

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

function NotesApp(): ReactNode {
  const editorRef = useRef<HTMLTextAreaElement>(null);
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
    const newNote = event.currentTarget.value;
    setNote(newNote);
    setQueryParam("n", safeBtoa(newNote));
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    const nextNote = insertTextAtSelection(event.currentTarget, "\t");
    setNote(nextNote);
    setQueryParam("n", safeBtoa(nextNote));
  };

  useEffect(() => {
    const nextNote = safeDecodeNote(getQueryParam("n"));
    setNote((currentNote) => (currentNote === nextNote ? currentNote : nextNote));
  }, [getQueryParam]);

  return (
    <div className="notes-app-shell">
      <textarea
        ref={editorRef}
        value={note}
        onChange={handleNoteChange}
        onKeyDown={handleKeyDown}
        className="notes-app"
        spellCheck={false}
      />
      <div className="notes-app-counter" aria-live="polite">
        {charactersLeft >= 0
          ? `${charactersLeft} characters left`
          : `${Math.abs(charactersLeft)} characters over limit`}
      </div>
    </div>
  );
}

export default NotesApp;
