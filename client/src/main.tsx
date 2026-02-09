import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener('error', (event) => {
  fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: event.message, stack: event.error?.stack, filename: event.filename, lineno: event.lineno }),
  }).catch(() => {});
});

window.addEventListener('unhandledrejection', (event) => {
  fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: String(event.reason), stack: event.reason?.stack }),
  }).catch(() => {});
});

createRoot(document.getElementById("root")!).render(<App />);
