import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // atau "./App.js" sesuai nama file kamu
import "./index.css"; // kalau ada CSS global
import 'leaflet/dist/leaflet.css';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
