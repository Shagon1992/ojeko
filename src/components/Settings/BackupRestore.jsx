import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

const BackupRestore = () => {
  const [loading, setLoading] = useState(false);
  const [selectedTables, setSelectedTables] = useState({
    users: true,
    customers: true,
    couriers: true,
    deliveries: true,
    message_templates: true,
  });

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diexport");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            return stringValue.includes(",") || stringValue.includes('"')
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const tablesToBackup = Object.keys(selectedTables).filter(
        (table) => selectedTables[table]
      );

      if (tablesToBackup.length === 0) {
        alert("Pilih minimal satu tabel untuk dibackup");
        return;
      }

      for (const table of tablesToBackup) {
        const { data, error } = await supabase.from(table).select("*");

        if (error) throw error;

        const timestamp = new Date().toISOString().split("T")[0];
        const filename = `backup_${table}_${timestamp}.csv`;
        exportToCSV(data, filename);
      }

      alert(`Backup berhasil! ${tablesToBackup.length} tabel telah diexport.`);
    } catch (error) {
      alert("Error saat backup: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("Hanya file CSV yang didukung");
      return;
    }

    if (
      !confirm(
        "PERINGATAN: Restore data akan menimpa data yang sudah ada. Lanjutkan?"
      )
    ) {
      event.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n");
      const headers = lines[0].split(",").map((header) => header.trim());

      const data = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(",").map((value) => {
            let trimmed = value.trim();
            // Remove quotes if present
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              trimmed = trimmed.slice(1, -1).replace(/""/g, '"');
            }
            return trimmed === "" ? null : trimmed;
          });

          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          return row;
        });

      if (data.length === 0) {
        alert("File CSV kosong atau format tidak valid");
        return;
      }

      // Determine table name from filename
      const tableName = file.name
        .replace(/^backup_/, "")
        .replace(/_\d{4}-\d{2}-\d{2}\.csv$/, "");

      if (
        ![
          "users",
          "customers",
          "couriers",
          "deliveries",
          "message_templates",
        ].includes(tableName)
      ) {
        alert("Nama tabel tidak dikenali: " + tableName);
        return;
      }

      // Clear existing data and insert new data
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(data);

      if (insertError) throw insertError;

      alert(
        `Restore berhasil! ${data.length} data telah diimport ke tabel ${tableName}.`
      );
    } catch (error) {
      alert("Error saat restore: " + error.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleTableToggle = (table) => {
    setSelectedTables((prev) => ({
      ...prev,
      [table]: !prev[table],
    }));
  };

  return (
    <div>
      <h2
        style={{
          margin: "0 0 24px 0",
          color: "#1e293b",
          fontSize: "20px",
          fontWeight: "600",
        }}
      >
        💾 Backup & Restore Data
      </h2>

      <div style={{ display: "grid", gap: "24px" }}>
        {/* Backup Section */}
        <div
          style={{
            background: "#f0f9ff",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #bae6fd",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: "#0369a1",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            📤 Backup Data (Export)
          </h3>
          <p
            style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "14px" }}
          >
            Export data ke file CSV. Pilih tabel yang ingin dibackup:
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            {Object.keys(selectedTables).map((table) => (
              <label
                key={table}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTables[table]}
                  onChange={() => handleTableToggle(table)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#667eea",
                  }}
                />
                <span style={{ fontWeight: "500", color: "#374151" }}>
                  {table.replace(/_/g, " ").toUpperCase()}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handleBackup}
            disabled={loading}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Membackup..." : "📥 Backup Data Terpilih"}
          </button>
        </div>

        {/* Restore Section */}
        <div
          style={{
            background: "#fef2f2",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #fecaca",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: "#dc2626",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            ⚠️ Restore Data (Import)
          </h3>
          <p
            style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "14px" }}
          >
            <strong>PERINGATAN:</strong> Restore akan menghapus data yang sudah
            ada dan menggantinya dengan data dari file backup.
          </p>

          <div
            style={{
              border: "2px dashed #f87171",
              borderRadius: "8px",
              padding: "32px",
              textAlign: "center",
              background: "white",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📁</div>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#374151",
                fontWeight: "500",
              }}
            >
              Pilih file backup CSV
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleRestore}
              disabled={loading}
              style={{
                width: "100%",
                maxWidth: "300px",
                margin: "0 auto",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#f8fafc",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            />
            <p
              style={{
                margin: "12px 0 0 0",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              Hanya file CSV yang didukung
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div
          style={{
            background: "#f8fafc",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <h4
            style={{
              margin: "0 0 12px 0",
              color: "#374151",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            ℹ️ Informasi
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: "20px",
              color: "#64748b",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            <li>
              Backup akan mengexport data ke file CSV terpisah untuk setiap
              tabel
            </li>
            <li>
              Restore hanya bisa dilakukan per tabel (satu file CSV untuk satu
              tabel)
            </li>
            <li>Pastikan file backup berasal dari sistem yang sama</li>
            <li>Selalu backup data sebelum melakukan restore</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
