import React, { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "../lib/supabase";

const PhotoModal = ({ customer, onClose, onUpdate }) => {
  const [photoUrl, setPhotoUrl] = useState(
    customer?.house_photo_url ? `${customer.house_photo_url}?t=${Date.now()}` : ""
  );
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const fileName = `cust_${customer.id}.jpg`;
  const filePath = `public/${fileName}`;

  useEffect(() => {
    if (!selectedFile) return;

    const processUpload = async () => {
      setUploading(true);
      try {
        let compressedFile = selectedFile;
        try {
          const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true, fileType: "image/jpeg" };
          compressedFile = await imageCompression(selectedFile, options);
        } catch (err) {
          console.warn("Gagal kompresi, pakai file asli:", err);
        }

        const { error: uploadError } = await supabase.storage
          .from("customer-photos")
          .upload(filePath, compressedFile, { upsert: true, contentType: "image/jpeg" });
          
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("customer-photos").getPublicUrl(filePath);
        const { error: dbError } = await supabase.from("customers").update({ house_photo_url: publicUrl }).eq("id", customer.id);
        if (dbError) throw dbError;

        setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
        if (onUpdate) onUpdate(publicUrl);
        setShowUploadOptions(false);
        
      } catch (error) {
        alert("Gagal upload foto: " + error.message);
      } finally {
        setUploading(false);
        // 🔥 KUNCI: Beri jeda sebelum reset file agar kamera HP tidak crash
        setTimeout(() => { setSelectedFile(null); }, 500);
      }
    };

    processUpload();
  }, [selectedFile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        return alert("File harus berupa gambar.");
      }
      setSelectedFile(file);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus foto rumah ini?")) return;
    setUploading(true);
    try {
      await supabase.storage.from("customer-photos").remove([filePath]);
      const { error } = await supabase.from("customers").update({ house_photo_url: null }).eq("id", customer.id);
      if (error) throw error;
      setPhotoUrl("");
      if (onUpdate) onUpdate(""); 
    } catch (error) {
      alert("Gagal menghapus foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }} onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}>
        <div style={{ background: "white", padding: "20px", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "slideUp 0.3s ease-out" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>📸 Foto Rumah: {customer.name}</h3>
            <button onClick={onClose} disabled={uploading} style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: uploading ? "not-allowed" : "pointer", color: "#64748b", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {photoUrl ? (
            <div style={{ marginBottom: "20px" }}>
              <div 
                onClick={() => setIsFullScreen(true)}
                style={{ width: "100%", height: "300px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc", marginBottom: "16px", cursor: "zoom-in" }}
              >
                <img src={photoUrl} alt="Foto Rumah" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              
              {!showUploadOptions ? (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={() => setIsFullScreen(true)} style={{ flex: 1, padding: "10px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                    🔍 Ukuran Penuh
                  </button>

                  <button onClick={() => setShowUploadOptions(true)} disabled={uploading} style={{ flex: 1, padding: "10px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", opacity: uploading ? 0.5 : 1 }}>
                    🔄 Ganti Foto
                  </button>

                  <button onClick={handleDelete} disabled={uploading} style={{ padding: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "16px", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: uploading ? 0.5 : 1 }} title="Hapus Foto">
                    🗑️
                  </button>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", textAlign: "center" }}>Pilih sumber foto baru:</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <label style={{ flex: 1, padding: "10px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: uploading ? "not-allowed" : "pointer", textAlign: "center", opacity: uploading ? 0.5 : 1 }}>
                      {uploading ? "Memproses..." : "🖼️ Galeri"}
                      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} style={{ display: "none" }} />
                    </label>
                    <label style={{ flex: 1, padding: "10px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: uploading ? "not-allowed" : "pointer", textAlign: "center", opacity: uploading ? 0.5 : 1 }}>
                      {uploading ? "Memproses..." : "📷 Kamera"}
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={uploading} style={{ display: "none" }} />
                    </label>
                  </div>
                  <button onClick={() => setShowUploadOptions(false)} style={{ width: "100%", marginTop: "8px", padding: "8px", background: "transparent", color: "#64748b", border: "none", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>Batal</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", marginBottom: "20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏠</div>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#64748b" }}>Belum ada foto rumah untuk pelanggan ini.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                <label style={{ display: "inline-block", padding: "12px 24px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: uploading ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", width: "100%", maxWidth: "250px", opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? "Mengompres & Upload..." : "🖼️ Ambil dari Galeri"}
                  <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} style={{ display: "none" }} />
                </label>

                <label style={{ display: "inline-block", padding: "12px 24px", background: "white", color: "#059669", border: "2px solid #10b981", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: uploading ? "not-allowed" : "pointer", width: "100%", maxWidth: "250px", opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? "Mengompres & Upload..." : "📷 Ambil dari Kamera"}
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={uploading} style={{ display: "none" }} />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {isFullScreen && (
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.95)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s ease-out" }}
          onClick={() => setIsFullScreen(false)}
        >
          <button style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.2)", color: "white", border: "none", width: "40px", height: "40px", borderRadius: "50%", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <img src={photoUrl} alt="Foto Rumah Fullscreen" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <div style={{ position: "absolute", bottom: "20px", color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Ketuk di mana saja untuk menutup</div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
};

export default PhotoModal;