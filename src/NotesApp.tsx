import { ReactNode, useEffect, useRef } from "react";
import { useQueryParam } from "./useQueryParam";
import "./NotesApp.css";

function safeBtoa(input: string) {
  return btoa(encodeURIComponent(input));
}

function safeAtob(input: string) {
  return decodeURIComponent(atob(input));
}

function insertTextAtSelection(text: string): void {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function NotesApp(): ReactNode {
  const editorRef = useRef<HTMLDivElement>(null);
  const { getQueryParam, setQueryParam } = useQueryParam();

  const handleNoteChange = (
    event: React.SyntheticEvent<HTMLDivElement>
  ): void => {
    const newNote = event.currentTarget.innerHTML || "";
    setQueryParam("n", safeBtoa(newNote));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    insertTextAtSelection("\t");

    const newNote = event.currentTarget.innerHTML || "";
    setQueryParam("n", safeBtoa(newNote));
  };

  useEffect(() => {
    const note = getQueryParam("n");
    const nextNote = safeAtob(note || "");

    if (editorRef.current && editorRef.current.innerHTML !== nextNote) {
      editorRef.current.innerHTML = nextNote;
    }
  }, [getQueryParam]);

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning={true}
      onInput={handleNoteChange}
      onKeyDown={handleKeyDown}
      className="notes-app"
    ></div>
  );
}

export default NotesApp;
