import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const DBCourier = ({ setCurrentPage }) => {
  const [courier, setCourier] = useState(null);
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [uncompletedDeliveries, setUncompletedDeliveries] = useState([]); // 🎯 Ganti nama variable
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const fetchData = useCallback(async () => {
    if (!currentUser?.courier_id) {
      setLoading(false);
      return;
    }

    try {
      console.log("🔄 Fetching courier data...");
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
          .select("*, customers(name, address), couriers(name)")
          .eq("courier_id", currentUser.courier_id)
          .eq("delivery_date", new Date().toISOString().split("T")[0]),

        // 🎯 PERBAIKAN: Fetch pending DAN on_delivery
        supabase
          .from("deliveries")
          .select("*, customers(name, address, phone), couriers(name)")
          .eq("courier_id", currentUser.courier_id)
          .in("status", ["pending", "on_delivery"]) // 🎯 Tambah status on_delivery
          .order("delivery_date", { ascending: true }),
      ]);

      if (courierResponse.error) throw courierResponse.error;
      if (todayDeliveriesResponse.error) throw todayDeliveriesResponse.error;
      if (uncompletedDeliveriesResponse.error)
        throw uncompletedDeliveriesResponse.error;

      setCourier(courierResponse.data);
      setTodayDeliveries(todayDeliveriesResponse.data || []);
      setUncompletedDeliveries(uncompletedDeliveriesResponse.data || []);

      console.log("✅ Courier data loaded successfully");
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
      if (isMounted) {
        await fetchData();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
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

  const handleGoToDeliveries = () => {
    setCurrentPage("deliveries");
  };

  const formatDeliveryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  // 🎯 FUNGSI BARU: Get status badge color dan label
  const getStatusInfo = (status) => {
    const statusConfig = {
      pending: { color: "#fef3c7", textColor: "#92400e", label: "PENDING" },
      on_delivery: {
        color: "#dbeafe",
        textColor: "#1e40af",
        label: "ON DELIVERY",
      },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #f1f5f9",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          ></div>
          <h3
            style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600" }}
          >
            Memuat Dashboard Kurir...
          </h3>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.7 }}>
            Menyiapkan data pengiriman
          </p>
        </div>
      </div>
    );
  }

  if (!courier) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>😕</div>
          <h3
            style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}
          >
            Data Kurir Tidak Ditemukan
          </h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Silakan hubungi administrator
          </p>
        </div>
      </div>
    );
  }

  const stats = {
    totalToday: todayDeliveries.length,
    pending: todayDeliveries.filter((d) => d.status === "pending").length,
    onDelivery: todayDeliveries.filter((d) => d.status === "on_delivery")
      .length,
    completed: todayDeliveries.filter((d) => d.status === "completed").length,
    uncompleted: uncompletedDeliveries.length, // 🎯 Ganti nama
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{ padding: "24px 20px", maxWidth: "1200px", margin: "0 auto" }}
      >
        {/* Header dengan Status di Tengah */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "28px",
              fontWeight: "700",
              color: "#1e293b",
            }}
          >
            🚗 Dashboard Kurir
          </h1>
          <p
            style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "16px" }}
          >
            Hai {courier?.name} - Kelola pengiriman Anda
          </p>

          {/* Status Available di Tengah */}
          <div
            style={{
              display: "inline-block",
              background: "white",
              padding: "16px 32px",
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#64748b",
                marginBottom: "8px",
              }}
            >
              Status Saat Ini
            </div>
            <button
              onClick={toggleAvailability}
              disabled={updatingStatus}
              style={{
                padding: "12px 24px",
                background: courier?.is_available ? "#10b981" : "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                minWidth: "180px",
                opacity: updatingStatus ? 0.7 : 1,
                transition: "all 0.2s",
                boxShadow: courier?.is_available
                  ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                  : "0 4px 12px rgba(239, 68, 68, 0.3)",
              }}
            >
              {updatingStatus
                ? "⏳ Updating..."
                : courier?.is_available
                ? "✅ AVAILABLE"
                : "❌ NOT AVAILABLE"}
            </button>
            <div
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                marginTop: "8px",
              }}
            >
              {courier?.is_available
                ? "Bisa terima orderan baru"
                : "Tidak bisa terima orderan"}
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <StatCard
            title="Total Order Hari Ini"
            value={stats.totalToday}
            icon="📦"
            color="#667eea"
          />

          <StatCard
            title="Belum Selesai"
            value={stats.uncompleted}
            icon="⏳"
            color="#f59e0b"
            description="Pending + On Delivery"
          />

          <StatCard
            title="On Delivery"
            value={stats.onDelivery}
            icon="🚗"
            color="#3b82f6"
          />

          <StatCard
            title="Selesai"
            value={stats.completed}
            icon="✅"
            color="#10b981"
          />
        </div>

        {/* 🎯 PERBAIKAN: Panel Orderan Belum Selesai */}
        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px 0",
              color: "#1e293b",
              fontSize: "20px",
              fontWeight: "600",
            }}
          >
            📋 Orderan Belum Selesai ({uncompletedDeliveries.length})
          </h3>

          {uncompletedDeliveries.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#9ca3af",
                background: "#f8fafc",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "16px",
                  fontWeight: "500",
                  color: "#6b7280",
                }}
              >
                Yey, semua orderan sudah selesai!
              </p>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  color: "#9ca3af",
                }}
              >
                Yuk cari orderan baru di halaman Deliveries
              </p>
              <button
                onClick={handleGoToDeliveries}
                style={{
                  padding: "12px 24px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow =
                    "0 6px 20px rgba(102, 126, 234, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                📋 Buka Halaman Deliveries
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "500px",
                overflowY: "auto",
              }}
            >
              {uncompletedDeliveries.map((delivery) => {
                const statusInfo = getStatusInfo(delivery.status);
                return (
                  <div
                    key={delivery.id}
                    style={{
                      padding: "12px 16px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {/* Informasi Customer - Rata Kiri */}
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          {delivery.customers?.name || "Unknown Customer"}
                        </div>
                        <div
                          style={{
                            padding: "2px 6px",
                            background: statusInfo.color,
                            color: statusInfo.textColor,
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "600",
                          }}
                        >
                          {statusInfo.label}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                          }}
                        >
                          📅 {formatDeliveryDate(delivery.delivery_date)}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          marginBottom: "2px",
                        }}
                      >
                        🚗 {delivery.couriers?.name || "Belum ada kurir"}
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          lineHeight: "1.3",
                        }}
                      >
                        📍 {delivery.customers?.address || "No address"}
                      </div>
                    </div>

                    {/* Tombol Aksi - Sebelah Kanan */}
                    <div>
                      <button
                        onClick={handleGoToDeliveries}
                        style={{
                          padding: "8px 16px",
                          background:
                            delivery.status === "pending"
                              ? "#3b82f6"
                              : "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          minWidth: "70px",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background =
                            delivery.status === "pending"
                              ? "#2563eb"
                              : "#059669";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background =
                            delivery.status === "pending"
                              ? "#3b82f6"
                              : "#10b981";
                        }}
                      >
                        {delivery.status === "pending" ? "Kirim" : "Selesai"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, description }) => (
  <div
    style={{
      background: "white",
      padding: "20px 16px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0",
      textAlign: "center",
      transition: "all 0.3s ease",
      cursor: "pointer",
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.15)";
      e.currentTarget.style.borderColor = color;
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "#e2e8f0";
    }}
  >
    <div style={{ fontSize: "24px", marginBottom: "8px", color: color }}>
      {icon}
    </div>
    <div
      style={{
        fontSize: "24px",
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: "4px",
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
      {title}
    </div>
    {description && (
      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
        {description}
      </div>
    )}
  </div>
);

export default DBCourier;
