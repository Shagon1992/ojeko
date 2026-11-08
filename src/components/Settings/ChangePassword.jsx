import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const ChangePassword = () => {
  // ==========================================
  // STATE UNTUK GANTI PASSWORD SENDIRI
  // ==========================================
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
  const [message, setMessage] = useState({ text: "", type: "" });

  // ==========================================
  // STATE UNTUK ADMIN GANTI PASSWORD USER LAIN
  // ==========================================
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ text: "", type: "" });

  // Fetch daftar users (dengan nama kurir jika role-nya courier)
  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        // Ambil data users, dan join ke tabel couriers untuk mendapatkan nama lengkap
        const { data } = await supabase
          .from("users")
          .select(`
            id, 
            username, 
            role, 
            courier_id,
            couriers ( name )
          `)
          .order("username");
          
        if (data) setUsers(data);
      };
      fetchUsers();
    }
  }, [isAdmin]);

  const showMessage = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const showAdminMessage = (text, type = "error") => {
    setAdminMessage({ text, type });
    setTimeout(() => setAdminMessage({ text: "", type: "" }), 5000);
  };

  // Handler Ganti Password Sendiri
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

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
      const { data: userData, error: verifyError } = await supabase.from("users").select("password").eq("username", user.username).single();
      if (verifyError) throw verifyError;

      const decodedCurrentPassword = atob(userData.password);
      if (formData.currentPassword !== decodedCurrentPassword) {
        showMessage("Password saat ini salah");
        return;
      }

      const encodedNewPassword = btoa(formData.newPassword);
      const { error: updateError } = await supabase.from("users").update({ password: encodedNewPassword }).eq("id", user.id);
      if (updateError) throw updateError;

      showMessage("Password berhasil diubah!", "success");
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error:", error);
      showMessage("Terjadi kesalahan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler Admin Ganti Password User Lain
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminMessage({ text: "", type: "" });

    if (!selectedUserId) {
      showAdminMessage("Pilih user terlebih dahulu!");
      return;
    }
    if (adminNewPassword.length < 1) {
      showAdminMessage("Password baru tidak boleh kosong!");
      return;
    }

    // Ambil data user yang dipilih untuk konfirmasi
    const targetUser = users.find(u => u.id === selectedUserId);
    const targetName = targetUser.role === "courier" && targetUser.couriers?.name 
      ? `${targetUser.couriers.name} (${targetUser.username})` 
      : targetUser.username;

    if (!confirm(`Yakin ingin mengganti password untuk user "${targetName}"?`)) return;

    setAdminLoading(true);
    try {
      const encodedNewPassword = btoa(adminNewPassword);
      const { error } = await supabase.from("users").update({ password: encodedNewPassword }).eq("id", selectedUserId);
      if (error) throw error;

      showAdminMessage(`Password untuk ${targetName} berhasil diubah!`, "success");
      setSelectedUserId("");
      setAdminNewPassword("");
    } catch (error) {
      showAdminMessage("Terjadi kesalahan: " + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px 0", color: "#1e293b", fontSize: "18px", fontWeight: "600" }}>
        🔐 Ganti Password
      </h2>

      {/* FORM 1: GANTI PASSWORD SENDIRI */}
      <div style={{ maxWidth: "400px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "32px" }}>
        
        {message.text && (
          <div style={{ padding: "12px 16px", background: message.type === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`, color: message.type === "success" ? "#166534" : "#dc2626", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "500" }}>
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "700", color: "#374151" }}>Ganti Password Saya</h3>

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>Password Saat Ini *</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input type={showPasswords.current ? "text" : "password"} name="currentPassword" value={formData.currentPassword} onChange={handleInputChange} style={{ width: "100%", padding: "12px 40px 12px 12px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", transition: "all 0.2s", outline: "none", boxSizing: "border-box" }} onFocus={(e) => { e.target.style.borderColor = "#667eea"; e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }} placeholder="Masukkan password saat ini" disabled={loading} />
              <button type="button" onClick={() => togglePasswordVisibility("current")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "16px", padding: "0", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }} disabled={loading}>{showPasswords.current ? "🙈" : "👁️"}</button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>Password Baru *</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input type={showPasswords.new ? "text" : "password"} name="newPassword" value={formData.newPassword} onChange={handleInputChange} style={{ width: "100%", padding: "12px 40px 12px 12px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", transition: "all 0.2s", outline: "none", boxSizing: "border-box" }} onFocus={(e) => { e.target.style.borderColor = "#667eea"; e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }} placeholder="Masukkan password baru" disabled={loading} />
              <button type="button" onClick={() => togglePasswordVisibility("new")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "16px", padding: "0", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }} disabled={loading}>{showPasswords.new ? "🙈" : "👁️"}</button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>Konfirmasi Password Baru *</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input type={showPasswords.confirm ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} style={{ width: "100%", padding: "12px 40px 12px 12px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", transition: "all 0.2s", outline: "none", boxSizing: "border-box" }} onFocus={(e) => { e.target.style.borderColor = "#667eea"; e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }} placeholder="Konfirmasi password baru" disabled={loading} />
              <button type="button" onClick={() => togglePasswordVisibility("confirm")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "16px", padding: "0", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }} disabled={loading}>{showPasswords.confirm ? "🙈" : "👁️"}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: loading ? 0.7 : 1, boxSizing: "border-box" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <div style={{ width: "16px", height: "16px", border: "2px solid transparent", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                Mengubah Password...
              </div>
            ) : ("Ganti Password")}
          </button>
        </form>
      </div>

      {/* FORM 2: ADMIN GANTI PASSWORD USER LAIN */}
      {isAdmin && (
        <div style={{ maxWidth: "400px", background: "#fef2f2", padding: "20px", borderRadius: "12px", border: "1px solid #fecaca" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "700", color: "#dc2626" }}>⚠️ Ganti Password User Lain (Khusus Admin)</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#b91c1c" }}>Gunakan fitur ini jika ada kurir atau admin lain yang lupa password.</p>

          {adminMessage.text && (
            <div style={{ padding: "12px 16px", background: adminMessage.type === "success" ? "#f0fdf4" : "white", border: `1px solid ${adminMessage.type === "success" ? "#bbf7d0" : "#fca5a5"}`, color: adminMessage.type === "success" ? "#166534" : "#dc2626", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "500" }}>
              {adminMessage.type === "success" ? "✅" : "❌"} {adminMessage.text}
            </div>
          )}

          <form onSubmit={handleAdminSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#b91c1c", fontSize: "13px" }}>Pilih User *</label>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} required style={{ width: "100%", padding: "12px 14px", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "14px", outline: "none", background: "white" }}>
                <option value="">-- Pilih User --</option>
                {users.map(u => {
                  // Format tampilan: Nama Lengkap (username) - Role
                  const displayName = u.role === "courier" && u.couriers?.name 
                    ? `${u.couriers.name} (${u.username})` 
                    : u.username;
                  const roleLabel = u.role === "admin" ? "Admin" : "Kurir";
                  
                  return (
                    <option key={u.id} value={u.id}>
                      {displayName} - {roleLabel}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#b91c1c", fontSize: "13px" }}>Password Baru *</label>
              <input type="text" value={adminNewPassword} onChange={(e) => setAdminNewPassword(e.target.value)} required style={{ width: "100%", padding: "12px 14px", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "14px", outline: "none", background: "white" }} placeholder="Ketik password baru" />
            </div>
            <button type="submit" disabled={adminLoading || !selectedUserId} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: (adminLoading || !selectedUserId) ? "not-allowed" : "pointer", opacity: (adminLoading || !selectedUserId) ? 0.7 : 1, boxSizing: "border-box" }}>
              {adminLoading ? "Memproses..." : "Ganti Password User"}
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ChangePassword;