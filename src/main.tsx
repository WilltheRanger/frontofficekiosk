import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "./index.css";
import App from "./App.tsx";

// Kiosk lockdown (§6.7): no context menus, no stray gestures.
window.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());

// Show the cursor during development (`cursor: none` everywhere else).
if (import.meta.env.DEV) document.documentElement.classList.add("dev-cursor");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
