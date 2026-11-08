import React, { useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "../lib/supabase";
import MapPickerModal from "./MapPickerModal";

const RS_AMINAH_COORDINATES = { lat: -8.101618, lng: 112.1687995 };

const CustomerFormModal = ({ editingCustomer, onSave, onClose, currentUserRole, isRequiredForCompletion = false }) => {
  const [formData, setFormData] = useState({
    name: editingCustomer?.name || "",
    address: editingCustomer?.address || "",
    phone: editingCustomer?.phone || "",
    lat: editingCustomer?.lat ? editingCustomer.lat.toString() : "",
    lng: editingCustomer?.lng ? editingCustomer.lng.toString() : "",
    distance_km: editingCustomer?.distance_km ? editingCustomer.distance_km.toString() : "",
    delivery_fee: editingCustomer?.delivery_fee ? editingCustomer.delivery_fee.toString() : "",
    house_photo_url: editingCustomer?.house_photo_url || "",
  });

  const [showMapModal, setShowMapModal] = useState(false);
  
  // 🔥 STATE UNTUK FOTO
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(editingCustomer?.house_photo_url || "");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let cleanedValue = value;
    if (name === "distance_km") cleanedValue = value.replace(",", ".").replace(/[^\d.]/g, "");
    else if (name === "delivery_fee") cleanedValue = value.replace(/\./g, "").replace(",", ".");
    setFormData((prev) => ({ ...prev, [name]: cleanedValue }));
  };

  // 🔥 FUNGSI UPLOAD & KOMPRES FOTO
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Tampilkan preview sementara
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);

    try {
      // 2. Kompres Foto (Target 100KB, resolusi max 800px)
      const options = {
        maxSizeMB: 0.1, // 100 KB
        maxWidthOrHeight: 800, // Resolusi maksimal 800px
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // 3. Upload ke Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-photos")
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // 4. Dapatkan URL Publik
      const { data: { publicUrl } } = supabase.storage
        .from("customer-photos")
        .getPublicUrl(filePath);

      // 5. Simpan URL ke form data
      setFormData((prev) => ({ ...prev, house_photo_url: publicUrl }));
      setPhotoPreview(publicUrl);
      
    } catch (error) {
      alert("Gagal upload foto: " + error.message);
      setPhotoPreview(editingCustomer?.house_photo_url || "");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCoordinateSelect = (lat, lng) => setFormData((prev) => ({ ...prev, lat: lat.toString(), lng: lng.toString() }));

  const handleOpenGoogleMapsDirection = () => {
    if (!formData.lat || !formData.lng) return alert("❌ Harap isi koordinat!");
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${RS_AMINAH_COORDINATES.lat},${RS_AMINAH_COORDINATES.lng}&destination=${formData.lat},${formData.lng}&travelmode=driving`;
    window.open(mapsUrl, "_blank");
  };

  const calculateDeliveryFeeFromDistance = () => {
    if (!formData.distance_km) return alert("Masukkan jarak!");
    const distance = parseFloat(formData.distance_km.replace(",", "."));
    if (isNaN(distance)) return alert("Format jarak tidak valid!");
    const rawFee = distance * 2500 + 1000;
    const roundedFee = Math.ceil(rawFee / 500) * 500;
    setFormData((prev) => ({ ...prev, delivery_fee: roundedFee.toString() }));
    alert(`💰 Ongkos Kirim: Rp ${roundedFee.toLocaleString()}`);
  };

  const calculateDistanceFromDeliveryFee = () => {
    if (!formData.delivery_fee) return alert("Masukkan ongkir!");
    const deliveryFee = parseFloat(formData.delivery_fee.replace(/\./g, "").replace(",", "."));
    if (isNaN(deliveryFee)) return alert("Format ongkir tidak valid!");
    if (deliveryFee < 1000) return alert("Ongkir minimal Rp 1.000!");
    const distance = (deliveryFee - 1000) / 2500;
    setFormData((prev) => ({ ...prev, distance_km: (Math.round(distance * 100) / 100).toString() }));
    alert(`📏 Jarak: ${Math.round(distance * 100) / 100} km`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.address?.trim() || !formData.phone?.trim()) return alert("Nama, Alamat, dan No HP harus diisi!");
    
    if (isRequiredForCompletion) {
      const isAdmin = currentUserRole === "admin";
      if (isAdmin && (!formData.distance_km || !formData.delivery_fee)) return alert("Data Jarak & Ongkir wajib diisi!");
      else if (!isAdmin && (!formData.lat || !formData.lng || !formData.distance_km || !formData.delivery_fee)) return alert("Semua data wajib diisi!");
    }
    onSave(formData);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px 16px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", padding: "24px", borderRadius: "20px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "slideUp 0.3s ease-out" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>{editingCustomer ? "✏️ Edit Data Pelanggan" : "➕ Tambah Pelanggan Baru"}</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", color: "#64748b", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {isRequiredForCompletion && <div style={{ fontSize: "12px", color: "#b91c1c", background: "#fef2f2", padding: "10px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #fecaca" }}>⚠️ Wajib lengkapi semua data untuk menyelesaikan pengiriman</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Nama Pelanggan *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} required />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>No HP *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} required />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Alamat *</label>
            <textarea name="address" value={formData.address} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px", minHeight: "80px", resize: "vertical", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} required />
          </div>

          {/* 🔥 SECTION FOTO RUMAH */}
          <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Foto Rumah (Opsional)</label>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ width: "100%", fontSize: "12px", color: "#64748b" }} />
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Foto akan dikompres otomatis ke ~100KB.</div>
              </div>
              {photoPreview && (
                <div style={{ width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", border: "2px solid #e2e8f0", flexShrink: 0 }}>
                  <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>
            {uploadingPhoto && <div style={{ fontSize: "12px", color: "#6366f1", marginTop: "8px", fontWeight: "600" }}>⏳ Mengompres & mengunggah foto...</div>}
          </div>

          {/* Koordinat Section */}
          <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "12px" }}>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "12px" }}>Latitude</label>
                  <input type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} placeholder="-8.0989" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "12px" }}>Longitude</label>
                  <input type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} placeholder="112.1684" />
                </div>
              </div>
              <button type="button" onClick={() => setShowMapModal(true)} style={{ padding: "10px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", height: "38px", display: "flex", alignItems: "center", gap: "4px" }}>🗺️ Ambil Koordinat</button>
            </div>
            {(formData.lat || formData.lng) && (
              <button type="button" onClick={handleOpenGoogleMapsDirection} style={{ width: "100%", padding: "10px 16px", background: "white", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>🗺️ Cek Jarak di Google Maps</button>
            )}
          </div>

          {/* Jarak & Ongkir */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Jarak (KM) {isRequiredForCompletion && <span style={{ color: "#ef4444" }}>*</span>}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="number" step="0.1" name="distance_km" value={formData.distance_km} onChange={handleInputChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "white" }} required={isRequiredForCompletion} />
                <button type="button" onClick={calculateDeliveryFeeFromDistance} style={{ padding: "10px 12px", background: "#f3e8ff", color: "#7e22ce", border: "1px solid #d8b4fe", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}>🧮 Ongkir</button>
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Ongkir (Rp) {isRequiredForCompletion && <span style={{ color: "#ef4444" }}>*</span>}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="text" name="delivery_fee" value={formData.delivery_fee} onChange={handleInputChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "white" }} required={isRequiredForCompletion} />
                <button type="button" onClick={calculateDistanceFromDeliveryFee} style={{ padding: "10px 12px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}>📏 Jarak</button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button type="submit" disabled={uploadingPhoto} style={{ padding: "14px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: uploadingPhoto ? "not-allowed" : "pointer", flex: 1, boxShadow: "0 4px 12px rgba(99,102,241,0.3)", opacity: uploadingPhoto ? 0.7 : 1 }}>{editingCustomer ? "Update Data" : "Simpan Pelanggan"}</button>
            <button type="button" onClick={onClose} style={{ padding: "14px", background: "white", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", flex: 1 }}>Batal</button>
          </div>
        </form>
      </div>

      {showMapModal && <MapPickerModal onCoordinateSelect={handleCoordinateSelect} onClose={() => setShowMapModal(false)} existingLat={formData.lat} existingLng={formData.lng} />}

      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default CustomerFormModal;