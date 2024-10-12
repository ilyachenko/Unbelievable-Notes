import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import NotesApp from "./NotesApp.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <NotesApp />
  </BrowserRouter>
);
