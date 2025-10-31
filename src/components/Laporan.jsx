import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Laporan = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [periodType, setPeriodType] = useState("harian");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState(null);

  // STATE PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // 🔥 FUNGSI BARU: Hitung tanggal akhir bulan dengan benar
  const getLastDayOfMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  // Fetch report data
  const fetchReportData = async () => {
    try {
      setLoading(true);

      let start = startDate;
      let end = endDate;
      let periodLabel = "";

      // Adjust dates based on period type
      switch (periodType) {
        case "harian":
          start = selectedDate;
          end = selectedDate;
          periodLabel = new Date(selectedDate).toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          break;

        case "bulanan":
          // 🔥 PERBAIKAN: Hitung tanggal akhir bulan dengan benar
          const [year, month] = selectedMonth.split("-").map(Number);
          const lastDay = getLastDayOfMonth(year, month);

          start = `${selectedMonth}-01`;
          end = `${selectedMonth}-${lastDay.toString().padStart(2, "0")}`;

          periodLabel = new Date(year, month - 1, 1).toLocaleDateString(
            "id-ID",
            {
              year: "numeric",
              month: "long",
            }
          );

          // Jika bulan adalah bulan berjalan, batasi sampai hari ini
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
          periodLabel = `${new Date(startDate).toLocaleDateString(
            "id-ID"
          )} - ${new Date(endDate).toLocaleDateString("id-ID")}`;
          break;
      }

      console.log("Fetching data for:", {
        periodType,
        start,
        end,
        periodLabel,
        isAdmin,
        courierId: currentUser?.courier_id,
      });

      // Base query untuk deliveries
      let deliveriesQuery = supabase
        .from("deliveries")
        .select(
          `
          id,
          order_number,
          delivery_date,
          status,
          courier_id,
          customers (
            name,
            address,
            delivery_fee
          ),
          couriers (
            id,
            name
          )
        `
        )
        .gte("delivery_date", start)
        .lte("delivery_date", end)
        .order("delivery_date", { ascending: false });

      // FILTER BERBEDA UNTUK ADMIN VS KURIR
      if (!isAdmin && currentUser?.courier_id) {
        deliveriesQuery = deliveriesQuery.eq(
          "courier_id",
          currentUser.courier_id
        );
      }

      const { data: deliveries, error: deliveriesError } =
        await deliveriesQuery;

      if (deliveriesError) {
        console.error("Deliveries error:", deliveriesError);
        throw deliveriesError;
      }

      console.log("Deliveries found:", deliveries?.length);

      // Fetch couriers untuk performance (hanya admin)
      let allCouriers = [];
      if (isAdmin) {
        const { data: couriersData, error: couriersError } = await supabase
          .from("couriers")
          .select("id, name");

        if (couriersError) throw couriersError;
        allCouriers = couriersData || [];
      }

      // Calculate summary
      const totalDeliveries = deliveries?.length || 0;
      const completedDeliveries =
        deliveries?.filter((d) => d.status === "completed").length || 0;

      let totalRevenue = 0;
      let averagePerDay = "0";
      let topCourier = ["Tidak ada data", 0];

      if (isAdmin) {
        totalRevenue =
          deliveries
            ?.filter((d) => d.status === "completed")
            .reduce((sum, d) => sum + (d.customers?.delivery_fee || 0), 0) || 0;

        const daysDiff = Math.max(
          1,
          Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) +
            1
        );
        averagePerDay = (totalDeliveries / daysDiff).toFixed(1);

        // Calculate top courier hanya untuk admin
        const courierStats = {};
        deliveries?.forEach((delivery) => {
          if (delivery.couriers?.name) {
            const courierName = delivery.couriers.name;
            courierStats[courierName] = (courierStats[courierName] || 0) + 1;
          }
        });

        topCourier = Object.entries(courierStats).sort(
          ([, a], [, b]) => b - a
        )[0] || ["Tidak ada data", 0];
      } else {
        totalRevenue =
          deliveries
            ?.filter(
              (d) =>
                d.status === "completed" &&
                d.courier_id === currentUser.courier_id
            )
            .reduce((sum, d) => sum + (d.customers?.delivery_fee || 0), 0) || 0;
      }

      // Calculate courier performance (hanya untuk admin)
      let performanceData = [];
      if (isAdmin) {
        performanceData = allCouriers
          ?.map((courier) => {
            const courierDeliveries =
              deliveries?.filter((delivery) => {
                return delivery.courier_id === courier.id;
              }) || [];

            const revenue = courierDeliveries
              .filter((d) => d.status === "completed")
              .reduce((sum, d) => sum + (d.customers?.delivery_fee || 0), 0);

            return {
              name: courier.name,
              totalDeliveries: courierDeliveries.length,
              totalRevenue: revenue,
            };
          })
          .sort((a, b) => b.totalDeliveries - a.totalDeliveries);
      }

      setReportData({
        summary: {
          totalDeliveries,
          completedDeliveries,
          totalRevenue,
          averagePerDay,
          topCourier: `${topCourier[0]} (${topCourier[1]})`,
        },
        deliveries: deliveries || [],
        courierPerformance: performanceData || [],
        period: {
          start,
          end,
          label: periodLabel,
        },
      });

      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching report data:", error);
      alert("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch ketika period type berubah
  useEffect(() => {
    const shouldFetch =
      (periodType === "harian" && selectedDate) ||
      (periodType === "bulanan" && selectedMonth) ||
      (periodType === "custom" && startDate && endDate);

    if (shouldFetch) {
      fetchReportData();
    }
  }, [periodType, selectedDate, selectedMonth, startDate, endDate]);

  // Reset filter ketika period type berubah
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    if (periodType === "harian" && !selectedDate) {
      setSelectedDate(today);
    } else if (periodType === "bulanan" && !selectedMonth) {
      setSelectedMonth(currentMonth);
    } else if (periodType === "custom" && (!startDate || !endDate)) {
      setStartDate(today);
      setEndDate(today);
    }
  }, [periodType]);

  const handleApplyFilter = () => {
    fetchReportData();
  };

  // FUNGSI PAGINATION
  const getPaginatedDeliveries = () => {
    if (!reportData?.deliveries) return [];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return reportData.deliveries.slice(startIndex, endIndex);
  };

  const totalPages = reportData
    ? Math.ceil(reportData.deliveries.length / itemsPerPage)
    : 0;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      Promise.all([import("xlsx-js-style"), import("file-saver")]).then(
        ([XLSX, { saveAs }]) => {
          const workbook = XLSX.utils.book_new();
          const excelData = [];
  
          // HEADER UTAMA
          excelData.push(["LAPORAN KINERJA OJEK-O"]);
          excelData.push([`Periode: ${reportData.period.label}`]);
          
          if (isAdmin) {
            excelData.push(["Role: Admin"]);
          } else {
            excelData.push([`Kurir: ${currentUser?.username || currentUser?.name || '-'}`]);
          }
          
          // Baris kosong pemisah
          excelData.push([""]);
  
          // 1. SUMMARY
          excelData.push(["1. SUMMARY"]);
          excelData.push(["Matrix", "", "Hasil"]);
          excelData.push([
            "Total Order",
            "",
            reportData.summary.totalDeliveries,
          ]);
          excelData.push([
            "Total Revenue",
            "",
            `Rp ${reportData.summary.totalRevenue.toLocaleString()}`,
          ]);
          
          // HANYA TAMPILKAN UNTUK ADMIN
          if (isAdmin) {
            excelData.push([
              "Rata-rata per Hari",
              "",
              reportData.summary.averagePerDay,
            ]);
            excelData.push(["Kurir Teraktif", "", reportData.summary.topCourier]);
          }
          
          excelData.push([""]);
          excelData.push([""]);
  
          // 2. KINERJA KURIR (HANYA UNTUK ADMIN)
          if (isAdmin && reportData.courierPerformance.length > 0) {
            excelData.push(["2. KINERJA KURIR"]);
            excelData.push(["No", "Nama Kurir", "Total Order", "Pendapatan"]);
  
            reportData.courierPerformance.forEach((courier, index) => {
              excelData.push([
                index + 1,
                courier.name,
                courier.totalDeliveries,
                `Rp ${courier.totalRevenue.toLocaleString()}`,
              ]);
            });
  
            excelData.push([""]);
            excelData.push([""]);
          }
  
          // 3. DETAIL PENGIRIMAN
          excelData.push(["3. DETAIL PENGIRIMAN"]);
          excelData.push([
            "No",
            "Tanggal",
            "Customer",
            "Ongkir",
            "Alamat",
            "Kurir",
          ]);
  
          reportData.deliveries.forEach((delivery, index) => {
            excelData.push([
              index + 1,
              new Date(delivery.delivery_date).toLocaleDateString("id-ID"),
              delivery.customers?.name || "-",
              `Rp ${(delivery.customers?.delivery_fee || 0).toLocaleString()}`,
              delivery.customers?.address || "-",
              delivery.couriers?.name || "-",
            ]);
          });
  
          // Worksheet
          const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  
          // 🔥 PERBAIKAN: Merge cells yang benar
          const merges = [
            // Header utama
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
            { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
            
            // 🔥 PERBAIKAN: Merge "Matrix" (A6+B6)
            { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
            
            // Summary items
            { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
            { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
            ...(isAdmin ? [
              { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },
              { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },
            ] : []),
          ];
  
          // Tambahkan merge untuk kinerja kurir jika admin
          if (isAdmin && reportData.courierPerformance.length > 0) {
            const courierHeaderRow = isAdmin ? 12 : 10;
            merges.push({ s: { r: courierHeaderRow, c: 0 }, e: { r: courierHeaderRow, c: 3 } });
          }
  
          // Tambahkan merge untuk detail pengiriman
          const detailHeaderRow = isAdmin 
            ? (16 + reportData.courierPerformance.length)
            : 10;
          merges.push({ s: { r: detailHeaderRow, c: 0 }, e: { r: detailHeaderRow, c: 5 } });
  
          worksheet["!merges"] = merges;
  
          // Lebar kolom
          worksheet["!cols"] = [
            { wpx: 35 },
            { wpx: 110 },
            { wpx: 140 },
            { wpx: 90 },
            { wpx: 150 },
            { wpx: 100 },
          ];
  
          // 🔥 PERBAIKAN: Style yang lebih baik
          const borderStyle = {
            top: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          };
  
          const grayHeader = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "D9D9D9" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: borderStyle,
          };
  
          const cellBase = {
            border: borderStyle,
            alignment: { vertical: "center", horizontal: "left" },
          };
  
          const cellCenter = {
            ...cellBase,
            alignment: { vertical: "center", horizontal: "center" },
          };
  
          // 🔥 TERAPKAN STYLE KE SEMUA CELL YANG PERLU
          // 🔥 PERBAIKAN: Apply style ke setiap cell dengan benar
          const range = XLSX.utils.decode_range(worksheet["!ref"]);
          
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
              
              // Jika cell tidak ada, skip
              if (!worksheet[cell_ref]) {
                // 🔥 BUAT CELL KOSONG DENGAN STYLE JIKA PERLU
                worksheet[cell_ref] = { v: undefined, t: 's' };
              }
          
              // 🔥 INISIALISASI STYLE JIKA BELUM ADA
              if (!worksheet[cell_ref].s) {
                worksheet[cell_ref].s = {};
              }
          
              // 1. HEADER UTAMA (A1, A2, A3, A4)
              if (R <= 3) {
                worksheet[cell_ref].s = {
                  font: { bold: true, sz: R === 0 ? 16 : 12 },
                  alignment: { horizontal: "center", vertical: "center" },
                };
                continue;
              }
          
              // 2. SUMMARY HEADER - "Matrix" & "Hasil" (Row 5)
              if (R === 5) {
                worksheet[cell_ref].s = {
                  font: { bold: true, color: { rgb: "000000" } },
                  fill: { fgColor: { rgb: "D9D9D9" } }, // Abu-abu
                  alignment: { horizontal: "center", vertical: "center" },
                  border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } },
                  }
                };
                continue;
              }
          
              // 3. SUMMARY DATA (Row 6-9 untuk admin, 6-7 untuk kurir)
              const summaryEndRow = isAdmin ? 9 : 7;
              if (R >= 6 && R <= summaryEndRow) {
                worksheet[cell_ref].s = {
                  font: { color: { rgb: "000000" } },
                  alignment: { 
                    vertical: "center", 
                    horizontal: C === 2 ? "left" : "left" 
                  },
                  border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } },
                  }
                };
                continue;
              }
          
              // 4. KINERJA KURIR HEADER (hanya admin)
              if (isAdmin && reportData.courierPerformance.length > 0) {
                const courierHeaderRow = 13; // Sesuaikan dengan posisi sebenarnya
                if (R === courierHeaderRow) {
                  worksheet[cell_ref].s = {
                    font: { bold: true, color: { rgb: "000000" } },
                    fill: { fgColor: { rgb: "D9D9D9" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                      top: { style: "thin", color: { rgb: "000000" } },
                      left: { style: "thin", color: { rgb: "000000" } },
                      bottom: { style: "thin", color: { rgb: "000000" } },
                      right: { style: "thin", color: { rgb: "000000" } },
                    }
                  };
                  continue;
                }
          
                // 5. KINERJA KURIR DATA
                const courierStartRow = courierHeaderRow + 1;
                const courierEndRow = courierStartRow + reportData.courierPerformance.length - 1;
                if (R >= courierStartRow && R <= courierEndRow) {
                  worksheet[cell_ref].s = {
                    font: { color: { rgb: "000000" } },
                    alignment: { 
                      vertical: "center", 
                      horizontal: C === 0 ? "center" : "left" 
                    },
                    border: {
                      top: { style: "thin", color: { rgb: "000000" } },
                      left: { style: "thin", color: { rgb: "000000" } },
                      bottom: { style: "thin", color: { rgb: "000000" } },
                      right: { style: "thin", color: { rgb: "000000" } },
                    }
                  };
                  continue;
                }
              }
          
              // 6. DETAIL PENGIRIMAN HEADER
              let detailHeaderRow;
              
              if (isAdmin) {
                const courierHeaderRow = 15; // posisi header tabel kinerja kurir
                const courierDataCount = reportData.courierPerformance.length;
              
                // Header detail pengiriman muncul 2 baris setelah data kurir terakhir
                detailHeaderRow = courierHeaderRow + courierDataCount + 2;
              } else {
                // Kalau bukan admin (kurir), posisi tetap di baris ke-12 (index 11)
                detailHeaderRow = 11;
              }
              if (R === detailHeaderRow) {
                worksheet[cell_ref].s = {
                  font: { bold: true, color: { rgb: "000000" } },
                  fill: { fgColor: { rgb: "D9D9D9" } },
                  alignment: { horizontal: "center", vertical: "center" },
                  border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } },
                  }
                };
                continue;
              }
          
              // 7. DETAIL PENGIRIMAN DATA
              const detailStartRow = detailHeaderRow + 1;
              if (R >= detailStartRow) {
                worksheet[cell_ref].s = {
                  font: { color: { rgb: "000000" } },
                  alignment: { 
                    vertical: "center", 
                    horizontal: C === 0 ? "center" : "left" 
                  },
                  border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } },
                  }
                };
                continue;
              }
            }
          }
  
          // Simpan file
          XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
          const wbout = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
          });
          const blob = new Blob([wbout], { type: "application/octet-stream" });
          saveAs(
            blob,
            `Laporan_${isAdmin ? 'Admin' : 'Kurir'}_${reportData.period.label.replace(/ /g, "_")}.xlsx`
          );
  
          setExporting(false);
          setTimeout(() => alert("✅ Excel berhasil diexport!"), 500);
        }
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting data: " + error.message);
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8fafc",
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
          Memuat data laporan...
        </div>
      </div>
    );
  }

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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 4px 0",
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e293b",
              }}
            >
              📊 Laporan Pengiriman {!isAdmin && "(Kurir)"}
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              {reportData
                ? `Periode: ${reportData.period.label}`
                : "Pilih periode laporan"}
              {!isAdmin &&
                ` • Kurir: ${
                  currentUser?.username || currentUser?.name || "-"
                }`}
            </p>
          </div>
        </div>

        {/* Filter Section */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
          }}
        >
          {/* Period Type Selection */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "harian", label: "Harian", icon: "📅" },
              { value: "bulanan", label: "Bulanan", icon: "📊" },
              { value: "custom", label: "Custom Range", icon: "🔧" },
            ].map((type) => (
              <label
                key={type.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: `2px solid ${
                    periodType === type.value ? "#667eea" : "#e2e8f0"
                  }`,
                  background: periodType === type.value ? "#f0f4ff" : "white",
                  transition: "all 0.2s",
                  flex: "0 1 auto",
                  minWidth: "120px",
                }}
              >
                <input
                  type="radio"
                  value={type.value}
                  checked={periodType === type.value}
                  onChange={(e) => setPeriodType(e.target.value)}
                  style={{ display: "none" }}
                />
                <span style={{ fontSize: "16px" }}>{type.icon}</span>
                <span
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    color: periodType === type.value ? "#667eea" : "#64748b",
                    whiteSpace: "nowrap",
                  }}
                >
                  {type.label}
                </span>
              </label>
            ))}
          </div>

          {/* Date Pickers based on Period Type */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "flex-end",
            }}
          >
            {/* Harian */}
            {periodType === "harian" && (
              <div
                style={{
                  flex: "1 1 200px",
                  minWidth: "200px",
                  maxWidth: "300px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  📅 Pilih Tanggal
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Bulanan */}
            {periodType === "bulanan" && (
              <div
                style={{
                  flex: "1 1 200px",
                  minWidth: "200px",
                  maxWidth: "300px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  📊 Pilih Bulan
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                {/* INFO: Tampilkan info bulan berjalan */}
                {selectedMonth === new Date().toISOString().slice(0, 7) && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#667eea",
                      marginTop: "4px",
                    }}
                  >
                    📍 Bulan berjalan - data akan update otomatis
                  </div>
                )}
              </div>
            )}

            {/* Custom Range */}
            {periodType === "custom" && (
              <>
                <div
                  style={{
                    flex: "1 1 180px",
                    minWidth: "180px",
                    maxWidth: "220px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div
                  style={{
                    flex: "1 1 180px",
                    minWidth: "180px",
                    maxWidth: "220px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </>
            )}

            {/* Apply Button */}
            <div
              style={{
                flex: "0 0 auto",
                minWidth: "140px",
              }}
            >
              <button
                onClick={handleApplyFilter}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  height: "40px",
                  whiteSpace: "nowrap",
                }}
              >
                Terapkan Filter
              </button>
            </div>
          </div>

          {/* INFO DEBUG: Tampilkan info filter yang aktif */}
          <div
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              background: "#f0f9ff",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#0369a1",
            }}
          >
            <strong>Filter Aktif:</strong> {periodType} |
            {periodType === "harian" && ` Tanggal: ${selectedDate}`}
            {periodType === "bulanan" && ` Bulan: ${selectedMonth}`}
            {periodType === "custom" && ` Range: ${startDate} s/d ${endDate}`}
          </div>
        </div>

        {/* Summary Cards - BERBEDA UNTUK ADMIN VS KURIR */}
        {reportData && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isAdmin
                ? "repeat(auto-fit, minmax(200px, 1fr))"
                : "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Total Pengiriman - TAMPIL UNTUK SEMUA */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📦</div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                TOTAL PENGIRIMAN
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {reportData.summary.totalDeliveries}
              </div>
            </div>

            {/* Pendapatan Total - TAMPIL UNTUK SEMUA */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>💰</div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                {isAdmin ? "PENDAPATAN TOTAL" : "PENDAPATAN SAYA"}
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#059669",
                }}
              >
                Rp {reportData.summary.totalRevenue.toLocaleString()}
              </div>
            </div>

            {/* HANYA TAMPIL UNTUK ADMIN */}
            {isAdmin && (
              <>
                <div
                  style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                    📅
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    RATA-RATA / HARI
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#1e293b",
                    }}
                  >
                    {reportData.summary.averagePerDay}
                  </div>
                </div>

                <div
                  style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                    👑
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    KURIR TERAKTIF
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#1e293b",
                    }}
                  >
                    {reportData.summary.topCourier}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Delivery Data Table - TAMPIL UNTUK SEMUA */}
        {reportData && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                📦 Data Pengiriman {!isAdmin && "Saya"} (
                {reportData.deliveries.length} order)
              </h3>

              {/* PAGINATION CONTROLS - TOP */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  <label>Items per page:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "600px",
                }}
                className="mobile-table"
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Tanggal
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                      className="mobile-hide"
                    >
                      Customer
                    </th>
                    {/* KOLOM KURIR HANYA UNTUK ADMIN */}
                    {isAdmin && (
                      <th
                        style={{
                          padding: "12px 16px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Kurir
                      </th>
                    )}
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Biaya
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedDeliveries().map((delivery, index) => (
                    <tr
                      key={delivery.id}
                      style={{
                        background: index % 2 === 0 ? "white" : "#f8fafc",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                        className="mobile-sm-text"
                      >
                        {new Date(delivery.delivery_date).toLocaleDateString(
                          "id-ID"
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                        className="mobile-hide mobile-sm-text"
                      >
                        {delivery.customers?.name || "-"}
                      </td>
                      {/* KOLOM KURIR HANYA UNTUK ADMIN */}
                      {isAdmin && (
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "#374151",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                          className="mobile-sm-text"
                        >
                          {delivery.couriers?.name || "-"}
                        </td>
                      )}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background:
                              delivery.status === "completed"
                                ? "#d1fae5"
                                : delivery.status === "on_delivery"
                                ? "#dbeafe"
                                : "#fef3c7",
                            color:
                              delivery.status === "completed"
                                ? "#065f46"
                                : delivery.status === "on_delivery"
                                ? "#1e40af"
                                : "#92400e",
                          }}
                        >
                          {delivery.status === "completed"
                            ? "Selesai"
                            : delivery.status === "on_delivery"
                            ? "On Delivery"
                            : "Pending"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#059669",
                          fontWeight: "600",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                        className="mobile-sm-text"
                      >
                        Rp{" "}
                        {(
                          delivery.customers?.delivery_fee || 0
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reportData.deliveries.length === 0 && (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#9ca3af",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>📊</div>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  Tidak ada data pengiriman
                </p>
              </div>
            )}

            {/* PAGINATION - BOTTOM */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: "16px 20px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "14px", color: "#64748b" }}>
                  Menampilkan{" "}
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    reportData.deliveries.length
                  )}
                  -
                  {Math.min(
                    currentPage * itemsPerPage,
                    reportData.deliveries.length
                  )}{" "}
                  dari {reportData.deliveries.length} order
                </div>

                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 12px",
                      background: currentPage === 1 ? "#f1f5f9" : "white",
                      color: currentPage === 1 ? "#94a3b8" : "#374151",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    ◀️ Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => {
                      const showEllipsis =
                        index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span
                              style={{ padding: "0 8px", color: "#94a3b8" }}
                            >
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            style={{
                              padding: "6px 12px",
                              background:
                                currentPage === page ? "#667eea" : "white",
                              color: currentPage === page ? "white" : "#374151",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                              minWidth: "32px",
                            }}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "6px 12px",
                      background:
                        currentPage === totalPages ? "#f1f5f9" : "white",
                      color: currentPage === totalPages ? "#94a3b8" : "#374151",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    Next ▶️
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Courier Performance Table - HANYA UNTUK ADMIN */}
        {isAdmin && reportData && reportData.courierPerformance.length > 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                🚗 Kinerja Kurir
              </h3>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "400px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Nama Kurir
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Total Pengiriman
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Pendapatan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.courierPerformance.map((courier, index) => (
                    <tr
                      key={index}
                      style={{
                        background: index % 2 === 0 ? "white" : "#f8fafc",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          borderBottom: "1px solid #e2e8f0",
                          fontWeight: "600",
                        }}
                      >
                        {courier.name}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "center",
                        }}
                      >
                        {courier.totalDeliveries}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#059669",
                          fontWeight: "600",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "center",
                        }}
                      >
                        Rp {courier.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export Button */}
        {reportData && reportData.deliveries.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "32px",
              padding: "20px",
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <button
              onClick={exportToExcel}
              disabled={exporting}
              style={{
                padding: "12px 24px",
                background: exporting
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: exporting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: exporting ? 0.7 : 1,
              }}
            >
              {exporting ? (
                <>
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
                  Exporting...
                </>
              ) : (
                <>📥 Export ke Excel</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 768px) {
            input[type="date"],
            input[type="month"] {
              min-width: 100% !important;
              max-width: 100% !important;
            }
          }
          
          input[type="date"],
          input[type="month"] {
            max-width: 100%;
          }
        `}
      </style>
    </div>
  );
};

export default Laporan;







