import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const Laporan = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [periodType, setPeriodType] = useState("harian");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState(null);

  // STATE PAGINATION & SEARCH
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isAdmin = currentUser?.role === "admin";

  // Set default dates
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    setSelectedDate(today);
    setSelectedMonth(currentMonth);
    setStartDate(today);
    setEndDate(today);
  }, []);

  const getLastDayOfMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      let start = startDate;
      let end = endDate;
      let periodLabel = "";

      switch (periodType) {
        case "harian":
          start = selectedDate;
          end = selectedDate;
          periodLabel = new Date(selectedDate).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          break;
        case "bulanan":
          const [year, month] = selectedMonth.split("-").map(Number);
          const lastDay = getLastDayOfMonth(year, month);
          start = `${selectedMonth}-01`;
          end = `${selectedMonth}-${lastDay.toString().padStart(2, "0")}`;
          periodLabel = new Date(year, month - 1, 1).toLocaleDateString("id-ID", { year: "numeric", month: "long" });

          const today = new Date();
          const currentYear = today.getFullYear();
          const currentMonth = today.getMonth() + 1;
          if (year === currentYear && month === currentMonth) {
            const todayDate = today.getDate();
            if (todayDate < lastDay) {
              end = `${selectedMonth}-${todayDate.toString().padStart(2, "0")}`;
              periodLabel += " (Bulan Berjalan - sampai hari ini)";
            }
          }
          break;
        case "custom":
          periodLabel = `${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(endDate).toLocaleDateString("id-ID")}`;
          break;
      }

      let deliveriesQuery = supabase.from("deliveries").select(`
          id, order_number, delivery_date, status, courier_id,
          customers (name, address, delivery_fee),
          couriers (id, name)
        `).gte("delivery_date", start).lte("delivery_date", end).order("delivery_date", { ascending: false });

      if (!isAdmin && currentUser?.courier_id) {
        deliveriesQuery = deliveriesQuery.eq("courier_id", currentUser.courier_id);
      }

      // 🚀 Jalankan query secara paralel
      const [deliveriesRes, couriersRes] = await Promise.all([
        deliveriesQuery,
        isAdmin ? supabase.from("couriers").select("id, name") : Promise.resolve({ data: [], error: null })
      ]);

      if (deliveriesRes.error) throw deliveriesRes.error;
      if (couriersRes.error) throw couriersRes.error;

      const deliveries = deliveriesRes.data;
      const allCouriers = couriersRes.data || [];

      const totalDeliveries = deliveries?.length || 0;
      const completedDeliveries = deliveries?.filter((d) => d.status === "completed").length || 0;
      let totalRevenue = 0;
      let averagePerDay = "0";
      let topCourier = ["Tidak ada data", 0];

      if (isAdmin) {
        totalRevenue = deliveries?.filter((d) => d.status === "completed").reduce((sum, d) => sum + (d.customers?.delivery_fee || 0), 0) || 0;
        const daysDiff = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1);
        averagePerDay = (totalDeliveries / daysDiff).toFixed(1);
        const courierStats = {};
        deliveries?.forEach((delivery) => {
          if (delivery.couriers?.name) {
            courierStats[delivery.couriers.name] = (courierStats[delivery.couriers.name] || 0) + 1;
          }
        });
        topCourier = Object.entries(courierStats).sort(([, a], [, b]) => b - a)[0] || ["Tidak ada data", 0];
      } else {
        totalRevenue = deliveries?.filter((d) => d.status === "completed" && d.courier_id === currentUser.courier_id).reduce((sum, d) => sum + (d.customers?.delivery_fee || 0), 0) || 0;
      }

      let performanceData = [];
      if (isAdmin) {
        performanceData = allCouriers?.map((courier) => {
          const courierDeliveries = deliveries?.filter((delivery) => delivery.courier_id === courier.id) || [];
          const revenue = courierDeliveries.filter((d) => d.status === "completed").reduce((sum, d) => sum + (d.customers?.delivery_fee || 0), 0);
          return { name: courier.name, totalDeliveries: courierDeliveries.length, totalRevenue: revenue };
        }).sort((a, b) => b.totalDeliveries - a.totalDeliveries);
      }

      setReportData({
        summary: { totalDeliveries, completedDeliveries, totalRevenue, averagePerDay, topCourier: `${topCourier[0]} (${topCourier[1]})` },
        deliveries: deliveries || [],
        courierPerformance: performanceData || [],
        period: { start, end, label: periodLabel },
      });
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching report data:", error);
      alert("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const shouldFetch = (periodType === "harian" && selectedDate) || (periodType === "bulanan" && selectedMonth) || (periodType === "custom" && startDate && endDate);
    if (shouldFetch) fetchReportData();
  }, [periodType, selectedDate, selectedMonth, startDate, endDate]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (periodType === "harian" && !selectedDate) setSelectedDate(today);
    else if (periodType === "bulanan" && !selectedMonth) setSelectedMonth(currentMonth);
    else if (periodType === "custom" && (!startDate || !endDate)) { setStartDate(today); setEndDate(today); }
  }, [periodType]);

  const handleApplyFilter = () => fetchReportData();

  const getFilteredDeliveries = () => {
    if (!reportData?.deliveries) return [];
    let filtered = reportData.deliveries;
    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((d) => {
        const customerName = d.customers?.name?.toLowerCase() || "";
        const customerAddress = d.customers?.address?.toLowerCase() || "";
        const courierName = d.couriers?.name?.toLowerCase() || "";
        return customerName.includes(lowerSearch) || customerAddress.includes(lowerSearch) || courierName.includes(lowerSearch);
      });
    }
    return filtered;
  };

  const getPaginatedDeliveries = () => {
    const filtered = getFilteredDeliveries();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const filteredTotal = getFilteredDeliveries().length;
  const totalPages = reportData ? Math.ceil(filteredTotal / itemsPerPage) : 0;
  const handlePageChange = (newPage) => setCurrentPage(newPage);

  const exportToExcel = () => {
    setExporting(true);
    try {
      Promise.all([import("xlsx-js-style"), import("file-saver")]).then(([XLSX, { saveAs }]) => {
        const workbook = XLSX.utils.book_new();
        const excelData = [];
        excelData.push(["LAPORAN KINERJA OJEK-O"]);
        excelData.push([`Periode: ${reportData.period.label}`]);
        if (isAdmin) excelData.push(["Role: Admin"]);
        else excelData.push([`Kurir: ${currentUser?.username || currentUser?.name || '-'}`]);
        excelData.push([""]);

        excelData.push(["1. SUMMARY"]);
        excelData.push(["Matrix", "", "Hasil"]);
        excelData.push(["Total Order", "", reportData.summary.totalDeliveries]);
        excelData.push(["Total Revenue", "", `Rp ${reportData.summary.totalRevenue.toLocaleString()}`]);
        
        if (isAdmin) {
          excelData.push(["Rata-rata per Hari", "", reportData.summary.averagePerDay]);
          excelData.push(["Kurir Teraktif", "", reportData.summary.topCourier]);
        }
        excelData.push([""]);
        excelData.push([""]);

        if (isAdmin && reportData.courierPerformance.length > 0) {
          excelData.push(["2. KINERJA KURIR"]);
          excelData.push(["No", "Nama Kurir", "Total Order", "Pendapatan"]);
          reportData.courierPerformance.forEach((courier, index) => {
            excelData.push([index + 1, courier.name, courier.totalDeliveries, `Rp ${courier.totalRevenue.toLocaleString()}`]);
          });
          excelData.push([""]);
          excelData.push([""]);
        }

        excelData.push(["3. DETAIL PENGIRIMAN"]);
        excelData.push(["No", "Tanggal", "Customer", "Ongkir", "Alamat", "Kurir"]);
        reportData.deliveries.forEach((delivery, index) => {
          excelData.push([index + 1, new Date(delivery.delivery_date).toLocaleDateString("id-ID"), delivery.customers?.name || "-", `Rp ${(delivery.customers?.delivery_fee || 0).toLocaleString()}`, delivery.customers?.address || "-", delivery.couriers?.name || "-"]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const merges = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
          { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } }, { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
          ...(isAdmin ? [{ s: { r: 8, c: 0 }, e: { r: 8, c: 1 } }, { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } }] : []),
        ];
        if (isAdmin && reportData.courierPerformance.length > 0) {
          const courierHeaderRow = isAdmin ? 12 : 10;
          merges.push({ s: { r: courierHeaderRow, c: 0 }, e: { r: courierHeaderRow, c: 3 } });
        }
        const detailHeaderRow = isAdmin ? (16 + reportData.courierPerformance.length) : 10;
        merges.push({ s: { r: detailHeaderRow, c: 0 }, e: { r: detailHeaderRow, c: 5 } });
        worksheet["!merges"] = merges;
        worksheet["!cols"] = [{ wpx: 35 }, { wpx: 110 }, { wpx: 140 }, { wpx: 90 }, { wpx: 150 }, { wpx: 100 }];

        const borderStyle = { top: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } };
        const range = XLSX.utils.decode_range(worksheet["!ref"]);
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
            if (!worksheet[cell_ref]) worksheet[cell_ref] = { v: undefined, t: 's' };
            if (!worksheet[cell_ref].s) worksheet[cell_ref].s = {};
        
            if (R <= 3) { worksheet[cell_ref].s = { font: { bold: true, sz: R === 0 ? 16 : 12 }, alignment: { horizontal: "center", vertical: "center" } }; continue; }
            if (R === 5) { worksheet[cell_ref].s = { font: { bold: true, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "D9D9D9" } }, alignment: { horizontal: "center", vertical: "center" }, border: borderStyle }; continue; }
            const summaryEndRow = isAdmin ? 9 : 7;
            if (R >= 6 && R <= summaryEndRow) { worksheet[cell_ref].s = { font: { color: { rgb: "000000" } }, alignment: { vertical: "center", horizontal: C === 2 ? "left" : "left" }, border: borderStyle }; continue; }
            
            if (isAdmin && reportData.courierPerformance.length > 0) {
              const courierHeaderRow = 13;
              if (R === courierHeaderRow) { worksheet[cell_ref].s = { font: { bold: true, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "D9D9D9" } }, alignment: { horizontal: "center", vertical: "center" }, border: borderStyle }; continue; }
              const courierStartRow = courierHeaderRow + 1;
              const courierEndRow = courierStartRow + reportData.courierPerformance.length - 1;
              if (R >= courierStartRow && R <= courierEndRow) { worksheet[cell_ref].s = { font: { color: { rgb: "000000" } }, alignment: { vertical: "center", horizontal: C === 0 ? "center" : "left" }, border: borderStyle }; continue; }
            }
            
            let detailHeaderRow2;
            if (isAdmin) { const courierHeaderRow = 15; const courierDataCount = reportData.courierPerformance.length; detailHeaderRow2 = courierHeaderRow + courierDataCount + 2; } else { detailHeaderRow2 = 11; }
            if (R === detailHeaderRow2) { worksheet[cell_ref].s = { font: { bold: true, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "D9D9D9" } }, alignment: { horizontal: "center", vertical: "center" }, border: borderStyle }; continue; }
            const detailStartRow = detailHeaderRow2 + 1;
            if (R >= detailStartRow) { worksheet[cell_ref].s = { font: { color: { rgb: "000000" } }, alignment: { vertical: "center", horizontal: C === 0 ? "center" : "left" }, border: borderStyle }; continue; }
          }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        saveAs(blob, `Laporan_${isAdmin ? 'Admin' : 'Kurir'}_${reportData.period.label.replace(/ /g, "_")}.xlsx`);
        setExporting(false);
        setTimeout(() => alert("✅ Excel berhasil diexport!"), 500);
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting data: " + error.message);
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          Memuat data laporan...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <div>
            <h1 style={{ margin: "0 0 2px 0", fontSize: "20px", fontWeight: "800", color: "#1e293b" }}>📊 Laporan Pengiriman {!isAdmin && "(Kurir)"}</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
              {reportData ? `Periode: ${reportData.period.label}` : "Pilih periode laporan"}
              {!isAdmin && ` • Kurir: ${currentUser?.username || currentUser?.name || "-"}`}
            </p>
          </div>
        </div>

        {/* FILTER SECTION */}
        <div style={{ background: "white", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {[{ value: "harian", label: "Harian", icon: "📅" }, { value: "bulanan", label: "Bulanan", icon: "📆" }, { value: "custom", label: "Custom", icon: "🔧" }].map((type) => (
              <label key={type.value} style={{ flex: 1, minWidth: "100px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer", padding: "10px 16px", borderRadius: "10px", border: `1px solid ${periodType === type.value ? "#6366f1" : "#e2e8f0"}`, background: periodType === type.value ? "#eef2ff" : "white", transition: "all 0.2s" }}>
                <input type="radio" value={type.value} checked={periodType === type.value} onChange={(e) => setPeriodType(e.target.value)} style={{ display: "none" }} />
                <span style={{ fontSize: "16px" }}>{type.icon}</span>
                <span style={{ fontWeight: "600", fontSize: "13px", color: periodType === type.value ? "#6366f1" : "#64748b", whiteSpace: "nowrap" }}>{type.label}</span>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
            {periodType === "harian" && (
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "12px", color: "#475569" }}>Pilih Tanggal</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
              </div>
            )}
            {periodType === "bulanan" && (
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "12px", color: "#475569" }}>Pilih Bulan</label>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
                {selectedMonth === new Date().toISOString().slice(0, 7) && <div style={{ fontSize: "11px", color: "#6366f1", marginTop: "4px" }}>📍 Bulan berjalan - update otomatis</div>}
              </div>
            )}
            {periodType === "custom" && (
              <>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "12px", color: "#475569" }}>Dari Tanggal</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "12px", color: "#475569" }}>Sampai Tanggal</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
                </div>
              </>
            )}
            <button onClick={handleApplyFilter} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", height: "38px", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
              Terapkan
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        {reportData && (
          <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "repeat(auto-fit, minmax(150px, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
            <div style={{ background: "white", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📦</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b" }}>{reportData.summary.totalDeliveries}</div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>TOTAL ORDER</div>
              </div>
            </div>
            <div style={{ background: "white", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>💰</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#059669" }}>Rp {reportData.summary.totalRevenue.toLocaleString()}</div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>{isAdmin ? "TOTAL OMZET" : "OMZET SAYA"}</div>
              </div>
            </div>
            {isAdmin && (
              <>
                <div style={{ background: "white", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📅</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b" }}>{reportData.summary.averagePerDay}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>RATA-RATA/HARI</div>
                  </div>
                </div>
                <div style={{ background: "white", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>👑</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", marginTop: "4px" }}>{reportData.summary.topCourier}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>KURIR TERAKTIF</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* DELIVERY DATA TABLE */}
        {reportData && (
          <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "20px", overflow: "hidden" }}>
            
            {/* Table Header & Search */}
            <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>📦 Data Pengiriman {!isAdmin && "Saya"} ({filteredTotal})</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b" }}>
                  <label>Per halaman:</label>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", outline: "none" }}>
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
                <input type="text" placeholder="Cari nama, alamat, atau kurir..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
              </div>
            </div>

            {/* DESKTOP TABLE (Sembunyi di HP) */}
            <div className="desktop-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Tanggal</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Customer</th>
                    {isAdmin && <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Kurir</th>}
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedDeliveries().map((delivery) => (
                    <tr key={delivery.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{new Date(delivery.delivery_date).toLocaleDateString("id-ID")}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#1e293b", fontWeight: "600" }}>{delivery.customers?.name || "-"}</td>
                      {isAdmin && <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>{delivery.couriers?.name || "-"}</td>}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", background: delivery.status === "completed" ? "#d1fae5" : delivery.status === "on_delivery" ? "#dbeafe" : "#fef3c7", color: delivery.status === "completed" ? "#065f46" : delivery.status === "on_delivery" ? "#1e40af" : "#92400e" }}>
                          {delivery.status === "completed" ? "SELESAI" : delivery.status === "on_delivery" ? "ON DELIVERY" : "PENDING"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#059669", fontWeight: "600", textAlign: "right" }}>Rp {(delivery.customers?.delivery_fee || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD LIST (Hanya muncul di HP) */}
            <div className="mobile-card-list" style={{ display: "none", flexDirection: "column" }}>
              {getPaginatedDeliveries().map((delivery) => (
                <div key={delivery.id} style={{ padding: "16px", borderBottom: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>{delivery.customers?.name || "-"}</div>
                    <div style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "700", background: delivery.status === "completed" ? "#d1fae5" : delivery.status === "on_delivery" ? "#dbeafe" : "#fef3c7", color: delivery.status === "completed" ? "#065f46" : delivery.status === "on_delivery" ? "#1e40af" : "#92400e" }}>
                      {delivery.status === "completed" ? "SELESAI" : delivery.status === "on_delivery" ? "ON DELIVERY" : "PENDING"}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
                    <span>📅 {new Date(delivery.delivery_date).toLocaleDateString("id-ID")}</span>
                    <span style={{ color: "#059669", fontWeight: "700" }}>Rp {(delivery.customers?.delivery_fee || 0).toLocaleString()}</span>
                  </div>
                  {isAdmin && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>🚗 Kurir: {delivery.couriers?.name || "-"}</div>}
                </div>
              ))}
            </div>

            {filteredTotal === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>📊</div>
                <p style={{ margin: 0, fontSize: "14px" }}>Tidak ada data pengiriman</p>
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div style={{ padding: "16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTotal)} - {Math.min(currentPage * itemsPerPage, filteredTotal)} dari {filteredTotal}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} style={{ padding: "6px 12px", background: currentPage === 1 ? "#f1f5f9" : "white", color: currentPage === 1 ? "#cbd5e1" : "#475569", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>‹</button>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: "6px 12px", background: currentPage === totalPages ? "#f1f5f9" : "white", color: currentPage === totalPages ? "#cbd5e1" : "#475569", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>›</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXPORT BUTTON */}
        {reportData && reportData.deliveries.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <button onClick={exportToExcel} disabled={exporting} style={{ padding: "14px 24px", background: exporting ? "#94a3b8" : "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: exporting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: exporting ? "none" : "0 8px 20px -4px rgba(16,185,129,0.4)", opacity: exporting ? 0.7 : 1 }}>
              {exporting ? <>⏳ Exporting...</> : <>📥 Export ke Excel</>}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        /* 📱 RESPONSIVE */
        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-card-list { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default Laporan;