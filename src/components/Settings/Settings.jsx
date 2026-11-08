import React, { useState } from "react";
import MessageTemplates from "./MessageTemplates";
import ChangePassword from "./ChangePassword";
import BackupRestore from "./BackupRestore";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  const tabs = [
    { id: "templates", label: "Template Pesan", icon: "📝", desc: "Atur format pesan WA" },
    { id: "password", label: "Ganti Password", icon: "🔐", desc: "Ubah kata sandi akun" },
    ...(isAdmin
      ? [
          { id: "backup", label: "Backup & Restore", icon: "💾", desc: "Amankan data aplikasi" },
        ]
      : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ padding: "24px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* HEADER SECTION */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "800", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ background: "#eef2ff", padding: "8px", borderRadius: "12px", fontSize: "20px" }}>⚙️</span>
            Pusat Pengaturan
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px", marginLeft: "2px" }}>
            Kelola pengaturan akun dan aplikasi Anda
          </p>
        </div>

        {/* LAYOUT UTAMA */}
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>
          
          {/* SIDEBAR / TAB NAVIGASI */}
          <div className="settings-sidebar" style={{ width: "100%", maxWidth: "300px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-tab ${isActive ? "active" : ""}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "16px",
                    background: isActive ? "white" : "transparent",
                    border: isActive ? "1px solid #e2e8f0" : "1px solid transparent",
                    borderRadius: "16px", cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                    boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.03)" : "none",
                  }}
                >
                  <div style={{ fontSize: "20px", background: isActive ? "#eef2ff" : "#f1f5f9", color: isActive ? "#6366f1" : "#64748b", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", flexShrink: 0 }}>
                    {tab.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: isActive ? "700" : "600", color: isActive ? "#1e293b" : "#475569" }}>
                      {tab.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px", display: isActive ? "block" : "none" }}>
                      {tab.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* KONTEN TAB */}
          <div className="settings-content" style={{ flex: 1, background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px", minHeight: "500px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
            </div>

            <div className="tab-content-inner">
              {activeTab === "templates" && <MessageTemplates />}
              {activeTab === "password" && <ChangePassword />}
              {activeTab === "backup" && <BackupRestore />}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .settings-tab:hover { background: white !important; border-color: #e2e8f0 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important; }
        }
        @media (max-width: 768px) {
          .settings-sidebar { max-width: 100% !important; flex-direction: row !important; overflow-x: auto !important; padding-bottom: 8px !important; gap: 8px !important; scrollbar-width: none; -ms-overflow-style: none; }
          .settings-sidebar::-webkit-scrollbar { display: none; }
          .settings-tab { flex-direction: column !important; min-width: 90px !important; padding: 12px 8px !important; text-align: center !important; gap: 6px !important; }
          .settings-tab div:last-child { display: block !important; }
          .settings-tab div:last-child div:last-child { display: none !important; }
          .settings-content { padding: 16px !important; min-height: auto !important; }
        }
      `}</style>
    </div>
  );
};

export default Settings;