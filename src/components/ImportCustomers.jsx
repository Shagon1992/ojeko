import React, { useState, useEffect, lazy, Suspense } from "react";
import "leaflet/dist/leaflet.css";

// Fix untuk marker icon
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Dynamic imports untuk komponen Leaflet
const MapContainer = lazy(() => import("react-leaflet").then(mod => ({ default: mod.MapContainer })));
const TileLayer = lazy(() => import("react-leaflet").then(mod => ({ default: mod.TileLayer })));
const Marker = lazy(() => import("react-leaflet").then(mod => ({ default: mod.Marker })));
const useMapEvents = lazy(() => import("react-leaflet").then(mod => ({ default: mod.useMapEvents })));

// Komponen handler untuk map events
const MapClickHandler = ({ onPositionChange }) => {
  const MapEvents = () => {
    const mapEvents = useMapEvents({
      click: (e) => {
        onPositionChange([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  };

  return (
    <Suspense fallback={null}>
      <MapEvents />
    </Suspense>
  );
};

const MapPickerModal = ({ onCoordinateSelect, onClose }) => {
  const [position, setPosition] = useState([-8.0989, 112.1684]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Pastikan hanya render di client
  useEffect(() => {
    setIsClient(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setIsLoading(false);
        },
        (error) => {
          console.log("Geolocation failed, using default location");
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

  // Custom marker icon
  const createCustomIcon = () => {
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

  // Render map hanya di client
  const renderMap = () => {
    if (!isClient || isLoading) {
      return (
        <div style={{
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8fafc",
        }}>
          Memuat peta...
        </div>
      );
    }

    return (
      <Suspense fallback={
        <div style={{
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8fafc",
        }}>
          Memuat komponen peta...
        </div>
      }>
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClickHandler onPositionChange={setPosition} />
          <Marker position={position} icon={createCustomIcon()} />
        </MapContainer>
      </Suspense>
    );
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
          {renderMap()}
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

        <div
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          💡 Klik di map untuk pindah lokasi • Titik merah menunjukkan posisi terpilih
        </div>
      </div>
    </div>
  );
};

export default MapPickerModal;
