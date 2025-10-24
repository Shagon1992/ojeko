import React, { useState } from "react";
import { supabase } from "../lib/supabase";

const ImportCustomers = () => {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState(null);

  // Handle file upload - CSV VERSION
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Hanya file CSV yang didukung!");
      return;
    }

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target.result;
        const lines = csvText.split("\n").filter((line) => line.trim() !== "");

        if (lines.length === 0) {
          alert("File CSV kosong!");
          return;
        }

        // Parse CSV header
        const headers = lines[0]
          .split(",")
          .map((h) => h.replace(/"/g, "").toLowerCase().trim());

        const expectedHeaders = ["nama", "alamat", "nomor wa", "ongkir"];

        const isValidHeader = expectedHeaders.every((header) =>
          headers.includes(header)
        );

        if (!isValidHeader) {
          alert(
            `Format header tidak sesuai! Harus: ${expectedHeaders.join(", ")}`
          );
          return;
        }

        // Process data rows (skip header)
        const dataRows = lines.slice(1).filter((row) => row.trim() !== "");

        if (dataRows.length === 0) {
          alert("Tidak ada data dalam file!");
          return;
        }

        const processedData = dataRows.map((row, index) => {
          // Parse CSV row dengan handle quotes dan commas dalam value
          const columns = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              columns.push(current.replace(/^"(.*)"$/, "$1").trim());
              current = "";
            } else {
              current += char;
            }
          }
          columns.push(current.replace(/^"(.*)"$/, "$1").trim());

          const nama = columns[headers.indexOf("nama")] || "";
          const alamat = columns[headers.indexOf("alamat")] || "";
          const nomorWA = columns[headers.indexOf("nomor wa")] || "";
          const ongkir = parseInt(columns[headers.indexOf("ongkir")]) || 0;

          // Validasi data
          const errors = [];
          if (!nama) errors.push("Nama harus diisi");
          if (!alamat) errors.push("Alamat harus diisi");
          if (!nomorWA) errors.push("Nomor WA harus diisi");
          if (ongkir <= 0) errors.push("Ongkir harus lebih dari 0");

          return {
            rawData: columns,
            processed: {
              name: nama,
              address: alamat,
              phone: nomorWA,
              delivery_fee: ongkir,
              distance_km: calculateDistanceFromFee(ongkir),
            },
            errors,
            isValid: errors.length === 0,
          };
        });

        setCsvData(processedData);
        setPreviewData(processedData.slice(0, 10)); // Preview 10 data pertama
      } catch (error) {
        console.error("Error reading CSV file:", error);
        alert("Error membaca file CSV: " + error.message);
      }
    };

    reader.onerror = () => {
      alert("Error membaca file!");
    };

    reader.readAsText(file, "UTF-8");
  };

  // Calculate distance from delivery fee
  const calculateDistanceFromFee = (fee) => {
    if (!fee || fee <= 0) return 0;
    const distance = (fee - 1000) / 2500;
    return Math.max(0, parseFloat(distance.toFixed(2)));
  };

  // Import data to database
  const handleImport = async () => {
    if (csvData.length === 0) {
      alert("Tidak ada data untuk diimport!");
      return;
    }

    // Check if there are invalid data
    const invalidData = csvData.filter((item) => !item.isValid);
    if (invalidData.length > 0) {
      const confirmImport = confirm(
        `Ada ${invalidData.length} data yang tidak valid. Data yang tidak valid akan dilewati. Lanjutkan import?`
      );
      if (!confirmImport) return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const validData = csvData.filter((item) => item.isValid);

      if (validData.length === 0) {
        alert("Tidak ada data yang valid untuk diimport!");
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Import data satu per satu
      for (let i = 0; i < validData.length; i++) {
        const item = validData[i];

        try {
          const { error } = await supabase.from("customers").insert([
            {
              name: item.processed.name,
              address: item.processed.address,
              phone: item.processed.phone,
              delivery_fee: item.processed.delivery_fee,
              distance_km: item.processed.distance_km,
              lat: null,
              lng: null,
            },
          ]);

          if (error) {
            errorCount++;
            errors.push(`Baris ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (error) {
          errorCount++;
          errors.push(`Baris ${i + 2}: ${error.message}`);
        }
      }

      setImportResult({
        total: validData.length,
        success: successCount,
        failed: errorCount,
        errors: errors,
      });

      if (successCount > 0) {
        alert(
          `Import selesai! Berhasil: ${successCount}, Gagal: ${errorCount}`
        );

        // Reset form setelah import berhasil
        setCsvData([]);
        setPreviewData([]);
        setFileName("");
        document.getElementById("file-input").value = "";
      } else {
        alert("Import gagal! Tidak ada data yang berhasil disimpan.");
      }
    } catch (error) {
      console.error("Error during import:", error);
      alert("Error selama import: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setCsvData([]);
    setPreviewData([]);
    setFileName("");
    setImportResult(null);
    document.getElementById("file-input").value = "";
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
        style={{ padding: "24px 20px", maxWidth: "1000px", margin: "0 auto" }}
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
              📥 Import Data Customer
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Import data customer dari file CSV
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1e293b",
            }}
          >
            📋 Upload File CSV
          </h3>

          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: "8px",
              padding: "32px 24px",
              textAlign: "center",
              background: "#fafafa",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "16px",
                color: "#374151",
              }}
            >
              {fileName ||
                "Drag & drop file CSV di sini atau klik untuk memilih"}
            </p>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Format file harus CSV dengan kolom:{" "}
              <strong>Nama, Alamat, Nomor WA, Ongkir</strong>
            </p>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "12px",
                color: "#ef4444",
                background: "#fef2f2",
                padding: "8px",
                borderRadius: "4px",
              }}
            >
              💡 Pastikan format Ongkir: <strong>13500</strong> (tanpa
              koma/titik)
            </p>

            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <button
              onClick={() => document.getElementById("file-input").click()}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Pilih File CSV
            </button>
          </div>

          {/* File Info */}
          {fileName && (
            <div
              style={{
                background: "#f0f9ff",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #bae6fd",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  color: "#0369a1",
                  marginBottom: "4px",
                }}
              >
                📎 File terpilih: {fileName}
              </div>
              <div style={{ fontSize: "14px", color: "#64748b" }}>
                Total data: {csvData.length} customer • Valid:{" "}
                {csvData.filter((item) => item.isValid).length} • Invalid:{" "}
                {csvData.filter((item) => !item.isValid).length}
              </div>
            </div>
          )}
        </div>

        {/* Preview Data */}
        {previewData.length > 0 && (
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "18px",
                fontWeight: "600",
                color: "#1e293b",
              }}
            >
              👁️ Preview Data ({previewData.length} dari {csvData.length})
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "600px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Nama
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Alamat
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Nomor WA
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Ongkir
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
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, index) => (
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
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {item.processed.name}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.processed.address}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#374151",
                          borderBottom: "1px solid #e2e8f0",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.processed.phone}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: "#059669",
                          fontWeight: "600",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Rp {item.processed.delivery_fee.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: "12px",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontWeight: "600",
                            background: item.isValid ? "#d1fae5" : "#fef2f2",
                            color: item.isValid ? "#065f46" : "#dc2626",
                          }}
                        >
                          {item.isValid ? "✅ Valid" : "❌ Error"}
                        </span>
                        {item.errors.length > 0 && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#dc2626",
                              marginTop: "4px",
                              maxWidth: "150px",
                            }}
                          >
                            {item.errors.join(", ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {csvData.length > 10 && (
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "14px",
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                ... dan {csvData.length - 10} data lainnya
              </div>
            )}
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "16px",
                fontWeight: "600",
                color: "#1e293b",
              }}
            >
              📊 Hasil Import
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#1e293b",
                  }}
                >
                  {importResult.total}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Total Data
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#059669",
                  }}
                >
                  {importResult.success}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Berhasil
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#dc2626",
                  }}
                >
                  {importResult.failed}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Gagal</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Detail Error:
                </div>
                <div
                  style={{
                    background: "#fef2f2",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #fecaca",
                    maxHeight: "150px",
                    overflowY: "auto",
                    fontSize: "12px",
                    color: "#dc2626",
                  }}
                >
                  {importResult.errors.map((error, index) => (
                    <div key={index} style={{ marginBottom: "4px" }}>
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {csvData.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleReset}
              style={{
                padding: "12px 24px",
                background: "white",
                color: "#64748b",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                minWidth: "120px",
              }}
            >
              🔄 Reset
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              style={{
                padding: "12px 24px",
                background: importing
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: importing ? "not-allowed" : "pointer",
                minWidth: "120px",
                opacity: importing ? 0.7 : 1,
              }}
            >
              {importing ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid transparent",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      display: "inline-block",
                      marginRight: "8px",
                    }}
                  ></div>
                  Importing...
                </>
              ) : (
                "🚀 Import Data"
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
        `}
      </style>
    </div>
  );
};

export default ImportCustomers;
