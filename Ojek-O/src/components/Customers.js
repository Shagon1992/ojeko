import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "leaflet/dist/leaflet.css";
import { createDelivery } from "../lib/deliveries";

// Customer Card Component - DENGAN TOMBOL BUAT ORDERAN
const CustomerCard = ({
  customer,
  onEdit,
  onDelete,
  isExpanded,
  onExpand,
  onCreateDelivery,
}) => {
  const openInGoogleMaps = (e) => {
    e.stopPropagation();
    if (customer.lat && customer.lng) {
      const mapsUrl = `https://www.google.com/maps?q=${customer.lat},${customer.lng}`;
      window.open(mapsUrl, "_blank");
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        background: "white",
        marginBottom: "4px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onClick={() => onExpand(customer.id)}
        style={{
          padding: "10px 12px",
          background: isExpanded ? "#f8fafc" : "white",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ fontSize: "12px", color: "#667eea", marginTop: "1px" }}>
            {isExpanded ? "➖" : "➕"}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#1e293b",
                marginBottom: "2px",
                textAlign: "left",
              }}
            >
              {customer.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "2px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                📞 {customer.phone}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#059669",
                  fontWeight: "600",
                }}
              >
                💰{" "}
                {customer.delivery_fee
                  ? `Rp ${customer.delivery_fee.toLocaleString()}`
                  : "Rp 0"}
              </div>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                textAlign: "left",
                display: "-webkit-box",
                WebkitLineClamp: isExpanded ? "none" : 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              📍 {customer.address}
            </div>
          </div>

          {customer.lat && customer.lng && (
            <button
              onClick={openInGoogleMaps}
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
                marginLeft: "8px",
                flexShrink: 0,
              }}
              onMouseOver={(e) => {
                e.target.style.background = "#059669";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "#10b981";
                e.target.style.transform = "translateY(0)";
              }}
            >
              🗺️ Lihat Map
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            padding: "8px 12px 12px 32px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            {customer.distance_km && (
              <div style={{ marginBottom: "4px" }}>
                <strong>📏 Jarak:</strong> {customer.distance_km} km
              </div>
            )}
            {customer.lat && customer.lng && (
              <div>
                <strong>🗺️ Koordinat:</strong> {customer.lat}, {customer.lng}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {/* 🔥 TOMBOL BARU: BUAT ORDERAN */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateDelivery(customer);
              }}
              style={{
                padding: "6px 10px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "500",
                cursor: "pointer",
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                justifyContent: "center",
                minWidth: "100px",
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.3)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              📦 Buat Orderan
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(customer);
              }}
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
                display: "flex",
                alignItems: "center",
                gap: "4px",
                justifyContent: "center",
                minWidth: "80px",
              }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(customer.id);
              }}
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
                display: "flex",
                alignItems: "center",
                gap: "4px",
                justifyContent: "center",
                minWidth: "80px",
              }}
            >
              🗑️ Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// MapPickerModal Component - Sederhana untuk ambil koordinat saja
const MapPickerModal = ({ onCoordinateSelect, onClose }) => {
  const [position, setPosition] = useState([-8.0989, 112.1684]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setIsLoading(false);
        },
        (error) => {
          console.log("Geolocation failed, using default Blitar location");
          setIsLoading(false);
        },
        { timeout: 5000 }
      );
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleConfirm = () => {
    onCoordinateSelect(position[0].toFixed(6), position[1].toFixed(6));
    onClose();
  };

  const handleManualInput = () => {
    const lat = prompt(
      "Masukkan Latitude (contoh: -8.0989):",
      position[0].toFixed(6)
    );
    const lng = prompt(
      "Masukkan Longitude (contoh: 112.1684):",
      position[1].toFixed(6)
    );
    if (lat && lng) {
      setPosition([parseFloat(lat), parseFloat(lng)]);
    }
  };

  // Custom marker icon
  const createCustomIcon = () => {
    const L = require("leaflet");
    return L.divIcon({
      html: `
        <div style="
          background: #dc2626;
          width: 20px;
          height: 20px;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      className: "custom-marker",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const renderMap = () => {
    try {
      const {
        MapContainer,
        TileLayer,
        Marker,
        useMapEvents,
      } = require("react-leaflet");
      const L = require("leaflet");

      // Fix untuk marker default leaflet
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      const MapClickHandler = ({ onPositionChange }) => {
        useMapEvents({
          click: (e) => {
            onPositionChange([e.latlng.lat, e.latlng.lng]);
          },
        });
        return null;
      };

      return (
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClickHandler onPositionChange={setPosition} />
          <Marker position={position} icon={createCustomIcon()} />
        </MapContainer>
      );
    } catch (error) {
      console.error("Map error:", error);
      setMapError(true);
      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#f1f5f9",
            color: "#64748b",
            textAlign: "center",
            padding: "20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🗺️</div>
          <div style={{ fontWeight: "600", marginBottom: "8px" }}>
            Map Tidak Dapat Dimuat
          </div>
          <div style={{ fontSize: "14px", marginBottom: "16px" }}>
            Package Leaflet belum terinstall sepenuhnya.
            <br />
            Coba refresh halaman.
          </div>
          <button
            onClick={handleManualInput}
            style={{
              padding: "10px 16px",
              background: "#4299e1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            ✏️ Input Koordinat Manual
          </button>
        </div>
      );
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
        background: "rgba(0, 0, 0, 0.8)",
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
          borderRadius: "12px",
          padding: "20px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", color: "#1e293b" }}>
          🗺️ Pilih Lokasi di Map
        </h3>
        <div
          style={{
            height: "300px",
            width: "100%",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "16px",
            border: "2px solid #e2e8f0",
          }}
        >
          {isLoading ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              Memuat peta...
            </div>
          ) : (
            renderMap()
          )}
        </div>
        <div
          style={{
            background: "#f8fafc",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
            color: "#64748b",
          }}
        >
          <strong>Koordinat Terpilih:</strong>
          <br />
          Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
        </div>
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
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
            onClick={handleConfirm}
            style={{
              padding: "10px 20px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Ambil Koordinat
          </button>
        </div>
        {!mapError && (
          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            💡 Klik di map untuk pindah lokasi • Titik merah menunjukkan posisi
            terpilih
          </div>
        )}
      </div>
    </div>
  );
};

// Pagination Component - DIPERBAIKI
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}) => {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "16px",
        padding: "16px",
        background: "white",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Info Items */}
      <div style={{ fontSize: "14px", color: "#64748b" }}>
        Menampilkan{" "}
        <strong>
          {startItem}-{endItem}
        </strong>{" "}
        dari <strong>{totalItems.toLocaleString()}</strong> pelanggan
      </div>

      {/* Navigation Buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{
            padding: "8px 12px",
            background: currentPage === 1 ? "#f1f5f9" : "white",
            color: currentPage === 1 ? "#94a3b8" : "#374151",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "500",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 ? 0.6 : 1,
          }}
        >
          ⏮️ First
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "8px 12px",
            background: currentPage === 1 ? "#f1f5f9" : "white",
            color: currentPage === 1 ? "#94a3b8" : "#374151",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "500",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 ? 0.6 : 1,
          }}
        >
          ◀️ Prev
        </button>

        {/* Page Numbers */}
        {startPage > 1 && (
          <span
            style={{ padding: "0 8px", color: "#94a3b8", fontSize: "12px" }}
          >
            ...
          </span>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              padding: "8px 12px",
              background: currentPage === page ? "#667eea" : "white",
              color: currentPage === page ? "white" : "#374151",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              minWidth: "40px",
            }}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <span
            style={{ padding: "0 8px", color: "#94a3b8", fontSize: "12px" }}
          >
            ...
          </span>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: "8px 12px",
            background: currentPage === totalPages ? "#f1f5f9" : "white",
            color: currentPage === totalPages ? "#94a3b8" : "#374151",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "500",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            opacity: currentPage === totalPages ? 0.6 : 1,
          }}
        >
          Next ▶️
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            padding: "8px 12px",
            background: currentPage === totalPages ? "#f1f5f9" : "white",
            color: currentPage === totalPages ? "#94a3b8" : "#374151",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "500",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            opacity: currentPage === totalPages ? 0.6 : 1,
          }}
        >
          Last ⏭️
        </button>
      </div>

      {/* Items Per Page Selector - DIPERBAIKI */}
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
          value={itemsPerPage === "all" ? "all" : itemsPerPage}
          onChange={(e) => {
            const value = e.target.value;
            onPageChange(1, value === "all" ? "all" : parseInt(value));
          }}
          style={{
            padding: "6px 8px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="all">All</option>
        </select>
      </div>
    </div>
  );
};

// 🔥 MODAL BARU: Create Delivery dari Customer
const CreateDeliveryModal = ({ customer, couriers, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    courier_id: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customer?.id) {
      alert("Customer tidak valid!");
      return;
    }

    setLoading(true);
    try {
      const data = await createDelivery({
        customer_id: customer.id,
        courier_id: formData.courier_id || null,
        notes: formData.notes,
      });

      alert(`✅ Orderan berhasil dibuat untuk ${customer.name}!`);
      onSuccess();
    } catch (error) {
      alert("Error membuat orderan: " + error.message);
    } finally {
      setLoading(false);
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
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", color: "#1e293b" }}>
          📦 Buat Orderan Baru
        </h3>

        {/* Customer Info */}
        <div
          style={{
            background: "#f0f9ff",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            border: "1px solid #bae6fd",
          }}
        >
          <div
            style={{ fontSize: "14px", fontWeight: "600", color: "#0369a1" }}
          >
            🏠 Customer Terpilih
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            <strong>{customer.name}</strong>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            📞 {customer.phone}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            📍 {customer.address}
          </div>
          {customer.delivery_fee > 0 && (
            <div
              style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}
            >
              💰 Ongkir: Rp {customer.delivery_fee.toLocaleString()}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Courier Select */}
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
              Pilih Kurir (Opsional)
            </label>
            <select
              value={formData.courier_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, courier_id: e.target.value }))
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
              <option value="">Pilih Kurir (Bisa kosong)</option>
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
                color: "#374151",
                fontSize: "14px",
              }}
            >
              Catatan (Opsional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
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
              placeholder="Tambahkan catatan khusus untuk orderan ini..."
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
              onClick={onClose}
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
              disabled={loading}
              style={{
                padding: "12px 20px",
                background: loading ? "#94a3b8" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Membuat..." : "✅ Buat Orderan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Customers Component
const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  // 🔥 STATE BARU UNTUK CREATE DELIVERY
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [couriers, setCouriers] = useState([]);

  // STATE PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // STATE UNTUK SEARCH - DIPERBAIKI (HILANGKAN DUPLICATE)
  const [searchInput, setSearchInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    lat: "",
    lng: "",
    distance_km: "",
    delivery_fee: "",
  });

  // 🔥 FUNGSI BARU: Handle search input dengan debounce
  const handleSearchInput = (value) => {
    setSearchInput(value);
    setSearchLoading(true);

    // Clear timeout sebelumnya
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Jika input kosong, reset search
    if (!value.trim()) {
      setSearchLoading(false);
      fetchCustomers(1, itemsPerPage); // Load data normal
      return;
    }

    // Set timeout untuk debounce 300ms
    const newTimeout = setTimeout(async () => {
      try {
        await performSearch(value.trim());
      } catch (error) {
        console.error("Search error:", error);
        alert("Error saat mencari customer");
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    setSearchTimeout(newTimeout);
  };

  // 🔥 FUNGSI BARU: Perform search ke database
  const performSearch = async (searchTerm, page = 1, limit = itemsPerPage) => {
    try {
      let data, count;

      if (limit === "all") {
        // Search semua data tanpa pagination
        const result = await supabase
          .from("customers")
          .select("*")
          .or(
            `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`
          )
          .order("created_at", { ascending: false });

        data = result.data;
        count = result.data?.length || 0;
      } else {
        // Search dengan pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const result = await supabase
          .from("customers")
          .select("*", { count: "exact" })
          .or(
            `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        data = result.data;
        count = result.count;
      }

      if (data) {
        setCustomers(data);
        setFilteredCustomers(data);
        setTotalCount(count || 0);
        setCurrentPage(page);

        if (limit === "all") {
          setTotalPages(1);
        } else {
          setTotalPages(Math.ceil((count || 0) / limit));
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  };

  // 🔥 FUNGSI BARU: Clear search
  const clearSearch = () => {
    setSearchInput("");
    setSearchLoading(false);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    fetchCustomers(1, itemsPerPage);
  };

  // Fetch data customers dengan PAGINATION
  const fetchCustomers = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);

      let data, error, count;

      if (limit === "all") {
        // Jika memilih "All", ambil semua data tanpa pagination
        const result = await supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false });

        data = result.data;
        error = result.error;
        count = result.data?.length || 0;
      } else {
        // Pagination normal
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const result = await supabase
          .from("customers")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        data = result.data;
        error = result.error;
        count = result.count;
      }

      if (error) throw error;

      setCustomers(data || []);
      setFilteredCustomers(data || []);
      setTotalCount(count || 0);

      if (limit === "all") {
        setTotalPages(1);
      } else {
        setTotalPages(Math.ceil((count || 0) / limit));
      }

      setCurrentPage(page);
    } catch (error) {
      alert("Error fetching customers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNGSI BARU: Fetch couriers untuk dropdown
  const fetchCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from("couriers")
        .select("*")
        .order("name");

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error("Error fetching couriers:", error);
    }
  };

  // Fetch data saat component mount
  useEffect(() => {
    fetchCustomers(1, itemsPerPage);
    fetchCouriers(); // 🔥 FETCH COURIERS JUGA
  }, [itemsPerPage]);

  // 🔥 FUNGSI BARU: Handle buat orderan
  const handleCreateDelivery = (customer) => {
    setSelectedCustomer(customer);
    setShowDeliveryModal(true);
  };

  // 🔥 FUNGSI BARU: Setelah berhasil buat orderan
  const handleDeliverySuccess = () => {
    setShowDeliveryModal(false);
    setSelectedCustomer(null);

    // User mau tetap di customers, refresh data saja
    fetchCustomers(currentPage, itemsPerPage);
  };

  // Handle page change
  const handlePageChange = (newPage, newItemsPerPage = itemsPerPage) => {
    if (newItemsPerPage !== itemsPerPage) {
      setItemsPerPage(newItemsPerPage);
      if (searchInput.trim()) {
        performSearch(searchInput.trim(), 1, newItemsPerPage);
      } else {
        fetchCustomers(1, newItemsPerPage);
      }
    } else if (searchInput.trim()) {
      performSearch(searchInput.trim(), newPage, newItemsPerPage);
    } else {
      fetchCustomers(newPage, newItemsPerPage);
    }
  };

  // Function untuk handle expand/collapse
  const handleExpandCustomer = (customerId) => {
    setExpandedCustomerId(
      expandedCustomerId === customerId ? null : customerId
    );
  };

  // Function untuk handle coordinate selection from map
  const handleCoordinateSelect = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      lat: lat.toString(),
      lng: lng.toString(),
    }));
  };

  // Calculate delivery fee dari jarak: (Jarak * 2500) + 1000, dibulatkan ke 500
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

  // Calculate distance dari ongkir: (Ongkir - 1000) / 2500
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
    const roundedDistance = Math.round(distance * 100) / 100; // Bulatkan ke 2 desimal

    setFormData((prev) => ({
      ...prev,
      distance_km: roundedDistance.toString(),
    }));
    alert(`📏 Jarak: ${roundedDistance} km`);
  };

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

  // Submit form dengan default values
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name?.trim() ||
      !formData.address?.trim() ||
      !formData.phone?.trim()
    ) {
      alert("Nama, Alamat, dan No HP harus diisi!");
      return;
    }

    try {
      const customerData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        distance_km: formData.distance_km
          ? parseFloat(formData.distance_km)
          : 0,
        delivery_fee: formData.delivery_fee
          ? parseInt(formData.delivery_fee.replace(/\./g, ""))
          : 0,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id);
        if (error) throw error;
        alert("Data pelanggan berhasil diupdate!");
      } else {
        const { error } = await supabase
          .from("customers")
          .insert([customerData]);
        if (error) throw error;
        alert("Data pelanggan berhasil ditambahkan!");
      }

      resetForm();
      fetchCustomers(currentPage, itemsPerPage);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Edit customer - DIPERBAIKI untuk format ongkir
  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      address: customer.address || "",
      phone: customer.phone || "",
      lat: customer.lat ? customer.lat.toString() : "",
      lng: customer.lng ? customer.lng.toString() : "",
      distance_km: customer.distance_km ? customer.distance_km.toString() : "",
      delivery_fee: customer.delivery_fee
        ? customer.delivery_fee.toString()
        : "",
    });
    setShowForm(true);
  };

  // Delete customer
  const handleDelete = async (id) => {
    if (!confirm("Apakah yakin ingin menghapus data pelanggan ini?")) return;

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      alert("Data pelanggan berhasil dihapus!");
      fetchCustomers(currentPage, itemsPerPage);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      lat: "",
      lng: "",
      distance_km: "",
      delivery_fee: "",
    });
    setEditingCustomer(null);
    setShowForm(false);
    setExpandedCustomerId(null);
  };

  // 🔥 CLEANUP: Clear timeout saat component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Reset expanded saat search
  useEffect(() => {
    if (searchInput) {
      setExpandedCustomerId(null);
    }
  }, [searchInput]);

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
          Memuat data pelanggan...
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
              👥 Management Pelanggan
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Kelola data pelanggan dan alamat pengiriman
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
            Tambah Pelanggan
          </button>
        </div>

        {/* Search Bar - SUDAH BENAR */}
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
                placeholder="🔍 Cari pelanggan berdasarkan nama, alamat, atau no HP..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
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
              {searchInput
                ? `${filteredCustomers.length} hasil`
                : `${totalCount.toLocaleString()} pelanggan`}
            </div>
          </div>

          {/* Loading indicator khusus search */}
          {searchLoading && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#667eea",
                display: "flex",
                alignItems: "center",
                gap: "8px",
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
              🔍 Mencari...
            </div>
          )}
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
              {editingCustomer
                ? "✏️ Edit Data Pelanggan"
                : "➕ Tambah Pelanggan Baru"}
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
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
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
                  onFocus={(e) => {
                    e.target.style.borderColor = "#667eea";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
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
                  {editingCustomer ? "Update Data" : "Simpan Pelanggan"}
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
                💡 <strong>Rumus Ongkir:</strong> (Jarak × 2,500) + 1,000
                (admin)
                <br />
                💰 <strong>Pembulatan:</strong> Ke atas ke kelipatan 500
                terdekat
                <br />
                📏 <strong>Rumus Jarak:</strong> (Ongkir - 1,000) ÷ 2,500
              </div>
            </form>
          </div>
        )}

        {/* Customers List */}
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
              📋 Daftar Pelanggan{" "}
              {searchInput && `(Hasil Pencarian: ${filteredCustomers.length})`}
            </h3>

            {searchInput && (
              <button
                onClick={clearSearch}
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
                Clear Pencarian
              </button>
            )}
          </div>

          {filteredCustomers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#9ca3af",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>👥</div>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#6b7280",
                }}
              >
                {searchInput
                  ? "Pelanggan tidak ditemukan"
                  : "Belum ada data pelanggan"}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                {searchInput
                  ? "Coba kata kunci lain"
                  : 'Klik "Tambah Pelanggan" untuk menambahkan'}
              </p>
            </div>
          ) : (
            <div>
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isExpanded={expandedCustomerId === customer.id}
                  onExpand={handleExpandCustomer}
                  onCreateDelivery={handleCreateDelivery}
                />
              ))}
            </div>
          )}

          {/* PAGINATION COMPONENT */}
          {(totalPages > 1 || searchInput || itemsPerPage !== "all") && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={searchInput ? filteredCustomers.length : totalCount}
              itemsPerPage={itemsPerPage}
            />
          )}
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <MapPickerModal
          onCoordinateSelect={handleCoordinateSelect}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* 🔥 MODAL BARU: Create Delivery */}
      {showDeliveryModal && selectedCustomer && (
        <CreateDeliveryModal
          customer={selectedCustomer}
          couriers={couriers}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleDeliverySuccess}
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

export default Customers;
