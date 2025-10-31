import React, { useState, useEffect } from "react";
import MapPickerModal from "./MapPickerModal";

// Koordinat RS Aminah Blitar
const RS_AMINAH_COORDINATES = {
  lat: -8.101618,
  lng: 112.1687995,
};

const CustomerFormModal = ({
  editingCustomer,
  onSave,
  onClose,
  currentUserRole,
  isRequiredForCompletion = false,
}) => {
  const [formData, setFormData] = useState({
    name: editingCustomer?.name || "",
    address: editingCustomer?.address || "",
    phone: editingCustomer?.phone || "",
    lat: editingCustomer?.lat ? editingCustomer.lat.toString() : "",
    lng: editingCustomer?.lng ? editingCustomer.lng.toString() : "",
    distance_km: editingCustomer?.distance_km
      ? editingCustomer.distance_km.toString()
      : "",
    delivery_fee: editingCustomer?.delivery_fee
      ? editingCustomer.delivery_fee.toString()
      : "",
  });

  const [showMapModal, setShowMapModal] = useState(false);

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let cleanedValue = value;

    if (name === "distance_km") {
      cleanedValue = value.replace(",", ".").replace(/[^\d.]/g, "");
    } else if (name === "delivery_fee") {
      cleanedValue = value.replace(/\./g, "").replace(",", ".");
    }

    setFormData((prev) => ({ ...prev, [name]: cleanedValue }));
  };

  // Function untuk handle coordinate selection from map
  const handleCoordinateSelect = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      lat: lat.toString(),
      lng: lng.toString(),
    }));
  };

  // 🔥 FUNGSI BARU: Buka Google Maps Direction
  const handleOpenGoogleMapsDirection = () => {
    if (!formData.lat || !formData.lng) {
      alert("❌ Harap isi koordinat latitude dan longitude terlebih dahulu!");
      return;
    }

    const customerLat = parseFloat(formData.lat);
    const customerLng = parseFloat(formData.lng);

    if (isNaN(customerLat) || isNaN(customerLng)) {
      alert("❌ Format koordinat tidak valid!");
      return;
    }

    // Format URL Google Maps Direction
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${RS_AMINAH_COORDINATES.lat},${RS_AMINAH_COORDINATES.lng}&destination=${customerLat},${customerLng}&travelmode=driving`;

    window.open(mapsUrl, "_blank");
  };

  // Calculate delivery fee dari jarak
  const calculateDeliveryFeeFromDistance = () => {
    if (!formData.distance_km) {
      alert("Masukkan jarak terlebih dahulu!");
      return;
    }

    const distance = parseFloat(formData.distance_km.replace(",", "."));
    if (isNaN(distance)) {
      alert(
        "Format jarak tidak valid! Gunakan angka dengan titik atau koma.\nContoh: 5.2 atau 5,2"
      );
      return;
    }

    const rawFee = distance * 2500 + 1000;
    const roundedFee = Math.ceil(rawFee / 500) * 500;

    setFormData((prev) => ({ ...prev, delivery_fee: roundedFee.toString() }));
    alert(`💰 Ongkos Kirim: Rp ${roundedFee.toLocaleString()}`);
  };

  // Calculate distance dari ongkir
  const calculateDistanceFromDeliveryFee = () => {
    if (!formData.delivery_fee) {
      alert("Masukkan ongkir terlebih dahulu!");
      return;
    }

    const deliveryFee = parseFloat(
      formData.delivery_fee.replace(/\./g, "").replace(",", ".")
    );
    if (isNaN(deliveryFee)) {
      alert(
        "Format ongkir tidak valid! Gunakan angka.\nContoh: 15000 atau 15.000"
      );
      return;
    }

    if (deliveryFee < 1000) {
      alert("Ongkir minimal Rp 1.000!");
      return;
    }

    const distance = (deliveryFee - 1000) / 2500;
    const roundedDistance = Math.round(distance * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      distance_km: roundedDistance.toString(),
    }));
    alert(`📏 Jarak: ${roundedDistance} km`);
  };

  // Handle submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.name?.trim() ||
      !formData.address?.trim() ||
      !formData.phone?.trim()
    ) {
      alert("Nama, Alamat, dan No HP harus diisi!");
      return;
    }

    // 🔥 VALIDASI ROLE-SPECIFIC untuk completion
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
        background: "rgba(0,0,0,0.8)",
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
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            color: "#1e293b",
            fontSize: "20px",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {editingCustomer
            ? "✏️ Edit Data Pelanggan"
            : "➕ Tambah Pelanggan Baru"}
          {isRequiredForCompletion && (
            <div
              style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}
            >
              ⚠️ Wajib lengkapi semua data untuk menyelesaikan pengiriman
            </div>
          )}
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
                Nama Pelanggan *
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
                placeholder="Masukkan nama pelanggan"
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
                placeholder="Contoh: 08123456789"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              Alamat *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                minHeight: "80px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Masukkan alamat lengkap"
              required
            />
          </div>

          {/* Koordinat di bawah alamat */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "13px",
                    }}
                  >
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    value={formData.lat}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    placeholder="-8.0989"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "13px",
                    }}
                  >
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lng"
                    value={formData.lng}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    placeholder="112.1684"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                style={{
                  padding: "10px 16px",
                  background: "#4299e1",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  height: "fit-content",
                }}
              >
                🗺️ Ambil Koordinat
              </button>
            </div>

            {/* 🔥 TOMBOL BARU: Cek Jarak di Google Maps */}
            {(formData.lat || formData.lng) && (
              <div style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={handleOpenGoogleMapsDirection}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "#2563eb";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "#3b82f6";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  🗺️ Cek Jarak di Google Maps
                </button>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    textAlign: "center",
                    marginTop: "6px",
                  }}
                >
                  Akan membuka Google Maps dengan rute dari RS Aminah Blitar
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "13px",
                }}
              >
                Jarak (KM)
                {isRequiredForCompletion && (
                  <span style={{ color: "#ef4444" }}> *</span>
                )}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number"
                  step="0.1"
                  name="distance_km"
                  value={formData.distance_km}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="0"
                  required={isRequiredForCompletion}
                />
                <button
                  type="button"
                  onClick={calculateDeliveryFeeFromDistance}
                  style={{
                    padding: "10px 12px",
                    background: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "500",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  🧮 Hitung Ongkir
                </button>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "13px",
                }}
              >
                Ongkir (Rp)
                {isRequiredForCompletion && (
                  <span style={{ color: "#ef4444" }}> *</span>
                )}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  name="delivery_fee"
                  value={formData.delivery_fee}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="0"
                  required={isRequiredForCompletion}
                />
                <button
                  type="button"
                  onClick={calculateDistanceFromDeliveryFee}
                  style={{
                    padding: "10px 12px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "500",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  📏 Hitung Jarak
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="submit"
              style={{
                padding: "12px 20px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                flex: 1,
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 6px 15px rgba(16, 185, 129, 0.3)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              {editingCustomer ? "Update Data" : "Simpan Pelanggan"}
            </button>

            <button
              type="button"
              onClick={onClose}
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
                flex: 1,
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

          {/* Info rumus */}
          <div
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              background: "#f0f9ff",
              borderRadius: "6px",
              border: "1px solid #bae6fd",
              fontSize: "11px",
              color: "#0369a1",
            }}
          >
            💡 <strong>Rumus Ongkir:</strong> (Jarak × 2,500) + 1,000 (admin)
            <br />
            💰 <strong>Pembulatan:</strong> Ke atas ke kelipatan 500 terdekat
            <br />
            📏 <strong>Rumus Jarak:</strong> (Ongkir - 1,000) ÷ 2,500
            <br />
            🗺️ <strong>Cek Jarak:</strong> Buka Google Maps untuk lihat rute
            aktual
          </div>
        </form>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <MapPickerModal
          onCoordinateSelect={handleCoordinateSelect}
          onClose={() => setShowMapModal(false)}
          existingLat={formData.lat}
          existingLng={formData.lng}
        />
      )}
    </div>
  );
};

export default CustomerFormModal;
