import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const DBCourier = ({ setCurrentPage }) => {
  const [courier, setCourier] = useState(null);
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [uncompletedDeliveries, setUncompletedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentUser?.courier_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        courierResponse,
        todayDeliveriesResponse,
        uncompletedDeliveriesResponse,
      ] = await Promise.all([
        supabase
          .from("couriers")
          .select("*")
          .eq("id", currentUser.courier_id)
          .single(),

        supabase
          .from("deliveries")
          .select("*, customers(name, address, phone), couriers(name)")
          .eq("courier_id", currentUser.courier_id)
          .eq("delivery_date", new Date().toISOString().split("T")[0]),

        supabase
          .from("deliveries")
          .select("*, customers(name, address, phone, lat, lng), couriers(name)")
          .eq("courier_id", currentUser.courier_id)
          .in("status", ["pending", "on_delivery"])
          .order("delivery_date", { ascending: true }),
      ]);

      if (courierResponse.error) throw courierResponse.error;
      if (todayDeliveriesResponse.error) throw todayDeliveriesResponse.error;
      if (uncompletedDeliveriesResponse.error)
        throw uncompletedDeliveriesResponse.error;

      setCourier(courierResponse.data);
      setTodayDeliveries(todayDeliveriesResponse.data || []);
      setUncompletedDeliveries(uncompletedDeliveriesResponse.data || []);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setTodayDeliveries([]);
      setUncompletedDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.courier_id]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) await fetchData();
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchData]);

  const toggleAvailability = async () => {
    if (!courier) return;

    try {
      setUpdatingStatus(true);
      const { error } = await supabase
        .from("couriers")
        .update({ is_available: !courier.is_available })
        .eq("id", courier.id);

      if (error) throw error;

      setCourier((prev) => ({
        ...prev,
        is_available: !prev.is_available,
      }));
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error: " + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Aksi Kurir
  const handleUpdateStatus = async (deliveryId, newStatus) => {
    try {
      const { error } = await supabase
        .from("deliveries")
        .update({ status: newStatus })
        .eq("id", deliveryId);
      
      if (error) throw error;
      fetchData(); // Refresh data
    } catch (error) {
      alert("Gagal update status: " + error.message);
    }
  };

  const handleWA = (phone, customerName) => {
    if (!phone) return alert("Nomor HP tidak tersedia");
    const cleanPhone = phone.replace(/\D/g, "");
    const waNumber = cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone;
    const message = encodeURIComponent(`Halo ${customerName}, saya kurir Ojek-O akan mengantarkan pesanan Anda. Apakah bisa share lokasi?`);
    window.open(`https://wa.me/${waNumber}?text=${message}`, "_blank");
  };

  const handleOpenMap = (lat, lng) => {
    if (!lat || !lng) return alert("Koordinat customer tidak tersedia");
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const formatDeliveryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const getStatusInfo = (status) => {
    const statusConfig = {
      pending: { color: "#fef3c7", textColor: "#92400e", label: "PENDING" },
      on_delivery: { color: "#dbeafe", textColor: "#1e40af", label: "ON DELIVERY" },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 20px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ width: "200px", height: "32px", background: "#e2e8f0", borderRadius: "8px", margin: "0 auto 12px", animation: "pulse 1.5s infinite" }}></div>
            <div style={{ width: "150px", height: "20px", background: "#e2e8f0", borderRadius: "6px", margin: "0 auto", animation: "pulse 1.5s infinite" }}></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: "white", height: "120px", borderRadius: "16px", animation: "pulse 1.5s infinite" }}></div>
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (!courier) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>😕</div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}>Data Kurir Tidak Ditemukan</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>Silakan hubungi administrator</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalToday: todayDeliveries.length,
    completed: todayDeliveries.filter((d) => d.status === "completed").length,
    onDelivery: todayDeliveries.filter((d) => d.status === "on_delivery").length,
    uncompleted: uncompletedDeliveries.length,
  };

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const formattedTime = currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const formattedDate = currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  
  const initial = courier?.name ? courier.name.charAt(0).toUpperCase() : "K";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", paddingBottom: "20px" }}>
      <div style={{ padding: "20px 16px", maxWidth: "800px", margin: "0 auto" }}>
        
        {/* HERO SECTION */}
        <div
          className="courier-hero"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
            borderRadius: "24px",
            padding: "24px",
            marginBottom: "24px",
            color: "white",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 20px 40px -10px rgba(99, 102, 241, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }}></div>
          
          <div style={{ position: "relative", zIndex: 1, width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "700", border: "2px solid rgba(255,255,255,0.4)", flexShrink: 0 }}>
            {initial}
          </div>

          <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
            <p style={{ margin: "0 0 2px 0", fontSize: "12px", opacity: 0.9 }}>{formattedDate} • {formattedTime}</p>
            <h1 style={{ margin: "0 0 2px 0", fontSize: "20px", fontWeight: "700" }}>{greeting()}, {courier?.name?.split(" ")[0]}! 👋</h1>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Siap mengantar hari ini?</p>
          </div>
        </div>

        {/* STATUS TOGGLE */}
        <div style={{ marginBottom: "24px" }}>
          <div
            className="status-card"
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Status Anda Saat Ini
            </div>
            <button
              onClick={toggleAvailability}
              disabled={updatingStatus}
              style={{
                width: "100%",
                padding: "16px",
                background: courier?.is_available 
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                  : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: updatingStatus ? "not-allowed" : "pointer",
                opacity: updatingStatus ? 0.7 : 1,
                transition: "all 0.3s ease",
                boxShadow: courier?.is_available
                  ? "0 8px 20px -4px rgba(16, 185, 129, 0.4)"
                  : "0 8px 20px -4px rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {updatingStatus ? (
                <>⏳ Memperbarui...</>
              ) : courier?.is_available ? (
                <><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "white", animation: "pulse 1.5s infinite" }}></span> AVAILABLE</>
              ) : (
                <>❌ NOT AVAILABLE</>
              )}
            </button>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px", fontWeight: "500" }}>
              {courier?.is_available ? "✅ Anda bisa menerima orderan baru" : "⛔ Anda sedang tidak menerima orderan"}
            </div>
          </div>
        </div>

        {/* STATISTIK HARI INI */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>📊 Ringkasan Hari Ini</h2>
          <div className="courier-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
            <MiniStatCard title="Total Order" value={stats.totalToday} icon="📦" color="#6366f1" bg="#eef2ff" />
            <MiniStatCard title="Selesai" value={stats.completed} icon="✅" color="#10b981" bg="#ecfdf5" />
            <MiniStatCard title="On Delivery" value={stats.onDelivery} icon="🚗" color="#3b82f6" bg="#eff6ff" />
            <MiniStatCard title="Belum Selesai" value={stats.uncompleted} icon="⏳" color="#f59e0b" bg="#fffbeb" />
          </div>
        </div>

        {/* DAFTAR ORDERAN BELUM SELESAI */}
        <div style={{ background: "white", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: "16px", fontWeight: "700" }}>
                Orderan Belum Selesai
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                {uncompletedDeliveries.length} orderan menunggu
              </p>
            </div>
          </div>

          {uncompletedDeliveries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", background: "#f8fafc", borderRadius: "16px" }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
              <p style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                Semua orderan sudah selesai!
              </p>
              <p style={{ margin: "0", fontSize: "12px", color: "#9ca3af" }}>
                Kerja bagus!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {uncompletedDeliveries.map((delivery) => {
                const statusInfo = getStatusInfo(delivery.status);
                return (
                  <div
                    key={delivery.id}
                    style={{
                      padding: "16px",
                      background: "white",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                  >
                    {/* Info Atas */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                        {delivery.customers?.name || "Unknown Customer"}
                      </div>
                      <div style={{ padding: "4px 8px", background: statusInfo.color, color: statusInfo.textColor, borderRadius: "6px", fontSize: "10px", fontWeight: "700", flexShrink: 0 }}>
                        {statusInfo.label}
                      </div>
                    </div>

                    {/* Detail Tengah */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📞</span> {delivery.customers?.phone || "-"}
                        <span style={{ margin: "0 4px" }}>•</span>
                        <span>📅</span> {formatDeliveryDate(delivery.delivery_date)}
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                        <span>📍</span>
                        <span style={{ lineHeight: 1.3 }}>{delivery.customers?.address || "No address"}</span>
                      </div>
                      {delivery.notes && (
                        <div style={{ fontSize: "11px", color: "#8b5cf6", fontStyle: "italic", marginTop: "2px", padding: "4px 8px", background: "#f5f3ff", borderRadius: "6px" }}>
                          📝 {delivery.notes}
                        </div>
                      )}
                    </div>

                    {/* Tombol Aksi */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                      {/* WA Button */}
                      <button
                        onClick={() => handleWA(delivery.customers?.phone, delivery.customers?.name)}
                        style={{ flex: 1, padding: "8px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", borderRadius: "8px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer" }}
                      >
                        💬 WA Customer
                      </button>

                      {/* Map Button */}
                      {delivery.customers?.lat && delivery.customers?.lng && (
                        <button
                          onClick={() => handleOpenMap(delivery.customers.lat, delivery.customers.lng)}
                          style={{ flex: 1, padding: "8px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer" }}
                        >
                          🗺️ Buka Map
                        </button>
                      )}

                      {/* Aksi Status */}
                      {delivery.status === "pending" && (
                        <button
                          onClick={() => {
                            if (confirm("Apakah anda akan mengirim obat ini?")) handleUpdateStatus(delivery.id, "on_delivery");
                          }}
                          style={{ flex: 1, padding: "8px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer" }}
                        >
                          🚗 Kirim Obat
                        </button>
                      )}

                      {delivery.status === "on_delivery" && (
                        <button
                          onClick={() => {
                            if (confirm("Apakah obat sudah benar selesai dikirim?")) handleUpdateStatus(delivery.id, "completed");
                          }}
                          style={{ flex: 1, padding: "8px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", boxShadow: "0 4px 10px rgba(16,185,129,0.3)" }}
                        >
                          ✅ Selesai
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        @media (max-width: 640px) {
          .courier-hero { padding: 20px 16px !important; }
          .status-card { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
};

// --- KOMPONEN MINI STAT CARD ---
const MiniStatCard = ({ title, value, icon, color, bg }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        padding: "16px 12px",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 16px -4px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
        {icon}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "22px", fontWeight: "800", color: "#1e293b", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginTop: "4px" }}>
          {title}
        </div>
      </div>
    </div>
  );
};

export default DBCourier;