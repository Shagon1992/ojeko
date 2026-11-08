import React, { useState } from "react";
import { supabase } from "../lib/supabase";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !user) {
        alert("Username tidak ditemukan");
        return;
      }

      const decodedPassword = atob(user.password);
      if (password !== decodedPassword) {
        alert("Password salah");
        return;
      }

      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin") {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/dbcourier";
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page-wrapper"
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#f8fafc",
      }}
    >
      
      {/* --- SISI KIRI: BRAND (Desktop Only) --- */}
      <div
        className="login-left-panel"
        style={{
          flex: 1,
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }}></div>
        <div style={{ position: "absolute", bottom: "-150px", right: "-150px", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }}></div>
        
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "400px" }}>
          <div style={{ width: "100px", height: "100px", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/icons/icon-192x192.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }} />
          </div>
          <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "800", letterSpacing: "-1px" }}>
            Ojek-O
          </h1>
          <p style={{ margin: "0 0 32px 0", fontSize: "16px", opacity: 0.9, lineHeight: 1.5 }}>
            Sistem Manajemen Pengiriman Obat<br />RSU Aminah Blitar
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", opacity: 0.8, fontSize: "13px" }}>
            <span>⚡ Cepat</span>
            <span>🔒 Aman</span>
            <span>📱 Mobile Friendly</span>
          </div>
        </div>
      </div>

      {/* --- SISI KANAN: FORM LOGIN --- */}
      <div
        className="login-right-panel"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          className="login-form-container"
          style={{
            background: "white",
            padding: "40px 32px",
            borderRadius: "24px",
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: "420px",
            border: "1px solid #e2e8f0",
            animation: "slideUp 0.5s ease-out",
          }}
        >
          {/* Header Form (Tampil di HP) */}
          <div className="login-mobile-header" style={{ display: "none", textAlign: "center", marginBottom: "32px" }}>
            <div style={{ width: "80px", height: "80px", margin: "0 auto 16px" }}>
              <img src="/icons/icon-192x192.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "20px", boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }} />
            </div>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "800", color: "#1e293b" }}>Ojek-O</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>RSU Aminah Blitar</p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: "700", color: "#1e293b", letterSpacing: "-0.5px" }}>
              Selamat Datang 👋
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Silakan masuk untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleLogin}>
            {/* Input Username */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", opacity: 0.5 }}>👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "16px 16px 16px 48px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "14px",
                    fontSize: "15px",
                    transition: "all 0.2s",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#f8fafc",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.background = "white";
                    e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.background = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            {/* Input Password */}
            <div style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", opacity: 0.5 }}>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "16px 48px 16px 48px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "14px",
                    fontSize: "15px",
                    transition: "all 0.2s",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#f8fafc",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.background = "white";
                    e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.background = "#f8fafc";
                    e.target.style.boxShadow = "none";
                  }}
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    opacity: 0.5,
                    padding: "4px",
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Tombol Login */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "white",
                border: "none",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 8px 20px -4px rgba(99, 102, 241, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 12px 28px -4px rgba(99, 102, 241, 0.5)";
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 8px 20px -4px rgba(99, 102, 241, 0.4)";
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: "18px", height: "18px", border: "2px solid transparent", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                  Memproses...
                </>
              ) : (
                "Masuk ke Dashboard →"
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "#94a3b8" }}>
            © 2024 Ojek-O • RSU Aminah Blitar
          </div>
        </div>
      </div>

      {/* CSS Animation & Responsive */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* 📱 RESPONSIVE: Sembunyikan panel kiri di HP, tampilkan header mobile */
        @media (max-width: 768px) {
          .login-page-wrapper {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%) !important;
            position: relative;
          }
          .login-page-wrapper::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at top right, rgba(255,255,255,0.15), transparent 50%);
            pointer-events: none;
          }
          .login-left-panel {
            display: none !important;
          }
          .login-mobile-header {
            display: block !important;
          }
          .login-right-panel {
            padding: 16px !important;
            position: relative;
            z-index: 1;
          }
          .login-form-container {
            padding: 32px 24px !important;
            border-radius: 20px !important;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;