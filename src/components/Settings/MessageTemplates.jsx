import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const MessageTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_type: "",
    message: "",
  });
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  // Template types based on user role - SESUAI PERMINTAAN
  const templateTypes = isAdmin
    ? [
        // Admin: hanya 2 pilihan
        {
          value: "admin_to_customer",
          label: "Admin → Customer",
          description: "Template untuk admin mengirim pesan ke customer",
          example:
            "Assalamu'alaikum, pesanan obat Anda sedang diproses dan akan segera dikirim oleh kurir kami. Terima kasih.",
        },
        {
          value: "admin_to_courier",
          label: "Admin → Kurir",
          description: "Template untuk admin mengirim pesan ke kurir",
          example:
            "Assalamu'alaikum pak {nama_kurir}, ada pesanan antar obat atas nama {nama_customer}, alamat {alamat_customer}. Terima kasih.",
        },
      ]
    : [
        // Kurir: hanya 1 pilihan
        {
          value: "courier_to_customer",
          label: "Kurir → Customer",
          description: "Template untuk mengirim pesan ke customer",
          example:
            "Selamat pagi, saya {nama_kurir} dari Ojek-O akan mengantarkan obat anda, dengan alamat {alamat_customer}, apa boleh di share lokasi agar lebih akurat??",
        },
      ];

  const availableVariables = {
    admin_to_customer: [
      "{nama_customer}",
      "{alamat_customer}",
      "{no_hp_customer}",
      "{resi}",
    ],
    admin_to_courier: [
      "{nama_kurir}",
      "{nama_customer}",
      "{alamat_customer}",
      "{no_hp_customer}",
      "{resi}",
    ],
    courier_to_customer: [
      "{nama_kurir}",
      "{nama_customer}",
      "{alamat_customer}",
      "{no_hp_customer}",
      "{resi}",
    ],
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      alert("Error fetching templates: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.template_type || !formData.message) {
      alert("Harap isi semua field");
      return;
    }

    // 🔥 VALIDASI BARU: Cek apakah sudah ada template dengan jenis yang sama
    if (!editingTemplate) {
      const existingTemplate = templates.find(
        (t) => t.template_type === formData.template_type
      );
      if (existingTemplate) {
        alert(
          `Anda sudah memiliki template untuk ${getTemplateTypeLabel(
            formData.template_type
          )}. Silakan edit template yang sudah ada.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("message_templates")
          .update({
            template_type: formData.template_type,
            message: formData.message,
            updated_at: new Date(),
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        alert("Template berhasil diupdate!");
      } else {
        const { error } = await supabase.from("message_templates").insert([
          {
            user_id: user.id,
            template_type: formData.template_type,
            message: formData.message,
          },
        ]);

        if (error) throw error;
        alert("Template berhasil dibuat!");
      }

      setFormData({ template_type: "", message: "" });
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_type: template.template_type,
      message: template.message,
    });
  };

  const handleDelete = async (templateId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;

    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      alert("Template berhasil dihapus!");
      fetchTemplates();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const insertVariable = (variable) => {
    setFormData((prev) => ({
      ...prev,
      message: prev.message + variable,
    }));
  };

  const getTemplateTypeLabel = (type) => {
    const found = templateTypes.find((t) => t.value === type);
    return found ? found.label : type;
  };

  return (
    <div>
      <h2
        style={{
          margin: "0 0 20px 0",
          color: "#1e293b",
          fontSize: "18px",
          fontWeight: "600",
        }}
      >
        📝 Template Pesan WhatsApp
      </h2>

      {/* Role Info */}
      <div
        style={{
          background: "#f0f9ff",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>👤</span>
          <span
            style={{ fontSize: "14px", color: "#0369a1", fontWeight: "500" }}
          >
            {isAdmin
              ? "Admin - Bisa kirim ke Customer & Kurir"
              : "Kurir - Bisa kirim ke Customer"}
          </span>
        </div>
      </div>

      {/* Template Form */}
      <div
        style={{
          background: "#f8fafc",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            color: "#1e293b",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          {editingTemplate ? "Edit Template" : "Buat Template Baru"}
        </h3>

        <form onSubmit={handleSubmit}>
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
              Jenis Template *
            </label>
            <select
              value={formData.template_type}
              onChange={(e) =>
                setFormData({ ...formData, template_type: e.target.value })
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                transition: "all 0.2s",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }}
              required
            >
              <option value="">Pilih Jenis Template</option>
              {templateTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {formData.template_type && (
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
                Variabel yang Tersedia
              </label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {availableVariables[formData.template_type]?.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    style={{
                      padding: "6px 10px",
                      background: "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "11px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "#5a6fd8";
                      e.target.style.transform = "translateY(-1px)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "#667eea";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              Pesan Template *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows="5"
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                transition: "all 0.2s",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                maxWidth: "100%",
                minHeight: "120px",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }}
              placeholder="Tulis template pesan Anda di sini..."
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 20px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: loading ? 0.7 : 1,
                minWidth: "140px",
              }}
            >
              {loading
                ? "Menyimpan..."
                : editingTemplate
                ? "Update Template"
                : "Simpan Template"}
            </button>

            {editingTemplate && (
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setFormData({ template_type: "", message: "" });
                }}
                style={{
                  padding: "12px 20px",
                  background: "#64748b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  minWidth: "100px",
                }}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Templates List */}
      <div>
        <h3
          style={{
            margin: "0 0 16px 0",
            color: "#1e293b",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          Template Saya ({templates.length})
        </h3>

        {templates.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#64748b",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px dashed #e2e8f0",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📝</div>
            <p style={{ margin: 0, fontSize: "14px" }}>
              Belum ada template. Buat template pertama Anda!
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {templates.map((template) => (
              <div
                key={template.id}
                style={{
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        background: "#667eea",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "500",
                      }}
                    >
                      {getTemplateTypeLabel(template.template_type)}
                    </span>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Dibuat:{" "}
                      {new Date(template.created_at).toLocaleDateString(
                        "id-ID"
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => handleEdit(template)}
                      style={{
                        padding: "6px 10px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      style={{
                        padding: "6px 10px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    fontSize: "14px",
                    color: "#374151",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxWidth: "100%",
                    overflowWrap: "break-word",
                  }}
                >
                  {template.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageTemplates;
