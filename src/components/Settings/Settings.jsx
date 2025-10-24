import React, { useState } from "react";
import MessageTemplates from "./MessageTemplates";
import ChangePassword from "./ChangePassword";
import BackupRestore from "./BackupRestore";
import ImportCustomers from "../ImportCustomers";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const tabs = [
    { id: "templates", label: "Template", icon: "📝" },
    { id: "password", label: "Password", icon: "🔐" },
    ...(isAdmin
      ? [
          { id: "backup", label: "Backup", icon: "💾" },
          { id: "import", label: "Import", icon: "📥" },
        ]
      : []),
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "16px 12px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "white",
            padding: "20px 16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            marginBottom: "16px",
          }}
        >
          <h1
            style={{
              margin: "0 0 6px 0",
              fontSize: "20px",
              fontWeight: "700",
              color: "#1e293b",
            }}
          >
            ⚙️ Pengaturan
          </h1>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Kelola pengaturan akun dan aplikasi Anda
          </p>
        </div>

        {/* Compact Tab Navigation - Hover satu box */}
        <div
          style={{
            background: "white",
            padding: "8px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            marginBottom: "16px",
            display: "grid",
            gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
            gap: "4px",
            overflow: "hidden",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "#667eea";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(102, 126, 234, 0.1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 8px",
                background: activeTab === tab.id ? "#1e293b" : "transparent", // Biru gelap untuk active
                color: activeTab === tab.id ? "white" : "#1e293b", // Hitam untuk non-active, putih untuk active
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                minHeight: "50px",
                wordBreak: "break-word",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "16px" }}>{tab.icon}</span>
              <span style={{ fontSize: "11px", lineHeight: "1.2" }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div
          style={{
            background: "white",
            padding: "20px 16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            minHeight: "400px",
          }}
        >
          {activeTab === "templates" && <MessageTemplates />}
          {activeTab === "password" && <ChangePassword />}
          {activeTab === "backup" && <BackupRestore />}
          {activeTab === "import" && <ImportCustomers />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
