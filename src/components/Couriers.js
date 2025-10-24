import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Courier Card Component - Compact List Layout (DI LUAR COMPONENT UTAMA)
const CourierCard = ({ courier, onEdit, onDelete, onToggleAvailability }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "white",
        marginBottom: "8px",
        overflow: "hidden",
      }}
    >
      {/* Header - Always Visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "16px",
          background: courier.is_available ? "#f0fdf4" : "#fef2f2",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = courier.is_available
            ? "#dcfce7"
            : "#fecaca";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = courier.is_available
            ? "#f0fdf4"
            : "#fef2f2";
        }}
      >
        <div
          style={{
            fontSize: "16px",
            color: courier.is_available ? "#16a34a" : "#dc2626",
          }}
        >
          {isExpanded ? "➖" : "➕"}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "2px",
            }}
          >
            {courier.name}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            📞 {courier.phone}
          </div>
        </div>

        <div
          style={{
            padding: "4px 8px",
            background: courier.is_available ? "#dcfce7" : "#fee2e2",
            color: courier.is_available ? "#166534" : "#991b1b",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "600",
            border: `1px solid ${courier.is_available ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {courier.is_available ? "✅ AVAILABLE" : "❌ UNAVAILABLE"}
        </div>
      </div>

      {/* Actions - Visible when expanded */}
      {isExpanded && (
        <div
          style={{
            padding: "16px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAvailability(courier);
            }}
            style={{
              padding: "10px 16px",
              background: courier.is_available ? "#fef3c7" : "#d1fae5",
              color: courier.is_available ? "#92400e" : "#065f46",
              border: `1px solid ${
                courier.is_available ? "#fde68a" : "#a7f3d0"
              }`,
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "100px",
              maxWidth: "120px",
            }}
          >
            {courier.is_available ? "⏸️ Nonaktifkan" : "▶️ Aktifkan"}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(courier);
            }}
            style={{
              padding: "10px 16px",
              background: "#dbeafe",
              color: "#1e40af",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "80px",
              maxWidth: "100px",
            }}
          >
            ✏️ Edit
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(courier.id);
            }}
            style={{
              padding: "10px 16px",
              background: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "80px",
              maxWidth: "100px",
            }}
          >
            🗑️ Hapus
          </button>
        </div>
      )}
    </div>
  );
};

// Main Couriers Component
const Couriers = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourier, setEditingCourier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    username: "", // ⬅️ TAMBAH FIELD USERNAME
    password: "", // ⬅️ TAMBAH FIELD PASSWORD
    is_available: true,
  });

  // Fetch data couriers
  const fetchCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from("couriers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      alert("Error fetching couriers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Submit form (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi field wajib
    if (
      !formData.name ||
      !formData.phone ||
      !formData.username ||
      !formData.password
    ) {
      alert("Nama, No HP, Username, dan Password harus diisi!");
      return;
    }

    try {
      if (editingCourier) {
        // 🔄 UPDATE KURIR - Hanya update data kurir saja
        const courierData = {
          name: formData.name,
          phone: formData.phone,
          is_available: formData.is_available,
        };

        const { error } = await supabase
          .from("couriers")
          .update(courierData)
          .eq("id", editingCourier.id);

        if (error) throw error;
        alert("Data kurir berhasil diupdate!");
      } else {
        // ➕ BUAT KURIR BARU + USER

        // 1. Cek dulu apakah username sudah ada
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("username", formData.username)
          .single();

        if (existingUser) {
          alert("Username sudah digunakan! Silakan pilih username lain.");
          return;
        }

        // 2. Create kurir di table couriers
        const { data: newCourier, error: courierError } = await supabase
          .from("couriers")
          .insert([
            {
              name: formData.name,
              phone: formData.phone,
              is_available: formData.is_available,
            },
          ])
          .select()
          .single();

        if (courierError) throw courierError;

        // 3. Create user di table users
        const encodedPassword = btoa(formData.password); // Encode password

        const { error: userError } = await supabase.from("users").insert([
          {
            username: formData.username,
            password: encodedPassword,
            role: "courier",
            courier_id: newCourier.id, // Simpan relasi ke kurir
          },
        ]);

        if (userError) throw userError;

        alert("Data kurir dan user login berhasil dibuat!");
      }

      // Reset form dan refresh data
      setFormData({
        name: "",
        phone: "",
        username: "",
        password: "",
        is_available: true,
      });
      setShowForm(false);
      setEditingCourier(null);
      fetchCouriers();
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
    }
  };

  // Edit courier
  // Edit courier - Hanya tampilkan data kurir, tidak termasuk username/password
  const handleEdit = (courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      phone: courier.phone,
      username: "", // ❌ Jangan tampilkan username saat edit (security)
      password: "", // ❌ Jangan tampilkan password saat edit
      is_available: courier.is_available,
    });
    setShowForm(true);
  };

  // Delete courier
  const handleDelete = async (id) => {
    if (!confirm("Apakah yakin ingin menghapus data kurir ini?")) return;

    try {
      const { error } = await supabase.from("couriers").delete().eq("id", id);

      if (error) throw error;
      alert("Data kurir berhasil dihapus!");
      fetchCouriers();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Toggle availability
  const toggleAvailability = async (courier) => {
    try {
      const { error } = await supabase
        .from("couriers")
        .update({ is_available: !courier.is_available })
        .eq("id", courier.id);

      if (error) throw error;
      fetchCouriers();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Reset form
  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      username: "",
      password: "",
      is_available: true,
    });
    setEditingCourier(null);
    setShowForm(false);
  };

  // Filter couriers based on search
  const filteredCouriers = couriers.filter(
    (courier) =>
      courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courier.phone.includes(searchTerm)
  );

  if (loading) {
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
        <div
          style={{
            textAlign: "center",
            color: "#64748b",
          }}
        >
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
          Memuat data kurir...
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
      }}
    >
      <div
        style={{
          padding: "24px 20px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header Section */}
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
              🚗 Management Kurir
            </h1>
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Kelola data kurir dan ketersediaan
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 20px rgba(102, 126, 234, 0.3)";
            }}
            onMouseOut={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            <span>+</span>
            Tambah Kurir
          </button>
        </div>

        {/* Search Bar */}
        <div
          style={{
            background: "white",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <input
                type="text"
                placeholder="🔍 Cari kurir berdasarkan nama atau no HP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              {filteredCouriers.length} dari {couriers.length} kurir
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: "#1e293b",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              {editingCourier ? "✏️ Edit Data Kurir" : "➕ Tambah Kurir Baru"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "14px",
                    }}
                  >
                    Nama Kurir *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Masukkan nama kurir"
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "14px",
                    }}
                  >
                    No HP *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Contoh: 08123456789"
                    required
                  />
                </div>

                {/* Username */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "14px",
                    }}
                  >
                    Username Login *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Buat username untuk login"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "14px",
                    }}
                  >
                    Password Login *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Buat password untuk login"
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "20px",
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <input
                  type="checkbox"
                  name="is_available"
                  checked={formData.is_available}
                  onChange={handleInputChange}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "14px",
                    }}
                  >
                    Status Available
                  </div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginTop: "2px",
                    }}
                  >
                    Kurir dapat menerima orderan baru
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  style={{
                    padding: "12px 20px",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 6px 15px rgba(16, 185, 129, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  {editingCourier ? "Update Data" : "Simpan Kurir"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: "12px 20px",
                    background: "white",
                    color: "#6b7280",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "#f9fafb";
                    e.target.style.borderColor = "#9ca3af";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "white";
                    e.target.style.borderColor = "#d1d5db";
                  }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Couriers List */}
        <div
          style={{
            background: "white",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#1e293b",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              📋 Daftar Kurir ({filteredCouriers.length})
            </h3>

            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  padding: "6px 12px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {filteredCouriers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#9ca3af",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🚗</div>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#6b7280",
                }}
              >
                {searchTerm ? "Kurir tidak ditemukan" : "Belum ada data kurir"}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#9ca3af",
                }}
              >
                {searchTerm
                  ? "Coba kata kunci lain"
                  : 'Klik "Tambah Kurir" untuk menambahkan'}
              </p>
            </div>
          ) : (
            <div>
              {filteredCouriers.map((courier) => (
                <CourierCard
                  key={courier.id}
                  courier={courier}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleAvailability={toggleAvailability}
                />
              ))}
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

export default Couriers;
