import React from "react";
import ReactDOM from "react-dom/client"; // ✅ Import dari 'react-dom/client'
import App from "./App.jsx";


// ✅ React 18 syntax yang benar
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <App />
);
