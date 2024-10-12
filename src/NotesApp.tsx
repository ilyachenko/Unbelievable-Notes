import { ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function NotesApp(): ReactNode {
  const navigate = useNavigate();
  const [note, setNote] = useState<string>("");

  const setQueryParam = (key: string, value: string): void => {
    const params = new URLSearchParams(location.search);
    params.set(key, value);
    navigate({ search: params.toString() }, { replace: true });
  };

  const handleNoteChange = (
    event: React.SyntheticEvent<HTMLDivElement>
  ): void => {
    const newNote = event.currentTarget.textContent || "";
    const encodedNote = btoa(newNote);
    setQueryParam("note", encodeURIComponent(encodedNote));
  };

  const getQueryParam = useCallback((key: string): string | null => {
    const params = new URLSearchParams(location.search);
    return params.get(key);
  }, []);

  useEffect(() => {
    const note = getQueryParam("note");
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
      style={{
        width: "100vw",
        height: "100vh",
        padding: "20px",
        boxSizing: "border-box",
        border: "1px solid #ccc",
        outline: "none",
        overflowY: "auto",
      }}
      dangerouslySetInnerHTML={{ __html: note }}
    ></div>
  );
}

export default NotesApp;
