import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [message, setMessage] = useState({ text: "", type: "" }); // ✅ Phase 2: State untuk message

  // ✅ Phase 2: Function untuk show message
  const showMessage = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" }); // Reset message

    // ✅ Phase 2: Validasi input
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      showMessage("Semua field harus diisi!");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showMessage("Password baru dan konfirmasi password tidak cocok");
      return;
    }

    if (formData.newPassword.length < 1) {
      showMessage("Password tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      // ✅ Phase 1: Verify current password - FIX KONSISTENSI
      const { data: userData, error: verifyError } = await supabase
        .from("users")
        .select("password")
        .eq("username", user.username)
        .single();

      if (verifyError) throw verifyError;

      // ✅ Phase 1: Decode password dari DB menggunakan atob()
      const decodedCurrentPassword = atob(userData.password);
      
      // ✅ Phase 1: Compare dengan input user
      if (formData.currentPassword !== decodedCurrentPassword) {
        showMessage("Password saat ini salah"); // ✅ Phase 2: Ganti alert
        return;
      }

      // ✅ Phase 1: Update password - encode baru dengan btoa()
      const encodedNewPassword = btoa(formData.newPassword);
      const { error: updateError } = await supabase
        .from("users")
        .update({ password: encodedNewPassword })
        .eq("id", user.id);

      if (updateError) throw updateError;

      showMessage("Password berhasil diubah!", "success"); // ✅ Phase 2: Ganti alert
      
      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error:", error);
      showMessage("Terjadi kesalahan: " + error.message); // ✅ Phase 2: Ganti alert
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // ✅ Phase 2: Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div>
      <h2
        style={{
          margin: "0 0 20px 0",
          color: "#1e293b",
          fontSize: "18px",
          fontWeight: "600",
        }}
      >
        🔐 Ganti Password
      </h2>

      {/* ✅ Phase 2: Message Alert */}
      {message.text && (
        <div
          style={{
            padding: "12px 16px",
            background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: message.type === "success" ? "#166534" : "#dc2626",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      <div
        style={{
          maxWidth: "400px",
          background: "#f8fafc",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              Password Saat Ini *
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPasswords.current ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="Masukkan password saat ini"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: "16px",
                  padding: "0",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                disabled={loading}
              >
                {showPasswords.current ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              Password Baru *
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPasswords.new ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="Masukkan password baru"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: "16px",
                  padding: "0",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                disabled={loading}
              >
                {showPasswords.new ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              Konfirmasi Password Baru *
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPasswords.confirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="Konfirmasi password baru"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: "16px",
                  padding: "0",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                disabled={loading}
              >
                {showPasswords.confirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: loading ? 0.7 : 1,
              boxSizing: "border-box",
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow =
                  "0 8px 20px rgba(102, 126, 234, 0.3)";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }
            }}
          >
            {loading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid transparent",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                Mengubah Password...
              </div>
            ) : (
              "Ganti Password"
            )}
          </button>
        </form>

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default ChangePassword;
