import React, { useState, useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";
import {
  createDelivery,
  getDeliveries,
  updateDeliveryStatus,
  updateDeliveryCourier,
  deleteDelivery,
} from "../lib/deliveries";
// CSS untuk Leaflet
import "leaflet/dist/leaflet.css";
import MapPickerModal from "./MapPickerModal";

// =============================================
// KONSTANTA & FUNGSI OSRM UNTUK DELIVERIES
// =============================================

// Koordinat RS Aminah Blitar
const RS_AMINAH_COORDINATES = {
  lat: -8.101618,
  lng: 112.1687995,
};

// Fungsi hitung jarak dengan OSRM - FIXED ADDITION +0.3km
const calculateDistanceWithOSRM = async (customerLat, customerLng) => {
  try {
    console.log("Menghitung jarak dari:", RS_AMINAH_COORDINATES, "ke:", customerLat, customerLng);
    
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
      `${RS_AMINAH_COORDINATES.lng},${RS_AMINAH_COORDINATES.lat};${customerLng},${customerLat}?overview=false`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("OSRM Response:", data);
    
    if (data.routes && data.routes[0]) {
      const distanceMeters = data.routes[0].distance;
      const distanceKm = (distanceMeters / 1000).toFixed(2);
      
      // 🔥 FIXED ADDITION: Selalu tambah 0.3km
      const correctedDistanceKm = (parseFloat(distanceKm) + 0.3).toFixed(2);
      
      // 🔥 JARAK MINIMAL 1 KM
      const finalDistanceKm = Math.max(parseFloat(correctedDistanceKm), 1.0).toFixed(2);
      
      console.log(`Jarak OSRM: ${distanceKm} km → +0.5km: ${correctedDistanceKm} km → Final (min 1km): ${finalDistanceKm} km`);
      
      return parseFloat(finalDistanceKm);
    } else if (data.code === "NoRoute") {
      throw new Error("Tidak ada rute yang ditemukan. Koordinat mungkin tidak valid.");
    } else {
      throw new Error("Gagal menghitung jarak. Response OSRM tidak valid.");
    }
  } catch (error) {
    console.error("OSRM error:", error);
    throw new Error(`Gagal menghitung jarak: ${error.message}`);
  }
};

// =============================================
// FUNGSI HELPER UNTUK TEMPLATE MESSAGE
// =============================================

// FUNGSI BARU: Ambil SATU template message berdasarkan jenis
const fetchSingleTemplate = async (templateType) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("user_id", user.id)
      .eq("template_type", templateType)
      .single();

    if (error) {
      // Jika template tidak ditemukan, return template default
      return getDefaultTemplate(templateType);
    }

    return data;
  } catch (error) {
    console.error("Error fetching template:", error);
    return getDefaultTemplate(templateType);
  }
};

// FUNGSI BARU: Template default jika user belum buat template
const getDefaultTemplate = (templateType) => {
  const defaults = {
    admin_to_customer: {
      id: "default",
      template_type: "admin_to_customer",
      message:
        "Assalamu'alaikum {nama_customer}, pesanan obat Anda sedang diproses dan akan segera dikirim oleh kurir kami. Terima kasih.",
    },
    admin_to_courier: {
      id: "default",
      template_type: "admin_to_courier",
      message:
        "Assalamu'alaikum pak {nama_kurir}, ada pesanan antar obat atas nama {nama_customer}, alamat {alamat_customer}. Terima kasih.",
    },
    courier_to_customer: {
      id: "default",
      template_type: "courier_to_customer",
      message:
        "Assalamu'alaiukum, saya {nama_kurir} dari Ojek-O akan mengantarkan obat anda, dengan alamat {alamat_customer}, apa boleh di share lokasi agar lebih akurat??",
    },
  };

  return defaults[templateType] || defaults["courier_to_customer"];
};

// FUNGSI BARU: Replace variables dengan data real
const replaceTemplateVariables = (template, delivery) => {
  const customer = delivery.customers;
  const courier = delivery.couriers;
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const variables = {
    "{nama_customer}": customer?.name || "",
    "{alamat_customer}": customer?.address || "",
    "{no_hp_customer}": customer?.phone || "",
    "{nama_kurir}": courier?.name || currentUser?.username || "",
    "{resi}":
      delivery.order_number || delivery.id.substring(0, 8).toUpperCase(),
    "{ongkir}": customer?.delivery_fee
      ? `Rp ${customer.delivery_fee.toLocaleString()}`
      : "",
    "{jarak}": customer?.distance_km ? `${customer.distance_km} km` : "",
  };

  let message = template.message;
  Object.keys(variables).forEach((key) => {
    message = message.replace(new RegExp(key, "g"), variables[key]);
  });

  return message;
};

// FUNGSI BARU: Tentukan template type berdasarkan context
const getTemplateTypeByContext = (userRole, target) => {
  if (userRole === "admin") {
    return target === "customer" ? "admin_to_customer" : "admin_to_courier";
  } else {
    return "courier_to_customer";
  }
};

// =============================================
// KOMPONEN MODAL TEMPLATE MESSAGE
// =============================================

const TemplateModal = ({
  delivery,
  target, // 'customer' atau 'courier'
  onSend,
  onClose,
}) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    const templateType = getTemplateTypeByContext(currentUser.role, target);
    const userTemplate = await fetchSingleTemplate(templateType);
    setTemplate(userTemplate);
    setLoading(false);
  };

  const handleSend = () => {
    const finalMessage = replaceTemplateVariables(template, delivery);
    onSend(finalMessage);
  };

  const formatPhoneForWA = (phone) => {
    if (!phone) return "";
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      return "62" + cleanPhone.substring(1);
    }
    if (cleanPhone.startsWith("62")) {
      return cleanPhone;
    }
    return cleanPhone;
  };

  const getTargetPhone = () => {
    if (target === "customer") {
      return delivery.customers?.phone;
    } else {
      return delivery.couriers?.phone;
    }
  };

  const getTargetName = () => {
    if (target === "customer") {
      return delivery.customers?.name;
    } else {
      return delivery.couriers?.name;
    }
  };

  const getTemplateTypeLabel = () => {
    if (currentUser.role === "admin") {
      return target === "customer" ? "Admin → Customer" : "Admin → Kurir";
    } else {
      return "Kurir → Customer";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", color: "#1e293b" }}>
          📝 Preview Pesan WA
        </h3>

        {/* Info Penerima */}
        <div
          style={{
            background: "#f8fafc",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}
          >
            Kirim ke: {getTargetName()}
            <span
              style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}
            >
              ({getTemplateTypeLabel()})
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            📞 {getTargetPhone()}
          </div>
        </div>

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#64748b" }}
          >
            Memuat template...
          </div>
        ) : (
          <>
            {/* Preview Message */}
            <div
              style={{
                background: "#f0f9ff",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #bae6fd",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#0369a1",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                📋 Pesan yang akan dikirim:
                {template.id === "default" && (
                  <span
                    style={{
                      fontSize: "10px",
                      background: "#fef3c7",
                      color: "#92400e",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    Template Default
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                  background: "white",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  lineHeight: "1.5",
                }}
              >
                {replaceTemplateVariables(template, delivery)}
              </div>
            </div>

            {/* Info Template */}
            {template.id === "default" && (
              <div
                style={{
                  background: "#fffbeb",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid #fef3c7",
                }}
              >
                <div style={{ fontSize: "12px", color: "#92400e" }}>
                  💡 <strong>Tips:</strong> Anda bisa custom template ini di
                  halaman
                  <strong> Pengaturan → Template Pesan</strong> untuk pesan yang
                  lebih personal.
                </div>
              </div>
            )}
          </>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "white",
              color: "#64748b",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Batal
          </button>

          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              opacity: loading ? 0.7 : 1,
            }}
          >
            📤 Kirim WA
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// KOMPONEN QUICK CUSTOMER FORM - DIPERBAIKI
// =============================================

const QuickCustomerForm = ({
  onSave,
  onCancel,
  initialData,
  isRequiredForCompletion = false,
  currentUserRole,
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    lat: initialData?.lat || "",
    lng: initialData?.lng || "",
    distance_km: initialData?.distance_km || "",
    delivery_fee: initialData?.delivery_fee || "",
  });
  const [showMapModal, setShowMapModal] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // 🔥 FUNGSI BARU: Hitung jarak otomatis dari RS
  const handleCalculateDistance = async () => {
    if (!formData.lat || !formData.lng) {
      alert("❌ Harap isi koordinat latitude dan longitude terlebih dahulu!");
      return;
    }

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    if (isNaN(lat) || isNaN(lng)) {
      alert("❌ Format koordinat tidak valid!");
      return;
    }

    setIsCalculatingDistance(true);

    try {
      const distanceKm = await calculateDistanceWithOSRM(lat, lng);

      if (distanceKm) {
        // Auto-isi jarak
        setFormData((prev) => ({
          ...prev,
          distance_km: distanceKm.toString(),
        }));

        // Auto-hitung ongkir
        const rawFee = distanceKm * 2500 + 1000;
        const roundedFee = Math.ceil(rawFee / 500) * 500;

        setFormData((prev) => ({
          ...prev,
          delivery_fee: roundedFee.toString(),
        }));

        alert(
          `✅ Berhasil menghitung jarak!\n\n📏 Jarak: ${distanceKm} km\n💰 Ongkir: Rp ${roundedFee.toLocaleString()}`
        );
      } else {
        alert("❌ Gagal menghitung jarak. Coba lagi.");
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoordinateSelect = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      lat: lat.toString(),
      lng: lng.toString(),
    }));
  };

  const calculateDistanceFromFee = () => {
    if (!formData.delivery_fee) {
      alert("Masukkan ongkir terlebih dahulu!");
      return;
    }
    const fee = parseFloat(formData.delivery_fee);
    if (isNaN(fee)) {
      alert("Format ongkir tidak valid!");
      return;
    }
    const distance = (fee - 1000) / 2500;
    setFormData((prev) => ({ ...prev, distance_km: distance.toFixed(2) }));
  };

  const calculateFeeFromDistance = () => {
    if (!formData.distance_km) {
      alert("Masukkan jarak terlebih dahulu!");
      return;
    }
    const distance = parseFloat(formData.distance_km);
    if (isNaN(distance)) {
      alert("Format jarak tidak valid!");
      return;
    }
    const rawFee = distance * 2500 + 1000;
    const roundedFee = Math.ceil(rawFee / 500) * 500;
    setFormData((prev) => ({ ...prev, delivery_fee: roundedFee.toString() }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.address) {
      alert("Nama, No HP, dan Alamat harus diisi!");
      return;
    }

    // 🔥 PERBAIKAN: Validasi berbeda untuk admin vs kurir
    if (isRequiredForCompletion) {
      const isAdmin = currentUserRole === "admin";

      if (isAdmin) {
        // Admin: lat/long optional, tapi lainnya wajib
        if (!formData.distance_km || !formData.delivery_fee) {
          alert(
            "Untuk menyelesaikan pengiriman, data harus lengkap:\n\n" +
              "• Nama, No HP, Alamat ✅ WAJIB\n" +
              "• Jarak & Ongkos Kirim ✅ WAJIB\n" +
              "• Latitude & Longitude ❌ BOLEH KOSONG (khusus admin)\n\n" +
              "Harap lengkapi data terlebih dahulu."
          );
          return;
        }
      } else {
        // Kurir: semua wajib termasuk lat/long
        if (
          !formData.lat ||
          !formData.lng ||
          !formData.distance_km ||
          !formData.delivery_fee
        ) {
          alert(
            "Untuk menyelesaikan pengiriman, semua data harus lengkap:\n\n" +
              "• Latitude & Longitude\n• Jarak\n• Ongkos Kirim\n\n" +
              "Harap lengkapi semua data terlebih dahulu."
          );
          return;
        }
      }
    }

    onSave(formData);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            color: "#1e293b",
            textAlign: "center",
            fontSize: "18px",
          }}
        >
          {initialData ? "✏️ Edit Customer" : "➕ Buat Customer Baru"}
          {isRequiredForCompletion && (
            <div
              style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}
            >
              ⚠️ Wajib lengkapi semua data untuk menyelesaikan pengiriman
            </div>
          )}
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Nama *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
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
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Alamat *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows="2"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                marginBottom: "8px",
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "#4299e1",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              🗺️ Ambil Koordinat dari Map
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                Latitude
                {currentUserRole !== "admin" && (
                  <span style={{ color: "#ef4444" }}> *</span>
                )}
              </label>
              <input
                type="number"
                step="any"
                name="lat"
                value={formData.lat}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
                placeholder={currentUserRole === "admin" ? "Opsional" : "Wajib"}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                Longitude
                {currentUserRole !== "admin" && (
                  <span style={{ color: "#ef4444" }}> *</span>
                )}
              </label>
              <input
                type="number"
                step="any"
                name="lng"
                value={formData.lng}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
                placeholder={currentUserRole === "admin" ? "Opsional" : "Wajib"}
              />
            </div>
          </div>

          {/* 🔥 TOMBOL BARU: Hitung Jarak dari RS */}
          {(formData.lat || formData.lng) && (
            <div style={{ marginBottom: "16px" }}>
              <button
                type="button"
                onClick={handleCalculateDistance}
                disabled={isCalculatingDistance}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: isCalculatingDistance ? "#94a3b8" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: isCalculatingDistance ? "not-allowed" : "pointer",
                  opacity: isCalculatingDistance ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isCalculatingDistance ? (
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
                    Menghitung Jarak...
                  </>
                ) : (
                  <>📏 Hitung Jarak dari RS Aminah</>
                )}
              </button>
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textAlign: "center",
                  marginTop: "6px",
                }}
              >
                Akan menghitung jarak berkendara dari RS Aminah Blitar ke
                koordinat di atas
              </div>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              Jarak (km) {isRequiredForCompletion && " *"}
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="number"
                step="0.1"
                name="distance_km"
                value={formData.distance_km}
                onChange={handleInputChange}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
                required={isRequiredForCompletion}
              />
              <button
                type="button"
                onClick={calculateFeeFromDistance}
                style={{
                  padding: "10px 12px",
                  background: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                }}
              >
                💰 Hitung Ongkir
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              Ongkir (Rp) {isRequiredForCompletion && " *"}
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="number"
                name="delivery_fee"
                value={formData.delivery_fee}
                onChange={handleInputChange}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
                required={isRequiredForCompletion}
              />
              <button
                type="button"
                onClick={calculateDistanceFromFee}
                style={{
                  padding: "10px 12px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                }}
              >
                📏 Hitung Jarak
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "12px 20px",
                background: "white",
                color: "#64748b",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
                flex: 1,
                minWidth: "120px",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                padding: "12px 20px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "88px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                flex: 1,
                minWidth: "120px",
              }}
            >
              Simpan
            </button>
          </div>
        </form>
      </div>

      {showMapModal && (
        <MapPickerModal
          onCoordinateSelect={handleCoordinateSelect}
          onClose={() => setShowMapModal(false)}
          existingLat={formData.lat}    // ✅ BARU
          existingLng={formData.lng}    // ✅ BARU
        />
      )}
    </div>
  );
};

// =============================================
// KOMPONEN DELIVERY CARD DENGAN TEMPLATE WA
// =============================================

const DeliveryCard = ({
  delivery,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdateCourier,
  onUpdateCustomer,
  couriers,
  currentUser,
  onEditCustomer,
  showAllOrders,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  // STATE BARU UNTUK TEMPLATE WA
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [waTarget, setWaTarget] = useState(null);

  const isAdmin = currentUser?.role === "admin";
  const isAssignedCourier = delivery.courier_id === currentUser?.courier_id;
  const shouldDisableButtons = !isAdmin && !isAssignedCourier && showAllOrders;

  const statusConfig = {
    pending: { color: "#fef3c7", textColor: "#92400e", label: "PENDING" },
    on_delivery: {
      color: "#dbeafe",
      textColor: "#1e40af",
      label: "ON DELIVERY",
    },
    completed: { color: "#d1fae5", textColor: "#065f46", label: "SELESAI" },
  };

  const statusInfo = statusConfig[delivery.status] || statusConfig.pending;

  const formatPhoneForWA = (phone) => {
    if (!phone) return "";
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      return "62" + cleanPhone.substring(1);
    }
    if (cleanPhone.startsWith("62")) {
      return cleanPhone;
    }
    return cleanPhone;
  };

  // FUNGSI BARU: Handle WA dengan template
  const handleWAWithTemplate = async (target) => {
    const phone =
      target === "customer"
        ? delivery.customers?.phone
        : delivery.couriers?.phone;

    if (!phone) {
      alert(
        `No HP ${target === "customer" ? "customer" : "kurir"} tidak tersedia`
      );
      return;
    }

    setWaTarget(target);
    setShowTemplateModal(true);
  };

  // FUNGSI BARU: Kirim message ke WA
  const handleSendWA = (message) => {
    const phone =
      waTarget === "customer"
        ? delivery.customers?.phone
        : delivery.couriers?.phone;

    const waNumber = formatPhoneForWA(phone);
    const encodedMessage = encodeURIComponent(message);

    window.open(`https://wa.me/${waNumber}?text=${encodedMessage}`, "_blank");
    setShowTemplateModal(false);
    setWaTarget(null);
  };

  const handleOpenMap = () => {
    const customer = delivery.customers;
    if (!customer?.lat || !customer?.lng) {
      alert("Koordinat customer tidak tersedia");
      return;
    }
    const mapsUrl = `https://www.google.com/maps?q=${customer.lat},${customer.lng}`;
    window.open(mapsUrl, "_blank");
  };

  const handleGantiKurir = () => {
    setSelectedCourier(delivery.courier_id || "");
    setShowCourierModal(true);
  };

  const confirmGantiKurir = async () => {
    if (!selectedCourier) {
      alert("Pilih kurir terlebih dahulu!");
      return;
    }
  
    const courier = couriers.find((c) => c.id === selectedCourier);
    if (!courier) return;
  
    const konfirmasi = confirm(
      `Betul akan ganti kurir menjadi ${courier.name}?`
    );
    if (!konfirmasi) return;
  
    try {
      await onUpdateCourier(delivery.id, selectedCourier);
      
      // 🔥 KIRIM NOTIFICATION SETELAS BERHASIL GANTI KURIR
      await sendNotificationToCourier(selectedCourier, delivery.customers?.name);
      
      setShowCourierModal(false);
      alert(`Kurir berhasil diganti menjadi ${courier.name}`);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };
  
  // 🔥 TAMBAHKAN FUNCTION INI DI DALAM DELIVERYCARD COMPONENT
  const sendNotificationToCourier = async (courierId, customerName) => {
    try {
      // Test browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("📦 ORDER BARU - Ojek-O", {
          body: `Hai Kurir! Ada orderan baru atas nama ${customerName}. Ayo segera dikirim!`,
          icon: "/icons/icon-192x192.png",
          tag: "new-order"
        });
      }
      
      console.log('✅ Notification sent to courier:', courierId);
    } catch (error) {
      console.error('❌ Send notification error:', error);
    }
  };

  const handleKirimObat = () => {
    const konfirmasi = confirm("Apakah anda akan mengirim obat ini?");
    if (konfirmasi) {
      onUpdateStatus(delivery.id, "on_delivery");
    }
  };

  const isCustomerDataComplete = (customer, userRole) => {
    const requiredFields = [
      customer?.name,
      customer?.address,
      customer?.phone,
      customer?.distance_km,
      customer?.delivery_fee,
    ];

    // Untuk admin: lat/long optional
    if (userRole === "admin") {
      return requiredFields.every((field) => field);
    }
    // Untuk kurir: semua field wajib termasuk lat/long
    else {
      return (
        requiredFields.every((field) => field) && customer?.lat && customer?.lng
      );
    }
  };

  const handleSelesai = () => {
    // 🔥 VALIDASI 1: Kurir harus dipilih (khusus admin)
    if (isAdmin && !delivery.courier_id) {
      alert(
        "❌ Tidak bisa menyelesaikan pengiriman!\n\nHarap pilih kurir terlebih dahulu sebelum menyelesaikan pengiriman."
      );
      return;
    }

    // 🔥 VALIDASI 2: Data customer (beda validasi admin vs kurir)
    if (!isCustomerDataComplete(delivery.customers, currentUser.role)) {
      const roleSpecificMessage = isAdmin
        ? "Data customer tidak lengkap. Data wajib: Nama, Alamat, No HP, Jarak, Ongkir.\n\nKoordinat (lat/long) BOLEH KOSONG untuk admin.\n\nApakah Anda ingin melengkapi data sekarang?"
        : "Data customer tidak lengkap. Harap lengkapi SEMUA data termasuk koordinat (lat/long) sebelum menyelesaikan pengiriman.\n\nApakah Anda ingin melengkapi data sekarang?";

      const konfirmasi = confirm(roleSpecificMessage);

      if (konfirmasi) {
        setCustomerToEdit(delivery.customers);
        setShowCustomerForm(true);
        // 🔥 TIDAK PERLU APA-APA DI SINI - biarkan state berubah dan render QuickCustomerForm
      }
      return;
    }

    // 🔥 KONFIRMASI FINAL
    const konfirmasiSelesai = confirm(
      "Apakah obat sudah benar selesai dikirim?"
    );
    if (konfirmasiSelesai) {
      onUpdateStatus(delivery.id, "completed");
    }
  };

  const handleAfterCustomerUpdate = async (customerData) => {
    setShowCustomerForm(false);
    setCustomerToEdit(null);

    try {
      const success = await onUpdateCustomer({
        ...customerData,
        id: delivery.customers.id,
      });

      if (success) {
        setTimeout(() => {
          // ✅ PERBAIKAN: Gunakan validasi yang sama seperti handleSelesai
          if (isAdmin && !delivery.courier_id) {
            alert(
              "❌ Data customer sudah lengkap, tapi kurir belum dipilih!\n\nHarap pilih kurir terlebih dahulu."
            );
            return;
          }

          // ✅ PERBAIKAN: Gunakan validasi role-specific
          if (isCustomerDataComplete(customerData, currentUser.role)) {
            const konfirmasiSelesai = confirm(
              "Data customer sudah lengkap. Apakah Anda ingin menyelesaikan pengiriman sekarang?"
            );
            if (konfirmasiSelesai) {
              onUpdateStatus(delivery.id, "completed");
            }
          } else {
            alert(
              "❌ Data customer masih belum lengkap. Silakan lengkapi kembali."
            );
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Error: " + error.message);
    }
  };

  const renderActionButtons = () => {
    if (delivery.status === "completed" && !isAdmin) {
      return null;
    }

    if (!isAdmin && !isAssignedCourier && showAllOrders) {
      return (
        <div
          style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}
        >
          ⚠️ Orderan kurir lain
        </div>
      );
    }

    return (
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {/* WA Customer Button */}
        {(isAdmin || isAssignedCourier) && (
          <button
            onClick={() => handleWAWithTemplate("customer")}
            style={{
              padding: "6px 10px",
              background: "#d1fae5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "80px",
            }}
          >
            📞 WA Customer
          </button>
        )}
    
        {/* WA Kurir Button */}
        {isAdmin && delivery.couriers && (
          <button
            onClick={() => handleWAWithTemplate("courier")}
            style={{
              padding: "6px 10px",
              background: "#dbeafe",
              color: "#1e40af",
              border: "1px solid #bfdbfe",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "80px",
            }}
          >
            📞 WA Kurir
          </button>
        )}
    
        {/* 🔥 TOMBOL BARU: Edit Data Customer */}
        {(isAdmin || isAssignedCourier) && (
          <button
            onClick={() => onEditCustomer(delivery.customers)}
            style={{
              padding: "6px 10px",
              background: "#e0e7ff",
              color: "#3730a3",
              border: "1px solid #c7d2fe",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "80px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              justifyContent: "center",
            }}
          >
            ✏️ Edit Customer
          </button>
        )}
    
        {/* Tombol lainnya tetap sama */}
        {(isAdmin || isAssignedCourier) && (
          <button
            onClick={handleGantiKurir}
            style={{
              padding: "6px 10px",
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fde68a",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "80px",
            }}
          >
            🔄 Ganti Kurir
          </button>
        )}
    
        {!isAdmin && delivery.status === "pending" && isAssignedCourier && (
          <button
            onClick={handleKirimObat}
            style={{
              padding: "6px 10px",
              background: "#3b82f6",
              color: "white",
              border: "1px solid #2563eb",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "80px",
            }}
          >
            🚗 Kirim Obat
          </button>
        )}
    
        {((isAdmin && delivery.status !== "completed") ||
          (!isAdmin &&
            delivery.status === "on_delivery" &&
            isAssignedCourier)) && (
          <div style={{ position: "relative", flex: 1 }}>
            <button
              onClick={handleSelesai}
              disabled={isAdmin && !delivery.courier_id}
              style={{
                width: "100%",
                padding: "6px 10px",
                background: isAdmin && !delivery.courier_id ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "500",
                cursor: isAdmin && !delivery.courier_id ? "not-allowed" : "pointer",
                opacity: isAdmin && !delivery.courier_id ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (isAdmin && !delivery.courier_id) {
                  const tooltip = document.createElement("div");
                  tooltip.innerHTML = "⚠️ Pilih kurir terlebih dahulu";
                  tooltip.style.cssText = `
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #1f2937;
                    color: white;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 10px;
                    white-space: nowrap;
                    z-index: 1000;
                    margin-bottom: 5px;
                  `;
                  e.target.parentNode.appendChild(tooltip);
                  e.target._tooltip = tooltip;
                }
              }}
              onMouseLeave={(e) => {
                if (e.target._tooltip) {
                  e.target._tooltip.remove();
                  e.target._tooltip = null;
                }
              }}
            >
              {isAdmin && !delivery.courier_id ? "⏳ Pilih Kurir" : "✅ Selesai"}
            </button>
          </div>
        )}
    
        {isAdmin && (
          <button
            onClick={() => onDelete(delivery.id)}
            style={{
              padding: "6px 10px",
              background: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              flex: 1,
              minWidth: "60px",
            }}
          >
            🗑️ Hapus
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "white",
        marginBottom: "8px",
        overflow: "hidden",
        opacity: shouldDisableButtons ? 0.7 : 1,
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "12px 16px",
          background: isExpanded ? "#f8fafc" : "white",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              fontSize: "14px",
              color: statusInfo.textColor,
              marginTop: "2px",
            }}
          >
            {isExpanded ? "➖" : "➕"}
          </div>

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
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                📅{" "}
                {new Date(delivery.delivery_date).toLocaleDateString("id-ID")}
              </div>
              <div
                style={{
                  padding: "2px 6px",
                  background: statusInfo.color,
                  color: statusInfo.textColor,
                  borderRadius: "8px",
                  fontSize: "10px",
                  fontWeight: "600",
                  border: `1px solid ${statusInfo.textColor}20`,
                }}
              >
                {statusInfo.label}
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "4px",
              }}
            >
              📍 {delivery.customers?.address || "No address"}
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginBottom: "4px",
              }}
            >
              🚗 Kurir: {delivery.couriers?.name || "Belum ada kurir"}
            </div>

            {delivery.notes && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#8b5cf6",
                  fontStyle: "italic",
                  background: "#f3f4f6",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  marginTop: "4px",
                }}
              >
                📝 Catatan: {delivery.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          style={{
            padding: "12px 16px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            textAlign: "left",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              🏠 Info Customer
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                alignItems: "start",
                marginBottom: "8px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <span>📞 {delivery.customers?.phone || "-"}</span>
                  <span>
                    💰 Rp{" "}
                    {delivery.customers?.delivery_fee?.toLocaleString() || "0"}
                  </span>
                  <span>📏 {delivery.customers?.distance_km || "0"} km</span>
                </div>
                <div style={{ marginTop: "4px" }}>
                  🚗 Kurir: {delivery.couriers?.name || "Belum ada"}
                </div>
              </div>

              {delivery.customers?.lat && delivery.customers?.lng && (
                <button
                  onClick={handleOpenMap}
                  style={{
                    padding: "6px 10px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "500",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  🗺️ Cek Map
                </button>
              )}
            </div>

            {!isCustomerDataComplete(delivery.customers, currentUser.role) && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  border: "1px solid #fecaca",
                }}
              >
                ⚠️ Data customer tidak lengkap. Harap lengkapi sebelum
                menyelesaikan pengiriman.
              </div>
            )}
          </div>

          {renderActionButtons()}
        </div>
      )}

      {/* Modal Ganti Kurir */}
      {showCourierModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", color: "#1e293b" }}>
              🔄 Ganti Kurir
            </h4>

            <div style={{ marginBottom: "16px" }}>
              <select
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <option value="">Pilih Kurir</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name} {courier.is_available ? "✅" : "❌"}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowCourierModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                Batal
              </button>
              <button
                onClick={confirmGantiKurir}
                style={{
                  padding: "8px 16px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Ganti Kurir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Customer */}
      {showCustomerForm && customerToEdit && (
        <QuickCustomerForm
          onSave={handleAfterCustomerUpdate}
          onCancel={() => {
            setShowCustomerForm(false);
            setCustomerToEdit(null);
          }}
          initialData={customerToEdit}
          isRequiredForCompletion={true}
          currentUserRole={currentUser.role}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          delivery={delivery}
          target={waTarget}
          onSend={handleSendWA}
          onClose={() => {
            setShowTemplateModal(false);
            setWaTarget(null);
          }}
        />
      )}
    </div>
  );
};

// =============================================
// KOMPONEN UTAMA DELIVERIES DENGAN SEARCH OPTIMAL
// =============================================

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("belum-dikirim");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllOrders, setShowAllOrders] = useState(false);

  // STATE BARU UNTUK SEARCH CUSTOMER YANG OPTIMAL
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const [deliveryFormData, setDeliveryFormData] = useState({
    customer_id: "",
    courier_id: "",
    notes: "",
  });

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isAdmin = currentUser?.role === "admin";

  // FUNGSI BARU: Debounced search customer
  const handleCustomerSearch = (searchTerm) => {
    setCustomerSearch(searchTerm);
    setSearchError("");

    // Clear timeout sebelumnya
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Jika search kosong, reset results
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Set loading state
    setSearchLoading(true);

    // Set timeout untuk debounce
    const newTimeout = setTimeout(async () => {
      try {
        await performSearch(searchTerm.trim());
      } catch (error) {
        console.error("Search error:", error);
        setSearchError("Error saat mencari customer");
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce

    setSearchTimeout(newTimeout);
  };

  // FUNGSI BARU: Perform actual search ke database
  const performSearch = async (searchTerm) => {
    setHasSearched(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .or(
        `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`
      )
      .limit(15)
      .order("name");

    if (error) {
      throw error;
    }

    setSearchResults(data || []);
  };

  // FUNGSI BARU: Reset search
  const resetSearch = () => {
    setCustomerSearch("");
    setSearchResults([]);
    setHasSearched(false);
    setSearchError("");
  };

  // FUNGSI BARU: Select customer
  const handleSelectCustomer = (customer) => {
    setDeliveryFormData((prev) => ({ ...prev, customer_id: customer.id }));
    setCustomerSearch(customer.name);
    setHasSearched(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // EFFECT BARU: Refresh search results ketika deliveries berubah
  useEffect(() => {
    if (customerSearch && hasSearched) {
      // Jika sedang dalam state pencarian, refresh results
      performSearch(customerSearch);
    }
  }, [deliveries, customerSearch, hasSearched]); // 🔥 TAMBAHKAN DEPENDENCIES

  // EFFECT UNTUK CLEANUP
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Fetch data utama
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch deliveries
      const deliveriesData = await getDeliveries();
      setDeliveries(deliveriesData || []);

      // Fetch couriers
      const { data: couriersData } = await supabase
        .from("couriers")
        .select("*")
        .order("name");
      setCouriers(couriersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter deliveries based on active tab
  // 🔥 PASTIKAN fungsi filter sudah benar
  const getFilteredDeliveries = () => {
    const today = new Date().toISOString().split("T")[0];
    let filtered = deliveries;

    switch (activeTab) {
      case "belum-dikirim":
        filtered = filtered.filter(
          (d) => d.status === "pending" || d.status === "on_delivery"
        );
        break;
      case "selesai-dikirim":
        filtered = filtered.filter(
          (d) => d.status === "completed" && d.delivery_date === today
        );
        break;
      case "keseluruhan":
        filtered = filtered.filter((d) => d.delivery_date === today);
        break;
    }

    // 🔥 FILTER BERDASARKAN showAllOrders DAN ROLE
    if (!isAdmin && !showAllOrders) {
      filtered = filtered.filter(
        (d) => d.courier_id === currentUser.courier_id
      );
    }

    // Search filter (tetap sama)
    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.customers?.address
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          d.customers?.phone?.includes(searchTerm) ||
          d.couriers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredDeliveries = getFilteredDeliveries();

  // Count orders per tab
  // 🔥 PERBAIKAN: Fungsi hitung orderan yang menyesuaikan dengan showAllOrders
  const getOrderCount = (tab) => {
    const today = new Date().toISOString().split("T")[0];
    let filtered = deliveries;

    // 🔥 FILTER BERDASARKAN showAllOrders DAN ROLE
    if (!isAdmin && !showAllOrders) {
      filtered = filtered.filter(
        (d) => d.courier_id === currentUser.courier_id
      );
    }

    switch (tab) {
      case "belum-dikirim":
        filtered = filtered.filter(
          (d) => d.status === "pending" || d.status === "on_delivery"
        );
        break;
      case "selesai-dikirim":
        filtered = filtered.filter(
          (d) => d.status === "completed" && d.delivery_date === today
        );
        break;
      case "keseluruhan":
        filtered = filtered.filter((d) => d.delivery_date === today);
        break;
    }

    return filtered.length;
  };

  // Create new delivery
  const handleCreateDelivery = async (e) => {
    e.preventDefault();

    if (!deliveryFormData.customer_id) {
      alert("Pilih customer terlebih dahulu!");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("deliveries")
        .insert([
          {
            customer_id: deliveryFormData.customer_id,
            courier_id: deliveryFormData.courier_id || null,
            status: "pending",
            delivery_date: new Date().toISOString().split("T")[0],
            notes: deliveryFormData.notes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      alert("Delivery berhasil dibuat!");
      setShowCreateForm(false);
      setDeliveryFormData({ customer_id: "", courier_id: "", notes: "" });
      setCustomerSearch("");
      fetchData();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Update delivery status
  const handleUpdateStatus = async (deliveryId, status) => {
    try {
      await updateDeliveryStatus(deliveryId, status);
      fetchData();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Update delivery courier
  const handleUpdateCourier = async (deliveryId, courierId) => {
    try {
      await updateDeliveryCourier(deliveryId, courierId);
      fetchData();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Delete delivery
  const handleDeleteDelivery = async (deliveryId) => {
    if (!confirm("Apakah yakin ingin menghapus delivery ini?")) return;

    try {
      await deleteDelivery(deliveryId);
      alert("Delivery berhasil dihapus!");
      fetchData();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Update customer
  const handleUpdateCustomer = async (customerData) => {
    try {
      const preparedData = {
        name: customerData.name.trim(),
        address: customerData.address.trim(),
        phone: customerData.phone.trim(),
        lat: customerData.lat ? parseFloat(customerData.lat) : null,
        lng: customerData.lng ? parseFloat(customerData.lng) : null,
        distance_km: customerData.distance_km
          ? parseFloat(customerData.distance_km)
          : 0,
        delivery_fee: customerData.delivery_fee
          ? parseInt(customerData.delivery_fee)
          : 0,
      };

      const { error } = await supabase
        .from("customers")
        .update(preparedData)
        .eq("id", customerData.id);

      if (error) throw error;

      alert("Data customer berhasil diupdate!");
      fetchData();
      return true;
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Error: " + error.message);
      return false;
    }
  };

  // Save customer (create or update)
  // FUNGSI BARU: Save customer (create or update) - VERSION FIXED
  const handleSaveCustomer = async (customerData) => {
    try {
      const preparedData = {
        name: customerData.name.trim(),
        address: customerData.address.trim(),
        phone: customerData.phone.trim(),
        lat: customerData.lat ? parseFloat(customerData.lat) : null,
        lng: customerData.lng ? parseFloat(customerData.lng) : null,
        distance_km: customerData.distance_km
          ? parseFloat(customerData.distance_km)
          : 0,
        delivery_fee: customerData.delivery_fee
          ? parseInt(customerData.delivery_fee)
          : 0,
      };

      let newCustomerId;

      if (editingCustomer?.id) {
        // Update existing customer
        const { error } = await supabase
          .from("customers")
          .update(preparedData)
          .eq("id", editingCustomer.id);

        if (error) throw error;
        alert("Data customer berhasil diupdate!");
        newCustomerId = editingCustomer.id;
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from("customers")
          .insert([preparedData])
          .select()
          .single();

        if (error) throw error;
        alert("Customer berhasil dibuat!");
        newCustomerId = data.id;

        // 🔥 PERBAIKAN PENTING: Otomatis pilih customer baru di form pengiriman
        if (showCreateForm) {
          setDeliveryFormData((prev) => ({
            ...prev,
            customer_id: data.id,
          }));
          setCustomerSearch(data.name); // Set nama customer di search box
          setSearchResults([data]); // Tampilkan customer baru di results
          setHasSearched(true); // Tampilkan hasil pencarian
        }
      }

      // Refresh data dan reset state
      setShowCustomerForm(false);
      setEditingCustomer(null);
      fetchData(); // Refresh deliveries data

      return newCustomerId;
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Error: " + error.message);
      return null;
    }
  };

  // Edit customer
  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
          Memuat data deliveries...
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
              📦 Management Deliveries
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              {isAdmin ? "Admin" : "Kurir"} - Kelola pengiriman dan tracking
              status
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
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
            }}
          >
            <span>+</span>
            Buat Pengiriman
          </button>
        </div>
        {/* Checkbox untuk kurir */}
        {!isAdmin && (
          <div
            style={{
              background: "white",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <input
              type="checkbox"
              id="showAllOrders"
              checked={showAllOrders}
              onChange={(e) => setShowAllOrders(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                cursor: "pointer",
              }}
            />
            <label
              htmlFor="showAllOrders"
              style={{
                fontSize: "14px",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Tampilkan Semua Orderan (tidak hanya orderan saya)
            </label>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginLeft: "auto",
                background: "#f3f4f6",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              {showAllOrders
                ? "👁️ Melihat SEMUA orderan"
                : "👤 Hanya orderan saya saja"}
            </div>
          </div>
        )}
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "white",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
            overflow: "hidden",
          }}
        >
          {[
            {
              id: "belum-dikirim",
              label: "Belum Dikirim",
              desc: "Pending + On Delivery",
            },
            {
              id: "selesai-dikirim",
              label: "Selesai Dikirim",
              desc: "Hari ini",
            },
            {
              id: "keseluruhan",
              label: "Keseluruhan",
              desc: "Hari ini",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "16px 12px",
                background: activeTab === tab.id ? "#667eea" : "transparent",
                color: activeTab === tab.id ? "white" : "#64748b",
                border: "none",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{tab.label}</span>
              <span style={{ fontSize: "11px", opacity: 0.8 }}>{tab.desc}</span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: activeTab === tab.id ? "white" : "#1e293b",
                }}
              >
                {getOrderCount(tab.id)} Orderan
              </div>
            </button>
          ))}
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
          <input
            type="text"
            placeholder="🔍 Cari delivery..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>
        {/* Deliveries List */}
        <div
          style={{
            background: "white",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          {filteredDeliveries.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#9ca3af",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>📦</div>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#6b7280",
                }}
              >
                Tidak ada data delivery
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                {searchTerm
                  ? "Coba kata kunci lain"
                  : 'Klik "Buat Pengiriman" untuk menambahkan'}
              </p>
            </div>
          ) : (
            <div>
              {filteredDeliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onEdit={() => {}}
                  onDelete={handleDeleteDelivery}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateCourier={handleUpdateCourier}
                  onEditCustomer={handleEditCustomer}
                  onUpdateCustomer={handleUpdateCustomer}
                  couriers={couriers}
                  currentUser={currentUser}
                  showAllOrders={showAllOrders}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Delivery Form */}
      {showCreateForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflow: "auto",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#1e293b" }}>
              ➕ Buat Pengiriman Baru
            </h3>

            <form onSubmit={handleCreateDelivery}>
              {/* Customer Search - VERSION BARU YANG OPTIMAL */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Cari Customer *
                </label>

                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="🔍 Cari customer (nama, no HP, alamat)..."
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      paddingRight: "40px",
                    }}
                    onFocus={() => setHasSearched(true)}
                  />

                  {/* Loading Indicator */}
                  {searchLoading && (
                    <div
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid #e2e8f0",
                          borderTop: "2px solid #667eea",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Search Info */}
                {customerSearch && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "4px",
                      textAlign: "right",
                    }}
                  >
                    {searchLoading
                      ? "Mencari..."
                      : `Mengetik... ${customerSearch.length} karakter`}
                  </div>
                )}

                {/* Search Results */}
                {hasSearched && !searchLoading && (
                  <div
                    style={{
                      marginTop: "8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      maxHeight: "300px",
                      overflow: "auto",
                      background: "white",
                    }}
                  >
                    {/* Case 1: Ada hasil */}
                    {(searchResults.length > 0 ||
                      deliveryFormData.customer_id) && (
                      <div>
                        <div
                          style={{
                            padding: "8px 12px",
                            background: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                            fontSize: "11px",
                            color: "#64748b",
                            fontWeight: "600",
                          }}
                        >
                          📊{" "}
                          {searchResults.length > 0
                            ? `Ditemukan ${searchResults.length} customer`
                            : "Customer terpilih"}
                        </div>

                        {/* 🔥 PERBAIKAN: Tampilkan customer yang baru dibuat */}
                        {searchResults.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f1f5f9",
                              cursor: "pointer",
                              transition: "background 0.2s",
                              backgroundColor:
                                deliveryFormData.customer_id === customer.id
                                  ? "#f0f9ff"
                                  : "white",
                              borderRadius: "4px",
                              margin: "2px 0",
                              border:
                                deliveryFormData.customer_id === customer.id
                                  ? "1px solid #3b82f6"
                                  : "none",
                            }}
                            onMouseOver={(e) => {
                              if (
                                deliveryFormData.customer_id !== customer.id
                              ) {
                                e.currentTarget.style.background = "#f8fafc";
                                e.currentTarget.style.border =
                                  "1px solid #e2e8f0";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (
                                deliveryFormData.customer_id !== customer.id
                              ) {
                                e.currentTarget.style.background = "white";
                                e.currentTarget.style.border =
                                  deliveryFormData.customer_id === customer.id
                                    ? "1px solid #3b82f6"
                                    : "none";
                              }
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                fontSize: "14px",
                                color: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {customer.name}
                              {deliveryFormData.customer_id === customer.id && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    background: "#10b981",
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  ✅ TERPILIH
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                marginTop: "2px",
                              }}
                            >
                              {customer.address}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                marginTop: "2px",
                              }}
                            >
                              📞 {customer.phone}
                              {customer.delivery_fee > 0 && (
                                <span style={{ marginLeft: "12px" }}>
                                  💰 Rp {customer.delivery_fee.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Case 2: Tidak ada hasil */}
                    {searchResults.length === 0 &&
                      customerSearch &&
                      !deliveryFormData.customer_id && (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "30px 20px",
                            color: "#64748b",
                          }}
                        >
                          <div
                            style={{ fontSize: "32px", marginBottom: "12px" }}
                          >
                            🔍
                          </div>
                          <div
                            style={{
                              fontWeight: "500",
                              marginBottom: "8px",
                              color: "#374151",
                            }}
                          >
                            Tidak ada customer yang cocok
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              marginBottom: "16px",
                              lineHeight: "1.4",
                            }}
                          >
                            Tidak ditemukan customer dengan kata kunci:
                            <br />
                            <strong>"{customerSearch}"</strong>
                          </div>

                          {/* Action Buttons */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomerForm(true);
                                setEditingCustomer({
                                  name: customerSearch,
                                  phone: "",
                                  address: "",
                                  lat: "",
                                  lng: "",
                                  distance_km: "",
                                  delivery_fee: "",
                                });
                              }}
                              style={{
                                padding: "10px 16px",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              ➕ Buat Customer Baru: "{customerSearch}"
                            </button>

                            <button
                              type="button"
                              onClick={resetSearch}
                              style={{
                                padding: "8px 16px",
                                background: "transparent",
                                color: "#64748b",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              🔄 Reset Pencarian
                            </button>
                          </div>

                          {/* Search Tips */}
                          <div
                            style={{
                              marginTop: "16px",
                              fontSize: "11px",
                              color: "#94a3b8",
                              padding: "8px",
                              background: "#f8fafc",
                              borderRadius: "4px",
                            }}
                          >
                            💡 Tips: Cari dengan nama lengkap, nomor HP, atau
                            bagian alamat
                          </div>
                        </div>
                      )}

                    {/* Case 3: Error */}
                    {searchError && (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          background: "#fef2f2",
                          color: "#dc2626",
                          borderRadius: "4px",
                          margin: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            marginBottom: "4px",
                          }}
                        >
                          ⚠️ Error
                        </div>
                        <div style={{ fontSize: "12px" }}>{searchError}</div>
                        <button
                          onClick={() => setSearchError("")}
                          style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            background: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          Tutup
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Customer Info */}
                {deliveryFormData.customer_id && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "#f0f9ff",
                      borderRadius: "8px",
                      border: "1px solid #bae6fd",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#0369a1",
                          }}
                        >
                          ✅ Customer Terpilih
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                          }}
                        >
                          {searchResults.find(
                            (c) => c.id === deliveryFormData.customer_id
                          )?.name || "Customer tidak ditemukan"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryFormData((prev) => ({
                            ...prev,
                            customer_id: "",
                          }));
                          resetSearch();
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        ✕ Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Courier Select */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Pilih Kurir (Opsional)
                </label>
                <select
                  value={deliveryFormData.courier_id}
                  onChange={(e) =>
                    setDeliveryFormData((prev) => ({
                      ...prev,
                      courier_id: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    background: "white",
                  }}
                >
                  <option value="">Pilih Kurir</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name} {courier.is_available ? "✅" : "❌"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Catatan (Opsional)
                </label>
                <textarea
                  name="notes"
                  value={deliveryFormData.notes}
                  onChange={(e) =>
                    setDeliveryFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows="3"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
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
                  placeholder="Tambahkan catatan khusus..."
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCustomerSearch("");
                    setDeliveryFormData({
                      customer_id: "",
                      courier_id: "",
                      notes: "",
                    });
                  }}
                  style={{
                    padding: "12px 20px",
                    background: "white",
                    color: "#64748b",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "12px 20px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Buat Pengiriman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Form */}
      {showCustomerForm && (
        <QuickCustomerForm
          onSave={handleSaveCustomer}
          onCancel={() => {
            setShowCustomerForm(false);
            setEditingCustomer(null);
          }}
          initialData={editingCustomer}
          currentUserRole={currentUser.role}
        />
      )}

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

export default Deliveries;







