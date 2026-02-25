import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { applyTheme, getStoredTheme } from "./components/SettingsDialog";

// Apply saved theme before first render
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
