import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

async function mountApp() {
  // Keep the statically generated HTML visible while the initial route chunk
  // downloads. In particular, this prevents the homepage SEO markup from
  // being replaced by a skeleton during the most important paint window.
  try {
    if (window.location.pathname === "/") await import("./pages/HomePreview");
  } catch {
    // App/ErrorBoundary will present the normal recovery UI if the route fails.
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

mountApp();
