import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { createDelivery } from "../lib/deliveries";
import CustomerFormModal from "./CustomerFormModal";

const CreateDeliveryModal = ({
  customer = null,
  couriers = [],
  onClose,
  onSuccess,
  mode = "from-existing",
  currentUser = null,
}) => {
  // 🔥 PERBAIKAN: Langsung panggil getDefaultCourierId saat inisialisasi state
  const loggedInUser = currentUser || JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState({
    customer_id: customer?.id || "",
    courier_id: getDefaultCourierId(loggedInUser, couriers),
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [existingOrders, setExistingOrders] = useState([]);
  const [checkingOrders, setCheckingOrders] = useState(false);

  const [customerSearch, setCustomerSearch] = useState(customer?.name || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // 🔥 FUNGSI PERBAIKAN: Logika penentuan default kurir
  function getDefaultCourierId(user, availableCouriers) {
    // Jika tidak ada user atau data kurir, kembalikan string kosong
    if (!user || !availableCouriers || availableCouriers.length === 0) {
      return "";
    }
    
    // Jika user adalah seorang kurir (punya courier_id)
    if (user.role === "courier" && user.courier_id) {
      // Cari apakah courier_id tersebut ada di list couriers yang dilempar dari parent
      const isCourierExist = availableCouriers.find(c => c.id === user.courier_id);
      if (isCourierExist) {
        return user.courier_id; // Pilih otomatis
      }
    }
    
    // Jika admin, biarkan kosong
    return "";
  }

  useEffect(() => {
    if (customer?.id) {
      setFormData((prev) => ({ ...prev, customer_id: customer.id }));
      setCustomerSearch(customer.name || "");
    }
  }, [customer]);

  // 🔥 EFFECT PERBAIKAN: Pastikan jika data couriers baru selesai loading, dropdown langsung terisi
  useEffect(() => {
    const defaultId = getDefaultCourierId(currentUser, couriers);
    if (defaultId && !formData.courier_id) {
      setFormData(prev => ({ ...prev, courier_id: defaultId }));
    }
  }, [currentUser, couriers]);

  useEffect(() => {
    if (formData.customer_id) {
      checkExistingOrders(formData.customer_id);
    } else {
      setExistingOrders([]);
    }
  }, [formData.customer_id]);

  const checkExistingOrders = async (customerId) => {
    if (!customerId) return;
    setCheckingOrders(true);
    try {
      const { data, error } = await supabase.from("deliveries").select("id, status, order_number, created_at").eq("customer_id", customerId).in("status", ["pending", "on_delivery"]).order("created_at", { ascending: false });
      if (error) throw error;
      setExistingOrders(data || []);
    } catch (error) {
      console.error("Error checking existing orders:", error);
      setExistingOrders([]);
    } finally {
      setCheckingOrders(false);
    }
  };

  const handleCustomerSearch = (searchTerm) => {
    setCustomerSearch(searchTerm);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setFormData((prev) => ({ ...prev, customer_id: "" }));
      return;
    }
    setSearchLoading(true);
    const newTimeout = setTimeout(async () => {
      try {
        await performSearch(searchTerm.trim());
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    setSearchTimeout(newTimeout);
  };

  const performSearch = async (searchTerm) => {
    setHasSearched(true);
    const { data, error } = await supabase.from("customers").select("*").or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`).limit(15).order("name");
    if (error) throw error;
    setSearchResults(data || []);
  };

  const handleSelectCustomer = (selectedCustomer) => {
    setFormData((prev) => ({ ...prev, customer_id: selectedCustomer.id }));
    setCustomerSearch(selectedCustomer.name);
    setSearchResults([]);
    setHasSearched(false);
  };

  const resetSearch = () => {
    setCustomerSearch("");
    setSearchResults([]);
    setHasSearched(false);
    setFormData((prev) => ({ ...prev, customer_id: "" }));
    setExistingOrders([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) return alert("Pilih customer terlebih dahulu!");
    if (existingOrders.length > 0) return alert("Tidak bisa membuat order baru karena customer masih memiliki order aktif!");

    setLoading(true);
    try {
      const deliveryData = { customer_id: formData.customer_id, courier_id: formData.courier_id || null, notes: formData.notes };
      const data = await createDelivery(deliveryData);
      alert(`✅ Orderan berhasil dibuat!`);
      onSuccess(data);
    } catch (error) {
      alert("Error membuat orderan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      const preparedData = { name: customerData.name.trim(), address: customerData.address.trim(), phone: customerData.phone.trim(), lat: customerData.lat ? parseFloat(customerData.lat) : null, lng: customerData.lng ? parseFloat(customerData.lng) : null, distance_km: customerData.distance_km ? parseFloat(customerData.distance_km) : 0, delivery_fee: customerData.delivery_fee ? parseInt(customerData.delivery_fee.replace(/\./g, "")) : 0 };
      let newCustomerId;
      if (editingCustomer?.id) {
        const { error } = await supabase.from("customers").update(preparedData).eq("id", editingCustomer.id);
        if (error) throw error; alert("Data customer berhasil diupdate!"); newCustomerId = editingCustomer.id;
      } else {
        const { data, error } = await supabase.from("customers").insert([preparedData]).select().single();
        if (error) throw error; alert("Customer berhasil dibuat!"); newCustomerId = data.id;
        setFormData((prev) => ({ ...prev, customer_id: data.id }));
        setCustomerSearch(data.name);
      }
      if (customerSearch) await performSearch(customerSearch);
      setShowCustomerForm(false); setEditingCustomer(null);
      return newCustomerId;
    } catch (error) { alert("Error: " + error.message); return null; }
  };

  useEffect(() => {
    return () => { if (searchTimeout) clearTimeout(searchTimeout); };
  }, [searchTimeout]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "white", padding: "24px", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "slideUp 0.3s ease-out" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>📦 Buat Orderan Baru</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", color: "#64748b", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {mode === "from-existing" && customer && (
          <div style={{ background: "#f0f9ff", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", border: "1px solid #bae6fd" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#0369a1", marginBottom: "4px" }}>🏠 Customer Terpilih</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "2px" }}>{customer.name}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>📞 {customer.phone}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>📍 {customer.address}</div>
            {customer.delivery_fee > 0 && <div style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>💰 Ongkir: Rp {customer.delivery_fee.toLocaleString()}</div>}
          </div>
        )}

        {existingOrders.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px" }}>
            <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "13px" }}>⚠️ Ada {existingOrders.length} order aktif:</div>
            <ul style={{ margin: "0 0 8px 0", paddingLeft: "20px", fontSize: "12px" }}>
              {existingOrders.map((order) => (
                <li key={order.id} style={{ marginBottom: "4px" }}>
                  <strong>Order #{order.order_number}</strong> - <span style={{ background: order.status === "pending" ? "#f59e0b" : "#0270f5", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "600" }}>{order.status === "pending" ? "PENDING" : "ON DELIVERY"}</span>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: "11px", color: "#b91c1c" }}>Selesaikan order tersebut terlebih dahulu.</div>
          </div>
        )}

        {checkingOrders && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", marginBottom: "16px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>🔍 Memeriksa order aktif...</div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "from-new" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Cari Customer *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "14px" }}>🔍</span>
                <input type="text" placeholder="Cari nama, no HP, atau alamat..." value={customerSearch} onChange={(e) => handleCustomerSearch(e.target.value)} style={{ width: "100%", padding: "12px 14px 12px 40px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} onFocus={() => setHasSearched(true)} />
                {searchLoading && <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", border: "2px solid #e2e8f0", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>}
              </div>

              {hasSearched && !searchLoading && (
                <div style={{ marginTop: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", maxHeight: "200px", overflow: "auto", background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                  {searchResults.length > 0 ? (
                    <div>
                      <div style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b", fontWeight: "600" }}>📊 Ditemukan {searchResults.length} customer</div>
                      {searchResults.map((cust) => (
                        <div key={cust.id} onClick={() => handleSelectCustomer(cust)} style={{ padding: "12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: formData.customer_id === cust.id ? "#f0f9ff" : "white" }}>
                          <div style={{ fontWeight: "600", fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                            {cust.name} {formData.customer_id === cust.id && <span style={{ fontSize: "10px", background: "#10b981", color: "white", padding: "2px 6px", borderRadius: "4px" }}>✅ TERPILIH</span>}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{cust.address}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>📞 {cust.phone} {cust.delivery_fee > 0 && <span style={{ marginLeft: "8px" }}>💰 Rp {cust.delivery_fee.toLocaleString()}</span>}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    customerSearch && !formData.customer_id && (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
                        <div style={{ fontWeight: "500", marginBottom: "8px", color: "#374151", fontSize: "13px" }}>Tidak ada customer yang cocok</div>
                        <div style={{ fontSize: "12px", marginBottom: "16px", color: "#64748b" }}>Kata kunci: <strong>"{customerSearch}"</strong></div>
                        <button type="button" onClick={() => { setEditingCustomer({ name: customerSearch, phone: "", address: "", lat: "", lng: "", distance_km: "", delivery_fee: "" }); setShowCustomerForm(true); }} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", width: "100%" }}>➕ Buat Customer Baru</button>
                      </div>
                    )
                  )}
                </div>
              )}

              {formData.customer_id && (
                <div style={{ marginTop: "8px", padding: "12px 16px", background: "#f0f9ff", borderRadius: "10px", border: "1px solid #bae6fd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "#0369a1" }}>✅ Customer Terpilih</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{searchResults.find(c => c.id === formData.customer_id)?.name || customerSearch}</div>
                  </div>
                  <button type="button" onClick={resetSearch} style={{ padding: "6px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>Hapus</button>
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Pilih Kurir (Opsional)</label>
            <select value={formData.courier_id} onChange={(e) => setFormData((prev) => ({ ...prev, courier_id: e.target.value }))} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box", background: "#f8fafc", outline: "none" }}>
              <option value="">Pilih Kurir (Bisa kosong)</option>
              {couriers.map((courier) => (
                <option key={courier.id} value={courier.id}>{courier.name} {courier.is_available ? "✅" : "❌"}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Catatan (Opsional)</label>
            <textarea name="notes" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} rows="3" style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#f8fafc" }} placeholder="Tambahkan catatan khusus..." />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "14px", background: "white", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={loading || !formData.customer_id || existingOrders.length > 0} style={{ flex: 1, padding: "14px", background: existingOrders.length > 0 ? "#ef4444" : loading ? "#94a3b8" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: loading || !formData.customer_id || existingOrders.length > 0 ? "not-allowed" : "pointer", opacity: loading || !formData.customer_id || existingOrders.length > 0 ? 0.7 : 1, boxShadow: existingOrders.length > 0 || loading || !formData.customer_id ? "none" : "0 4px 12px rgba(99,102,241,0.3)" }}>
              {existingOrders.length > 0 ? "❌ Ada Order Aktif" : loading ? "Membuat..." : "✅ Buat Orderan"}
            </button>
          </div>
        </form>
      </div>

      {showCustomerForm && (
        <CustomerFormModal editingCustomer={editingCustomer} onSave={handleSaveCustomer} onClose={() => { setShowCustomerForm(false); setEditingCustomer(null); }} currentUserRole="admin" />
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default CreateDeliveryModal;