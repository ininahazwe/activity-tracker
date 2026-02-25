import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#171B26",
            color: "#E4E7F0",
            border: "1px solid #232838",
            borderRadius: "12px",
            fontSize: "13px",
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
