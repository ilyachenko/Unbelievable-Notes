import { ReactNode, useEffect, useState } from "react";
import { useQueryParam } from "./useQueryParam";
import "./NotesApp.css";

function NotesApp(): ReactNode {
  const [note, setNote] = useState<string>("");
  const { getQueryParam, setQueryParam } = useQueryParam();

  const handleNoteChange = (
    event: React.SyntheticEvent<HTMLDivElement>
  ): void => {
    const newNote = event.currentTarget.textContent || "";
    const encodedNote = btoa(newNote);
    setQueryParam("n", encodeURIComponent(encodedNote));
  };

  useEffect(() => {
    const note = getQueryParam("n");
    const decodedNote = decodeURIComponent(note || "");
    if (note) {
      setNote(atob(decodedNote));
    }
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
