import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ==========================================
// KOMPONEN COURIER CARD
// ==========================================
const CourierCard = ({ courier, onEdit, onDelete, onToggleAvailability }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", background: "white", overflow: "hidden", transition: "all 0.2s", boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header (Klik untuk expand) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ padding: "16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", background: isExpanded ? "#f8fafc" : "white", flex: 1 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", lineHeight: 1.3 }}>
              {courier.name}
            </div>
            <div style={{ padding: "2px 8px", background: courier.is_available ? "#ecfdf5" : "#fef2f2", color: courier.is_available ? "#059669" : "#dc2626", borderRadius: "6px", fontSize: "10px", fontWeight: "700", border: `1px solid ${courier.is_available ? "#a7f3d0" : "#fecaca"}`, flexShrink: 0 }}>
              {courier.is_available ? "AVAILABLE" : "UNAVAILABLE"}
            </div>
          </div>
          
          <div style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ opacity: 0.7 }}>📞</span> {courier.phone}
          </div>
        </div>

        <div style={{ color: "#94a3b8", fontSize: "18px", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none", padding: "2px", flexShrink: 0 }}>
          ⌄
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: "12px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleAvailability(courier); }}
              style={{ padding: "8px 4px", background: courier.is_available ? "#fffbeb" : "#ecfdf5", color: courier.is_available ? "#d97706" : "#059669", border: `1px solid ${courier.is_available ? "#fde68a" : "#a7f3d0"}`, borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}
            >
              {courier.is_available ? "⏸️ Off" : "▶️ On"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(courier); }}
              style={{ padding: "8px 4px", background: "white", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(courier.id); }}
              style={{ padding: "8px 4px", background: "white", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}
            >
              🗑️ Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// KOMPONEN UTAMA COURIERS
// ==========================================
const Couriers = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourier, setEditingCourier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    username: "",
    password: "",
    is_available: true,
  });

  const fetchCouriers = async () => {
    try {
      const { data, error } = await supabase.from("couriers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      alert("Error fetching couriers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCouriers(); }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || (!editingCourier && (!formData.username || !formData.password))) {
      alert("Nama, No HP, Username, dan Password harus diisi!");
      return;
    }

    try {
      setSubmitting(true);
      if (editingCourier) {
        const courierData = { name: formData.name, phone: formData.phone, is_available: formData.is_available };
        const { error } = await supabase.from("couriers").update(courierData).eq("id", editingCourier.id);
        if (error) throw error;
        alert("Data kurir berhasil diupdate!");
      } else {
        const { data: existingUser } = await supabase.from("users").select("id").eq("username", formData.username).single();
        if (existingUser) throw new Error("Username sudah digunakan! Silakan pilih username lain.");

        const { data: newCourier, error: courierError } = await supabase.from("couriers").insert([{ name: formData.name, phone: formData.phone, is_available: formData.is_available }]).select().single();
        if (courierError) throw courierError;

        const encodedPassword = btoa(formData.password);
        const { error: userError } = await supabase.from("users").insert([{ username: formData.username, password: encodedPassword, role: "courier", courier_id: newCourier.id }]);
        if (userError) throw userError;
        
        alert("Data kurir dan user login berhasil dibuat!");
      }
      resetForm(); fetchCouriers();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (courier) => {
    setEditingCourier(courier);
    setFormData({ name: courier.name, phone: courier.phone, username: "", password: "", is_available: courier.is_available });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Apakah yakin ingin menghapus data kurir ini?\n(User login kurir ini juga akan terhapus)")) return;
    try {
      const { error } = await supabase.from("couriers").delete().eq("id", id);
      if (error) throw error;
      alert("Data kurir berhasil dihapus!"); fetchCouriers();
    } catch (error) { alert("Error: " + error.message); }
  };

  const toggleAvailability = async (courier) => {
    try {
      const { error } = await supabase.from("couriers").update({ is_available: !courier.is_available }).eq("id", courier.id);
      if (error) throw error;
      fetchCouriers();
    } catch (error) { alert("Error: " + error.message); }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", username: "", password: "", is_available: true });
    setEditingCourier(null); setShowForm(false);
  };

  const filteredCouriers = couriers.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          Memuat data kurir...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h1 style={{ margin: "0 0 2px 0", fontSize: "20px", fontWeight: "800", color: "#1e293b" }}>🚗 Data Kurir</h1>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>Kelola data kurir dan ketersediaan</p>
            </div>
            <button onClick={() => setShowForm(true)} style={{ padding: "8px 14px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" }}>
              <span>+</span> Tambah Kurir
            </button>
          </div>

          {/* SEARCH BAR */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "14px" }}>🔍</span>
              <input type="text" placeholder="Cari nama atau no HP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "white" }} />
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", background: "white", padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
              {filteredCouriers.length} dari {couriers.length} kurir
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={{ padding: "8px 12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Clear</button>
            )}
          </div>
        </div>

        {/* COURIERS GRID */}
        <div>
          {filteredCouriers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚗</div>
              <p style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "600", color: "#6b7280" }}>{searchTerm ? "Kurir tidak ditemukan" : "Belum ada data kurir"}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {filteredCouriers.map((courier) => (
                <CourierCard key={courier.id} courier={courier} onEdit={handleEdit} onDelete={handleDelete} onToggleAvailability={toggleAvailability} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORM TAMBAH/EDIT */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "slideUp 0.3s ease-out" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>
                {editingCourier ? "✏️ Edit Data Kurir" : "➕ Tambah Kurir Baru"}
              </h3>
              <button onClick={resetForm} style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", color: "#64748b", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Nama Kurir *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} placeholder="Nama lengkap" required />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>No HP *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} placeholder="08123456789" required />
                </div>
                
                {!editingCourier && (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Username *</label>
                      <input type="text" name="username" value={formData.username} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} placeholder="Username" required />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Password *</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} placeholder="Password" required />
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", padding: "12px", background: "#f8fafc", borderRadius: "10px" }}>
                <input type="checkbox" name="is_available" checked={formData.is_available} onChange={handleInputChange} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#6366f1" }} />
                <div>
                  <div style={{ fontWeight: "600", color: "#374151", fontSize: "13px" }}>Status Available</div>
                  <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>Kurir dapat menerima orderan baru</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                  {submitting ? "Menyimpan..." : editingCourier ? "Update Data" : "Simpan Kurir"}
                </button>
                <button type="button" onClick={resetForm} style={{ flex: 1, padding: "14px", background: "white", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Couriers;