import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icon
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom icon untuk marker
const createCustomIcon = () => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="#DC2626" stroke="#FFFFFF" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.5 12.5 41 12.5 41S25 21.5 25 12.5C25 5.6 19.4 0 12.5 0Z"/>
        <circle cx="12.5" cy="12.5" r="5" fill="#FFFFFF"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

// Komponen untuk auto-center map ke posisi user
function MapCenterUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.setView(position, 15);
    }
  }, [position, map]);

  return null;
}

function MapClickHandler({ onPositionChange }) {
  useMapEvents({
    click: (e) => {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

const MapPickerModal = ({ onCoordinateSelect, onClose }) => {
  const [position, setPosition] = useState([-8.0989, 112.1684]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);

  // Fungsi untuk mendapatkan lokasi user
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation tidak didukung di browser ini"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (error) => {
          let errorMessage = "Gagal mendapatkan lokasi";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Izin lokasi ditolak. Izinkan akses lokasi di browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia.";
              break;
            case error.TIMEOUT:
              errorMessage = "Request lokasi timeout.";
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Auto-detect lokasi saat modal terbuka
  useEffect(() => {
    detectUserLocation();
  }, []);

  const detectUserLocation = async () => {
    try {
      setIsLoading(true);
      const location = await getCurrentLocation();

      setUserLocation(location);
      setLocationAccuracy(location.accuracy);
      setPosition([location.lat, location.lng]);

      console.log("Lokasi user ditemukan:", location);
    } catch (error) {
      console.log("Gagal dapat lokasi, pakai default:", error.message);
      // Tetap pakai default position
      setUserLocation(null);
      setLocationAccuracy(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshLocation = async () => {
    try {
      setIsLoading(true);
      const location = await getCurrentLocation();

      setUserLocation(location);
      setLocationAccuracy(location.accuracy);
      setPosition([location.lat, location.lng]);

      // Beri feedback ke user
      if (location.accuracy > 100) {
        alert(
          `📍 Lokasi ditemukan (akurasi ±${Math.round(
            location.accuracy
          )}m). \nGeser marker jika kurang akurat.`
        );
      }
    } catch (error) {
      alert("❌ Gagal refresh lokasi: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderMap = () => {
    try {
      return (
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <MapCenterUpdater position={position} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClickHandler onPositionChange={setPosition} />
          <Marker position={position} icon={createCustomIcon()}>
            <Popup>
              📍 Lokasi Terpilih
              <br />
              Lat: {position[0].toFixed(6)}
              <br />
              Lng: {position[1].toFixed(6)}
              {locationAccuracy && (
                <>
                  <br />
                  Akurasi: ±{Math.round(locationAccuracy)}m
                </>
              )}
            </Popup>
          </Marker>
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
            Error: {error.message}
            <br />
            Pastikan package react-leaflet terinstall dengan benar.
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

        {/* Info Akurasi Lokasi */}
        {locationAccuracy && (
          <div
            style={{
              background: locationAccuracy > 100 ? "#fef3c7" : "#d1fae5",
              padding: "8px 12px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "12px",
              border: `1px solid ${
                locationAccuracy > 100 ? "#f59e0b" : "#10b981"
              }`,
              color: locationAccuracy > 100 ? "#92400e" : "#065f46",
            }}
          >
            {locationAccuracy > 100 ? (
              <>
                ⚠️ <strong>Akurasi Sedang:</strong> ±
                {Math.round(locationAccuracy)} meter
                <br />
                <span style={{ fontSize: "11px" }}>
                  Geser marker untuk posisi yang lebih akurat
                </span>
              </>
            ) : (
              <>
                ✅ <strong>Akurasi Baik:</strong> ±
                {Math.round(locationAccuracy)} meter
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleRefreshLocation}
            disabled={isLoading}
            style={{
              padding: "8px 12px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {isLoading ? (
              <>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    border: "2px solid transparent",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                Mendeteksi...
              </>
            ) : (
              <>🔄 Refresh Lokasi Saya</>
            )}
          </button>

          <button
            onClick={handleManualInput}
            style={{
              padding: "8px 12px",
              background: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            ✏️ Input Manual
          </button>
        </div>

        {/* Map Container */}
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
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "3px solid #e2e8f0",
                  borderTop: "3px solid #667eea",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              ></div>
              <div style={{ color: "#64748b", fontSize: "14px" }}>
                Mendeteksi lokasi Anda...
              </div>
            </div>
          ) : (
            renderMap()
          )}
        </div>

        {/* Koordinat Terpilih */}
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
          <strong>📍 Koordinat Terpilih:</strong>
          <br />
          Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
        </div>

        {/* Action Buttons */}
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
            ✅ Ambil Koordinat
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
            💡 Klik di map untuk pindah lokasi • Drag marker untuk posisi akurat
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

export default MapPickerModal;
