import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/global.css";

// Add a debug class to the body for development
if (import.meta.env.DEV) {
  document.body.classList.add('debug-screens');
}

// Ensure the app is interactive
setTimeout(() => {
  document.body.style.pointerEvents = 'auto';
}, 0);

createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
