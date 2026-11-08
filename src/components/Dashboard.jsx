import React, { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "../lib/supabase";

const Customers = lazy(() => import("./Customers"));
const Couriers = lazy(() => import("./Couriers"));
const Deliveries = lazy(() => import("./Deliveries"));
const Laporan = lazy(() => import("./Laporan"));

const SkeletonCard = () => (
  <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }}></div>
    <div style={{ width: "60%", height: "24px", borderRadius: "6px", background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }}></div>
    <div style={{ width: "40%", height: "14px", borderRadius: "4px", background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }}></div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalCouriers: 0,
    totalDeliveries: 0,
    pendingDeliveries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState("dashboard");
  
  const [chartData, setChartData] = useState([]);
  const [topCouriers, setTopCouriers] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    try {
      const [customersRes, couriersRes, deliveriesRes, pendingRes] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("couriers").select("*", { count: "exact", head: true }),
        supabase.from("deliveries").select("*", { count: "exact", head: true }),
        supabase.from("deliveries").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setStats({
        totalCustomers: customersRes.count || 0,
        totalCouriers: couriersRes.count || 0,
        totalDeliveries: deliveriesRes.count || 0,
        pendingDeliveries: pendingRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data khusus 30 hari terakhir
  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 29);
      const startStr = startDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          id,
          delivery_date,
          courier_id,
          customers (delivery_fee),
          couriers (name)
        `)
        .eq("status", "completed")
        .gte("delivery_date", startStr)
        .order("delivery_date", { ascending: true });

      if (error) throw error;

      // Siapkan kerangka 30 hari terakhir
      const grouped = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split("T")[0];
        grouped[key] = { 
          date: key,
          label: `${d.getDate()}/${d.getMonth() + 1}`, 
          omzet: 0, 
          orders: 0 
        };
      }

      // Masukkan data dari database ke kerangka
      data?.forEach((item) => {
        const dateKey = item.delivery_date.split("T")[0]; 
        if (grouped[dateKey]) {
          grouped[dateKey].orders += 1;
          grouped[dateKey].omzet += item.customers?.delivery_fee || 0;
        }
      });

      const chartArray = Object.values(grouped);
      setChartData(chartArray);

      // Hitung Top 3 Kurir
      const totalCourierCount = {};
      data?.forEach((item) => {
        if (item.couriers?.name) {
          totalCourierCount[item.couriers.name] = (totalCourierCount[item.couriers.name] || 0) + 1;
        }
      });
      const sortedCouriers = Object.entries(totalCourierCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      setTopCouriers(sortedCouriers);

    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (currentView === "dashboard") {
      fetchChartData();
    }
  }, [currentView]);

  const renderContent = () => {
    return (
      <Suspense fallback={
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
          <div style={{ textAlign: "center", color: "#64748b" }}>
            <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
            Memuat halaman...
          </div>
        </div>
      }>
        {(() => {
          switch (currentView) {
            case "customers": return <Customers />;
            case "couriers": return <Couriers />;
            case "deliveries": return <Deliveries />;
            case "laporan": return <Laporan />;
            default: return renderDashboard();
          }
        })()}
      </Suspense>
    );
  };

  const renderDashboard = () => {
    const greeting = () => {
      const hour = currentTime.getHours();
      if (hour < 12) return "Selamat Pagi";
      if (hour < 15) return "Selamat Siang";
      if (hour < 18) return "Selamat Sore";
      return "Selamat Malam";
    };
    const formattedTime = currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const formattedDate = currentTime.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const totalOmzet = chartData.reduce((sum, d) => sum + d.omzet, 0);
    const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
    const avgPerDay = (totalOmzet / 30).toFixed(0);

    const maxOrders = Math.max(...chartData.map(d => d.orders), 1);
    const maxOmzet = Math.max(...chartData.map(d => d.omzet), 1);

    return (
      <>
        {/* HERO */}
        <div className="dashboard-hero" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)", borderRadius: "24px", padding: "32px 28px", marginBottom: "24px", color: "white", position: "relative", overflow: "hidden", boxShadow: "0 20px 40px -10px rgba(99, 102, 241, 0.4)" }}>
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }}></div>
          <div style={{ position: "absolute", bottom: "-80px", left: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }}></div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", opacity: 0.9, fontWeight: "500" }}>{formattedDate}</p>
                <h1 className="hero-title" style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>{greeting()}, Admin! 👋</h1>
                <p style={{ margin: 0, fontSize: "15px", opacity: 0.9 }}>Selamat datang di Ojek-O Management System</p>
              </div>
              <div className="hero-clock" style={{ textAlign: "right", background: "rgba(255,255,255,0.15)", padding: "12px 20px", borderRadius: "16px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <p style={{ margin: 0, fontSize: "12px", opacity: 0.8, fontWeight: "500" }}>Waktu Sekarang</p>
                <p style={{ margin: "4px 0 0 0", fontSize: "24px", fontWeight: "700", fontVariantNumeric: "tabular-nums", letterSpacing: "1px" }}>{formattedTime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          {loading || chartLoading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              <StatCard title="Total Omzet (30 Hari)" value={`Rp ${totalOmzet.toLocaleString()}`} icon="💰" color="#10b981" bg="#ecfdf5" />
              <StatCard title="Total Pengantaran Selesai" value={totalOrders.toLocaleString()} icon="✅" color="#6366f1" bg="#eef2ff" />
              <StatCard title="Rata-rata per Hari" value={`Rp ${Number(avgPerDay).toLocaleString()}`} icon="📊" color="#8b5cf6" bg="#f5f3ff" />
              <StatCard title="Pending Saat Ini" value={stats.pendingDeliveries.toLocaleString()} icon="⏳" color="#f59e0b" bg="#fffbeb" />
            </>
          )}
        </div>

        {/* 1. TOP 3 KURIR */}
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>🏆 Top 3 Kurir Teraktif</h3>
          {chartLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: "40px", background: "#f1f5f9", borderRadius: "8px", animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : topCouriers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>Belum ada data pengantaran selesai</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topCouriers.map((c, i) => {
                const maxCount = topCouriers[0].count;
                const percentage = (c.count / maxCount) * 100;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "20px", width: "28px" }}>{medals[i]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{c.name}</span>
                        <span style={{ fontSize: "13px", color: "#64748b" }}>{c.count} order</span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${percentage}%`, height: "100%", background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#d97706", borderRadius: "4px", transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. GRAFIK OMZET */}
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>💰 Grafik Omzet (30 Hari)</h3>
          
          {chartLoading ? (
            <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "2px", padding: "0 8px" }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: `${Math.random() * 60 + 40}%`, background: "#f1f5f9", borderRadius: "4px 4px 0 0", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ position: "relative", height: "200px", padding: "0 8px" }}>
              <div style={{ position: "absolute", top: 0, left: 8, right: 8, bottom: 30, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "2px" }}>
                {chartData.map((d, i) => {
                  const height = (d.omzet / maxOmzet) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center", height: "100%", alignItems: "flex-end", position: "relative" }}>
                      <div className="chart-bar" style={{ width: "100%", maxWidth: "16px", height: `${height}%`, background: "linear-gradient(180deg, #34d399 0%, #10b981 100%)", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" }}>
                        <div className="chart-tooltip" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", whiteSpace: "nowrap", opacity: 0, pointerEvents: "none", transition: "opacity 0.2s", zIndex: 10, marginBottom: "4px" }}>
                          Rp {d.omzet.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 8, right: 8, display: "flex", justifyContent: "space-between", gap: "2px", height: "24px", alignItems: "flex-start" }}>
                {chartData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: "8px", color: "#94a3b8", whiteSpace: "nowrap", transform: "rotate(-45deg)", transformOrigin: "top center", marginTop: "4px" }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. GRAFIK PENGANTARAN */}
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>📦 Grafik Pengantaran (30 Hari)</h3>
          
          {chartLoading ? (
            <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "2px", padding: "0 8px" }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: `${Math.random() * 60 + 40}%`, background: "#f1f5f9", borderRadius: "4px 4px 0 0", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ position: "relative", height: "200px", padding: "0 8px" }}>
              <div style={{ position: "absolute", top: 0, left: 8, right: 8, bottom: 30, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "2px" }}>
                {chartData.map((d, i) => {
                  const height = (d.orders / maxOrders) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center", height: "100%", alignItems: "flex-end", position: "relative" }}>
                      <div className="chart-bar" style={{ width: "100%", maxWidth: "16px", height: `${height}%`, background: "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" }}>
                        <div className="chart-tooltip" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", whiteSpace: "nowrap", opacity: 0, pointerEvents: "none", transition: "opacity 0.2s", zIndex: 10, marginBottom: "4px" }}>
                          {d.orders} Order
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 8, right: 8, display: "flex", justifyContent: "space-between", gap: "2px", height: "24px", alignItems: "flex-start" }}>
                {chartData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: "8px", color: "#94a3b8", whiteSpace: "nowrap", transform: "rotate(-45deg)", transformOrigin: "top center", marginTop: "4px" }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. TABEL RINCIAN DATA */}
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>📋 Rincian Data Harian</h3>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Tanggal</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Jml Pengantaran</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Omzet</th>
                </tr>
              </thead>
              <tbody>
                {chartLoading ? (
                   <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Memuat data...</td></tr>
                ) : chartData.length === 0 ? (
                   <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Belum ada data</td></tr>
                ) : (
                  // Balik urutan tabel agar hari terbaru di atas
                  [...chartData].reverse().map((d, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151", fontWeight: "500" }}>{d.date}</td>
                      <td style={{ padding: "12px 16px", fontSize: "14px", color: "#1e293b", fontWeight: "600", textAlign: "center" }}>
                        {d.orders > 0 ? d.orders : "-"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px", color: d.omzet > 0 ? "#059669" : "#94a3b8", fontWeight: "600", textAlign: "right" }}>
                        {d.omzet > 0 ? `Rp ${d.omzet.toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {currentView !== "dashboard" && (
        <div style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", marginBottom: "24px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(10px)", backgroundColor: "rgba(255,255,255,0.9)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={() => setCurrentView("dashboard")} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>← Kembali</button>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>
              {currentView === "customers" && "👥 Management Pelanggan"}
              {currentView === "couriers" && "🚗 Management Kurir"}
              {currentView === "deliveries" && "📦 Management Pengiriman"}
              {currentView === "laporan" && "📊 Laporan"}
            </h2>
          </div>
        </div>
      )}
      <div style={{ padding: currentView === "dashboard" ? "24px 20px" : "0 20px 24px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        {renderContent()}
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .chart-tooltip { opacity: 0; }
        .chart-bar:hover > .chart-tooltip { opacity: 1; }
        
        @media (max-width: 640px) {
          .dashboard-hero { padding: 20px 16px !important; border-radius: 16px !important; }
          .hero-title { font-size: 22px !important; }
          .hero-clock { width: 100% !important; text-align: left !important; margin-top: 12px !important; padding: 10px 16px !important; }
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, bg }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", transition: "all 0.3s ease", transform: hovered ? "translateY(-4px)" : "translateY(0)", boxShadow: hovered ? "0 12px 24px -8px rgba(0,0,0,0.1)" : "0 1px 2px rgba(0,0,0,0.02)", cursor: "default" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>{icon}</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#1e293b", lineHeight: 1.2, letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "500", marginTop: "4px" }}>{title}</div>
      </div>
    </div>
  );
};

export default Dashboard;