import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Customers from "./Customers";
import Couriers from "./Couriers";
import Deliveries from "./Deliveries";
import Laporan from "./Laporan";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalCouriers: 0,
    totalDeliveries: 0,
    pendingDeliveries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { count: totalCustomers } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      const { count: totalCouriers } = await supabase
        .from("couriers")
        .select("*", { count: "exact", head: true });

      const { count: totalDeliveries } = await supabase
        .from("deliveries")
        .select("*", { count: "exact", head: true });

      const { count: pendingDeliveries } = await supabase
        .from("deliveries")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setStats({
        totalCustomers: totalCustomers || 0,
        totalCouriers: totalCouriers || 0,
        totalDeliveries: totalDeliveries || 0,
        pendingDeliveries: pendingDeliveries || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNGSI SEDERHANA: Switch component berdasarkan state
  const [currentView, setCurrentView] = useState("dashboard");

  // Render different components based on currentView
  const renderContent = () => {
    switch (currentView) {
      case "customers":
        return <Customers />;
      case "couriers":
        return <Couriers />;
      case "deliveries":
        return <Deliveries />;
      case "laporan":
        return <Laporan />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <>
      {/* Welcome Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "24px 20px",
          borderRadius: "16px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "600" }}
        >
          Selamat Datang! 👋
        </h2>
        <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>
          Kelola pengiriman ojek dengan mudah
        </p>
      </div>

      {/* Statistics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <StatCard
          title="Pelanggan"
          value={stats.totalCustomers}
          icon="👥"
          color="#667eea"
        />

        <StatCard
          title="Kurir"
          value={stats.totalCouriers}
          icon="🚗"
          color="#48bb78"
        />

        <StatCard
          title="Pengiriman"
          value={stats.totalDeliveries}
          icon="📦"
          color="#ed8936"
        />

        <StatCard
          title="Pending"
          value={stats.pendingDeliveries}
          icon="⏳"
          color="#f56565"
        />
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: "white",
          padding: "24px 20px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            color: "#1e293b",
            fontSize: "18px",
            fontWeight: "600",
          }}
        >
          Menu Cepat
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
          }}
        >
          <ActionCard
            title="👥 Pelanggan"
            description="Kelola data pelanggan"
            onClick={() => setCurrentView("customers")}
          />

          <ActionCard
            title="🚗 Kurir"
            description="Kelola data kurir"
            onClick={() => setCurrentView("couriers")}
          />

          <ActionCard
            title="📦 Pengiriman"
            description="Lihat pengiriman"
            onClick={() => setCurrentView("deliveries")}
          />

          <ActionCard
            title="📊 Laporan"
            description="Lihat laporan"
            onClick={() => setCurrentView("laporan")}
          />
        </div>
      </div>
    </>
  );

  if (loading && currentView === "dashboard") {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #e2e8f0",
              borderTop: "3px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          ></div>
          Memuat dashboard...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        paddingTop: "0",
      }}
    >
      {/* Navigation Header */}
      {currentView !== "dashboard" && (
        <div
          style={{
            background: "white",
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setCurrentView("dashboard")}
              style={{
                background: "#667eea",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ← Back to Dashboard
            </button>
            <h2 style={{ margin: 0, color: "#1e293b" }}>
              {currentView === "customers" && "👥 Management Pelanggan"}
              {currentView === "couriers" && "🚗 Management Kurir"}
              {currentView === "deliveries" && "📦 Management Pengiriman"}
              {currentView === "laporan" && "📊 Laporan"}
            </h2>
          </div>
        </div>
      )}

      <div
        style={{
          padding: currentView === "dashboard" ? "24px 20px" : "0 20px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {renderContent()}
      </div>

      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
};

// Stat Card Component - TANPA ONCLICK
const StatCard = ({ title, value, icon, color }) => (
  <div
    style={{
      background: "white",
      padding: "20px 16px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0",
      textAlign: "center",
      transition: "all 0.3s ease",
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
  </div>
);

// Action Card Component
const ActionCard = ({ title, description, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: "white",
      padding: "20px 16px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0",
      cursor: "pointer",
      transition: "all 0.3s ease",
      textAlign: "center",
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 12px 25px rgba(102, 126, 234, 0.15)";
      e.currentTarget.style.borderColor = "#667eea";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "#e2e8f0";
    }}
  >
    <div style={{ fontSize: "20px", marginBottom: "8px" }}>
      {title.split(" ")[0]}
    </div>
    <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.4" }}>
      {description}
    </div>
  </div>
);

export default Dashboard;
