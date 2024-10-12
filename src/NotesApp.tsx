import { ReactNode, useEffect, useState } from "react";
import { useQueryParam } from "./useQueryParam";
import "./NotesApp.css";

function safeBtoa(input: string) {
  return btoa(encodeURIComponent(input));
}

function safeAtob(input: string) {
  return decodeURIComponent(atob(input));
}

function NotesApp(): ReactNode {
  const [note, setNote] = useState<string>("");
  const { getQueryParam, setQueryParam } = useQueryParam();

  const handleNoteChange = (
    event: React.SyntheticEvent<HTMLDivElement>
  ): void => {
    const newNote = event.currentTarget.innerHTML || "";
    setQueryParam("n", safeBtoa(newNote));
  };

  useEffect(() => {
    const note = getQueryParam("n");
    setNote(safeAtob(note || ""));
  }, [getQueryParam]);

  return (
    <div
      contentEditable
      suppressContentEditableWarning={true}
      onInput={handleNoteChange}
      className="notes-app"
      dangerouslySetInnerHTML={{ __html: note }}
    ></div>
  );
}

export default NotesApp;
