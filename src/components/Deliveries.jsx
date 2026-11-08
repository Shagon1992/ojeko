import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getDeliveries, updateDeliveryStatus, updateDeliveryCourier, deleteDelivery } from "../lib/deliveries";
import CustomerFormModal from "./CustomerFormModal";
import CreateDeliveryModal from "./CreateDeliveryModal";
import PhotoModal from "./PhotoModal";

// Fungsi Helper Template WA
const fetchSingleTemplate = async (templateType) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const { data, error } = await supabase.from("message_templates").select("*").eq("user_id", user.id).eq("template_type", templateType).single();
    if (error) return getDefaultTemplate(templateType);
    return data;
  } catch (error) { return getDefaultTemplate(templateType); }
};

const getDefaultTemplate = (templateType) => {
  const defaults = {
    admin_to_customer: { id: "default", template_type: "admin_to_customer", message: "Assalamu'alaikum {nama_customer}, pesanan obat Anda sedang diproses dan akan segera dikirim oleh kurir kami. Terima kasih." },
    admin_to_courier: { id: "default", template_type: "admin_to_courier", message: "Assalamu'alaikum pak {nama_kurir}, ada pesanan antar obat atas nama {nama_customer}, alamat {alamat_customer}. Terima kasih." },
    courier_to_customer: { id: "default", template_type: "courier_to_customer", message: "Assalamu'alaiukum, saya {nama_kurir} dari Ojek-O akan mengantarkan obat anda, dengan alamat {alamat_customer}, apa boleh di share lokasi agar lebih akurat??" },
  };
  return defaults[templateType] || defaults["courier_to_customer"];
};

const replaceTemplateVariables = (template, delivery) => {
  const customer = delivery.customers; const courier = delivery.couriers; const currentUser = JSON.parse(localStorage.getItem("user"));
  const variables = { "{nama_customer}": customer?.name || "", "{alamat_customer}": customer?.address || "", "{no_hp_customer}": customer?.phone || "", "{nama_kurir}": courier?.name || currentUser?.username || "", "{resi}": delivery.order_number || delivery.id.substring(0, 8).toUpperCase(), "{ongkir}": customer?.delivery_fee ? `Rp ${customer.delivery_fee.toLocaleString()}` : "", "{jarak}": customer?.distance_km ? `${customer.distance_km} km` : "" };
  let message = template.message;
  Object.keys(variables).forEach((key) => { message = message.replace(new RegExp(key, "g"), variables[key]); });
  return message;
};

const getTemplateTypeByContext = (userRole, target) => {
  if (userRole === "admin") return target === "customer" ? "admin_to_customer" : "admin_to_courier";
  return "courier_to_customer";
};

// =============================================
// KOMPONEN MODAL TEMPLATE MESSAGE
// =============================================
const TemplateModal = ({ delivery, target, onSend, onClose }) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      const templateType = getTemplateTypeByContext(currentUser.role, target);
      const userTemplate = await fetchSingleTemplate(templateType);
      setTemplate(userTemplate);
      setLoading(false);
    };
    loadTemplate();
  }, [currentUser.role, target]);

  const handleSend = () => { onSend(replaceTemplateVariables(template, delivery)); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "20px", padding: "24px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "slideUp 0.3s ease-out" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>📝 Preview Pesan WA</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", color: "#64748b", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Kirim ke: {target === "customer" ? delivery.customers?.name : delivery.couriers?.name}</div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>📞 {target === "customer" ? delivery.customers?.phone : delivery.couriers?.phone}</div>
        </div>
        {loading ? <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Memuat template...</div> : (
          <div style={{ background: "#f0f9ff", padding: "16px", borderRadius: "12px", marginBottom: "20px", border: "1px solid #bae6fd" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#0369a1", marginBottom: "8px" }}>📋 Pesan yang akan dikirim:</div>
            <div style={{ fontSize: "13px", color: "#374151", whiteSpace: "pre-wrap", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", lineHeight: "1.5" }}>{replaceTemplateVariables(template, delivery)}</div>
          </div>
        )}
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "white", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Batal</button>
          <button onClick={handleSend} disabled={loading} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>Kirim WA</button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// KOMPONEN DELIVERY CARD
// =============================================
const DeliveryCard = ({ delivery, onDelete, onUpdateStatus, onUpdateCourier, onEditCustomer, couriers, currentUser, showAllOrders, onOpenPhoto }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [waTarget, setWaTarget] = useState(null);

  const isAdmin = currentUser?.role === "admin";
  const isAssignedCourier = delivery.courier_id === currentUser?.courier_id;
  const shouldDisableButtons = !isAdmin && !isAssignedCourier && showAllOrders;

  const statusConfig = { pending: { color: "#fef3c7", textColor: "#92400e", label: "PENDING" }, on_delivery: { color: "#dbeafe", textColor: "#1e40af", label: "ON DELIVERY" }, completed: { color: "#d1fae5", textColor: "#065f46", label: "SELESAI" } };
  const statusInfo = statusConfig[delivery.status] || statusConfig.pending;

  const formatPhoneForWA = (phone) => {
    if (!phone) return ""; const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) return "62" + cleanPhone.substring(1);
    if (cleanPhone.startsWith("62")) return cleanPhone; return cleanPhone;
  };

  const handleWAWithTemplate = (target) => {
    const phone = target === "customer" ? delivery.customers?.phone : delivery.couriers?.phone;
    if (!phone) return alert(`No HP ${target === "customer" ? "customer" : "kurir"} tidak tersedia`);
    setWaTarget(target); setShowTemplateModal(true);
  };

  const handleSendWA = (message) => {
    const phone = waTarget === "customer" ? delivery.customers?.phone : delivery.couriers?.phone;
    window.open(`https://wa.me/${formatPhoneForWA(phone)}?text=${encodeURIComponent(message)}`, "_blank");
    setShowTemplateModal(false); setWaTarget(null);
  };

  const handleOpenMap = () => {
    const customer = delivery.customers;
    if (!customer?.lat || !customer?.lng) return alert("Koordinat customer tidak tersedia");
    window.open(`https://www.google.com/maps?q=${customer.lat},${customer.lng}`, "_blank");
  };

  const confirmGantiKurir = async () => {
    if (!selectedCourier) return alert("Pilih kurir terlebih dahulu!");
    const courier = couriers.find((c) => c.id === selectedCourier);
    if (!courier) return;
    if (!confirm(`Betul akan ganti kurir menjadi ${courier.name}?`)) return;
    try {
      const success = await onUpdateCourier(delivery.id, selectedCourier);
      if (success) { setShowCourierModal(false); alert(`Kurir berhasil diganti menjadi ${courier.name}`); }
    } catch (error) { alert("Error: " + error.message); }
  };

  const isCustomerDataComplete = (customer, userRole) => {
    const requiredFields = [customer?.name, customer?.address, customer?.phone, customer?.distance_km, customer?.delivery_fee];
    if (userRole === "admin") return requiredFields.every((field) => field);
    return requiredFields.every((field) => field) && customer?.lat && customer?.lng;
  };

  const handleSelesai = () => {
    if (isAdmin && !delivery.courier_id) return alert("❌ Harap pilih kurir terlebih dahulu sebelum menyelesaikan pengiriman.");
    if (!isCustomerDataComplete(delivery.customers, currentUser.role)) {
      const msg = isAdmin ? "Data customer tidak lengkap. Data wajib: Nama, Alamat, No HP, Jarak, Ongkir.\n\nApakah Anda ingin melengkapi data sekarang?" : "Data customer tidak lengkap. Harap lengkapi SEMUA data termasuk koordinat.\n\nApakah Anda ingin melengkapi data sekarang?";
      if (confirm(msg)) onEditCustomer(delivery.customers); return;
    }
    if (confirm("Apakah obat sudah benar selesai dikirim?")) onUpdateStatus(delivery.id, "completed");
  };

  const renderActionButtons = () => {
    if (delivery.status === "completed" && !isAdmin) return null;
    if (!isAdmin && !isAssignedCourier && showAllOrders) return <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px" }}>⚠️ Orderan kurir lain</div>;

    // SVG Logo WhatsApp
    const WaIcon = () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
        
        {/* BARIS 1: Tombol Kecil */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "space-between" }}>
          
          {(isAdmin || isAssignedCourier) && (
            <button onClick={() => handleWAWithTemplate("customer")} style={{ flex: "1 1 auto", padding: "8px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <WaIcon /> Cust
            </button>
          )}

          {isAdmin && delivery.couriers && (
            <button onClick={() => handleWAWithTemplate("courier")} style={{ flex: "1 1 auto", padding: "8px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <WaIcon /> Kurir
            </button>
          )}

          {(isAdmin || isAssignedCourier) && (
            <button onClick={() => onEditCustomer(delivery.customers)} style={{ flex: "1 1 auto", padding: "8px", background: "#f3e8ff", color: "#7e22ce", border: "1px solid #d8b4fe", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              ✏️ Edit
            </button>
          )}

          {delivery.customers?.lat && delivery.customers?.lng && (
            <button onClick={handleOpenMap} style={{ flex: "1 1 auto", padding: "8px", background: "white", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              🗺️ Map
            </button>
          )}

          {(isAdmin || isAssignedCourier) && (
            <button onClick={() => { setSelectedCourier(delivery.courier_id || ""); setShowCourierModal(true); }} style={{ flex: "1 1 auto", padding: "8px", background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              🔄 Ganti
            </button>
          )}

          <button onClick={() => onOpenPhoto(delivery.customers)} style={{ flex: "1 1 auto", padding: "8px", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            {delivery.customers?.house_photo_url ? "📸 Foto" : "+ Foto"}
          </button>
        </div>

        {/* BARIS 2: Tombol Aksi Utama (Kirim/Selesai & Hapus) */}
        <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
          
          {/* Tombol Kirim (Jika Pending & Kurir) */}
          {isAssignedCourier && delivery.status === "pending" && (
            <button onClick={() => { if(confirm("Apakah Anda akan mengirim obat ini?")) onUpdateStatus(delivery.id, "on_delivery"); }} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 4px 10px rgba(59,130,246,0.3)" }}>
              🚀 Kirim Obat
            </button>
          )}

          {/* Tombol Selesai */}
          {((isAdmin && delivery.status !== "completed") || (!isAdmin && delivery.status === "on_delivery" && isAssignedCourier)) && (
            <button onClick={handleSelesai} disabled={isAdmin && !delivery.courier_id} style={{ flex: 1, padding: "10px", background: isAdmin && !delivery.courier_id ? "#cbd5e1" : "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: isAdmin && !delivery.courier_id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: isAdmin && !delivery.courier_id ? 0.7 : 1, boxShadow: isAdmin && !delivery.courier_id ? "none" : "0 4px 10px rgba(16,185,129,0.3)" }}>
              {isAdmin && !delivery.courier_id ? "⏳ Pilih Kurir" : "✅ Selesai"}
            </button>
          )}

          {/* Tombol Hapus (Kecil, di Kanan) */}
          {isAdmin && (
            <button onClick={() => onDelete(delivery.id)} style={{ flex: "0 0 auto", padding: "10px 14px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Hapus">
              🗑️
            </button>
          )}
        </div>

      </div>
    );
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", background: "white", overflow: "hidden", boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "100%" }}>
      <div onClick={() => setIsExpanded(!isExpanded)} style={{ padding: "16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px", background: isExpanded ? "#f8fafc" : "white", flex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", lineHeight: 1.3 }}>{delivery.customers?.name || "Unknown"}</div>
            <div style={{ padding: "2px 6px", background: statusInfo.color, color: statusInfo.textColor, borderRadius: "6px", fontSize: "10px", fontWeight: "700", flexShrink: 0 }}>{statusInfo.label}</div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}><span style={{ opacity: 0.7 }}>📍</span><span style={{ lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: isExpanded ? "none" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{delivery.customers?.address || "No address"}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ opacity: 0.7 }}>🚗</span> {delivery.couriers?.name || "Belum ada kurir"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{new Date(delivery.delivery_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</div>
          <div style={{ color: "#94a3b8", fontSize: "16px", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none", padding: "2px" }}>⌄</div>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: "0 16px 16px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ padding: "12px 0", fontSize: "12px", color: "#475569", display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>📞 {delivery.customers?.phone || "-"}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>💰 Rp {(delivery.customers?.delivery_fee || 0).toLocaleString()}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>📏 {delivery.customers?.distance_km || 0} km</span>
          </div>
          {delivery.notes && <div style={{ fontSize: "11px", color: "#8b5cf6", fontStyle: "italic", marginBottom: "12px", padding: "6px 10px", background: "#f5f3ff", borderRadius: "6px", borderLeft: "3px solid #8b5cf6" }}>📝 {delivery.notes}</div>}
          {renderActionButtons()}
        </div>
      )}

      {showCourierModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "20px", width: "100%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "slideUp 0.3s ease-out" }}>
            <h4 style={{ margin: "0 0 16px 0", color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>🔄 Ganti Kurir</h4>
            <div style={{ marginBottom: "20px" }}>
              <select value={selectedCourier} onChange={(e) => setSelectedCourier(e.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#f8fafc" }}>
                <option value="">Pilih Kurir</option>
                {couriers.map((courier) => (<option key={courier.id} value={courier.id}>{courier.name} {courier.is_available ? "✅" : "❌"}</option>))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowCourierModal(false)} style={{ flex: 1, padding: "12px", background: "white", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Batal</button>
              <button onClick={confirmGantiKurir} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && <TemplateModal delivery={delivery} target={waTarget} onSend={handleSendWA} onClose={() => { setShowTemplateModal(false); setWaTarget(null); }} />}
    </div>
  );
};

// =============================================
// KOMPONEN UTAMA DELIVERIES
// =============================================
const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("belum-dikirim");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllOrders, setShowAllOrders] = useState(false);

  const [showCreateDeliveryModal, setShowCreateDeliveryModal] = useState(false);
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerForPhoto, setSelectedCustomerForPhoto] = useState(null); // State untuk foto

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isAdmin = currentUser?.role === "admin";

  const fetchData = async () => {
    try {
      setLoading(true);
      const deliveriesData = await getDeliveries();
      setDeliveries(deliveriesData || []);
      const { data: couriersData } = await supabase.from("couriers").select("*").order("name");
      setCouriers(couriersData || []);
    } catch (error) { alert("Error fetching data: " + error.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getFilteredDeliveries = () => {
    const today = new Date().toISOString().split("T")[0];
    let filtered = deliveries;
    switch (activeTab) {
      case "belum-dikirim": filtered = filtered.filter((d) => d.status === "pending" || d.status === "on_delivery"); break;
      case "selesai-dikirim": filtered = filtered.filter((d) => d.status === "completed" && d.delivery_date === today); break;
      case "keseluruhan": filtered = filtered.filter((d) => d.delivery_date === today); break;
    }
    if (!isAdmin && !showAllOrders) filtered = filtered.filter((d) => d.courier_id === currentUser.courier_id);
    if (searchTerm) {
      filtered = filtered.filter((d) => d.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || d.customers?.address?.toLowerCase().includes(searchTerm.toLowerCase()) || d.customers?.phone?.includes(searchTerm) || d.couriers?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  };

  const filteredDeliveries = getFilteredDeliveries();

  const getOrderCount = (tab) => {
    const today = new Date().toISOString().split("T")[0];
    let filtered = deliveries;
    if (!isAdmin && !showAllOrders) filtered = filtered.filter((d) => d.courier_id === currentUser.courier_id);
    switch (tab) {
      case "belum-dikirim": return filtered.filter((d) => d.status === "pending" || d.status === "on_delivery").length;
      case "selesai-dikirim": return filtered.filter((d) => d.status === "completed" && d.delivery_date === today).length;
      case "keseluruhan": return filtered.filter((d) => d.delivery_date === today).length;
      default: return 0;
    }
  };

  const handleUpdateStatus = async (deliveryId, status) => { try { await updateDeliveryStatus(deliveryId, status); fetchData(); } catch (error) { alert("Error: " + error.message); } };
  const handleUpdateCourier = async (deliveryId, courierId) => { try { await updateDeliveryCourier(deliveryId, courierId); fetchData(); return true; } catch (error) { alert("Error: " + error.message); return false; } };
  const handleDeleteDelivery = async (deliveryId) => {
    if (!confirm("Apakah yakin ingin menghapus delivery ini?")) return;
    try { await deleteDelivery(deliveryId); alert("Delivery berhasil dihapus!"); fetchData(); } catch (error) { alert("Error: " + error.message); }
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      const preparedData = { name: customerData.name.trim(), address: customerData.address.trim(), phone: customerData.phone.trim(), lat: customerData.lat ? parseFloat(customerData.lat) : null, lng: customerData.lng ? parseFloat(customerData.lng) : null, distance_km: customerData.distance_km ? parseFloat(customerData.distance_km) : 0, delivery_fee: customerData.delivery_fee ? parseInt(customerData.delivery_fee.replace(/\./g, "")) : 0, house_photo_url: customerData.house_photo_url };
      let newCustomerId;
      if (editingCustomer?.id) {
        const { error } = await supabase.from("customers").update(preparedData).eq("id", editingCustomer.id);
        if (error) throw error; alert("Data customer berhasil diupdate!"); newCustomerId = editingCustomer.id;
      } else {
        const { data, error } = await supabase.from("customers").insert([preparedData]).select().single();
        if (error) throw error; alert("Customer berhasil dibuat!"); newCustomerId = data.id;
      }
      setShowCustomerFormModal(false); setEditingCustomer(null); fetchData(); return newCustomerId;
    } catch (error) { alert("Error: " + error.message); return null; }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          Memuat data deliveries...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: "800", color: "#1e293b" }}>📦 Management Deliveries</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>{isAdmin ? "Admin" : "Kurir"} - Kelola pengiriman dan tracking status</p>
          </div>
          <button onClick={() => setShowCreateDeliveryModal(true)} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" }}><span>+</span> Buat Pengiriman</button>
        </div>

        {!isAdmin && (
          <div style={{ background: "white", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" id="showAllOrders" checked={showAllOrders} onChange={(e) => setShowAllOrders(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#6366f1" }} />
            <label htmlFor="showAllOrders" style={{ fontSize: "13px", color: "#374151", cursor: "pointer", fontWeight: "500", flex: 1 }}>Tampilkan Semua Orderan</label>
            <div style={{ fontSize: "11px", color: "#6b7280", background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px" }}>{showAllOrders ? "👁️ Semua" : "👤 Milik Saya"}</div>
          </div>
        )}

        <div style={{ display: "flex", background: "white", padding: "6px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px", gap: "4px" }}>
          {[{ id: "belum-dikirim", label: "Belum Dikirim" }, { id: "selesai-dikirim", label: "Selesai" }, { id: "keseluruhan", label: "Keseluruhan" }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "10px 8px", background: activeTab === tab.id ? "#6366f1" : "transparent", color: activeTab === tab.id ? "white" : "#64748b", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <span>{tab.label}</span><span style={{ fontSize: "11px", opacity: 0.8 }}>{getOrderCount(tab.id)} Orderan</span>
            </button>
          ))}
        </div>

        <div style={{ background: "white", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#94a3b8" }}>🔍</span>
          <input type="text" placeholder="Cari nama, alamat, no HP, atau kurir..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", background: "transparent", color: "#1e293b" }} />
        </div>

        <div>
          {filteredDeliveries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📦</div>
              <p style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "600", color: "#6b7280" }}>Tidak ada data delivery</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px" }}>
              {filteredDeliveries.map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} onDelete={handleDeleteDelivery} onUpdateStatus={handleUpdateStatus} onUpdateCourier={handleUpdateCourier} onEditCustomer={(customer) => { setEditingCustomer(customer); setShowCustomerFormModal(true); }} couriers={couriers} currentUser={currentUser} showAllOrders={showAllOrders} onOpenPhoto={(cust) => setSelectedCustomerForPhoto(cust)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateDeliveryModal && <CreateDeliveryModal customer={null} couriers={couriers} onClose={() => setShowCreateDeliveryModal(false)} onSuccess={() => { setShowCreateDeliveryModal(false); fetchData(); }} mode="from-new" currentUser={currentUser} />}
      {showCustomerFormModal && <CustomerFormModal editingCustomer={editingCustomer} onSave={handleSaveCustomer} onClose={() => { setShowCustomerFormModal(false); setEditingCustomer(null); }} currentUserRole={currentUser.role} isRequiredForCompletion={true} />}
      
      {/* RENDER MODAL FOTO */}
      {selectedCustomerForPhoto && <PhotoModal customer={selectedCustomerForPhoto} onClose={() => setSelectedCustomerForPhoto(null)} onUpdate={() => fetchData()} />}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 640px) {
          .action-grid { grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
          .action-grid button { font-size: 11px !important; padding: 8px !important; }
        }
      `}</style>
    </div>
  );
};

export default Deliveries;