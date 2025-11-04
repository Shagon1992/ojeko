import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { createDelivery } from "../lib/deliveries";
import CustomerFormModal from "./CustomerFormModal";

const CreateDeliveryModal = ({
  customer = null, // bisa null untuk customer baru
  couriers = [],
  onClose,
  onSuccess,
  mode = "from-existing", // 'from-existing' | 'from-new'
}) => {
  const [formData, setFormData] = useState({
    customer_id: customer?.id || "",
    courier_id: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);

  // STATE UNTUK VALIDASI ORDER AKTIF
  const [existingOrders, setExistingOrders] = useState([]);
  const [checkingOrders, setCheckingOrders] = useState(false);

  // STATE UNTUK CUSTOMER SEARCH (jika mode from-new)
  const [customerSearch, setCustomerSearch] = useState(customer?.name || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // STATE UNTUK CUSTOMER FORM MODAL
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // 🔥 EFFECT: Auto-set customer_id jika ada customer prop
  useEffect(() => {
    if (customer?.id) {
      setFormData((prev) => ({ ...prev, customer_id: customer.id }));
      setCustomerSearch(customer.name || "");
    }
  }, [customer]);

  // 🔥 EFFECT: Cek existing orders ketika customer_id berubah
  useEffect(() => {
    if (formData.customer_id) {
      checkExistingOrders(formData.customer_id);
    } else {
      setExistingOrders([]);
    }
  }, [formData.customer_id]);

  // 🔥 FUNGSI: Cek apakah ada order aktif (pending atau on_delivery)
  const checkExistingOrders = async (customerId) => {
    if (!customerId) return;
    
    setCheckingOrders(true);
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id, status, order_number, created_at")
        .eq("customer_id", customerId)
        .in("status", ["pending", "on_delivery"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setExistingOrders(data || []);
    } catch (error) {
      console.error("Error checking existing orders:", error);
      setExistingOrders([]);
    } finally {
      setCheckingOrders(false);
    }
  };

  // 🔥 FUNGSI: Handle customer search dengan debounce
  const handleCustomerSearch = (searchTerm) => {
    setCustomerSearch(searchTerm);

    // Clear timeout sebelumnya
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Jika search kosong, reset results
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setFormData((prev) => ({ ...prev, customer_id: "" }));
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
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    setSearchTimeout(newTimeout);
  };

  // 🔥 FUNGSI: Perform actual search ke database
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

  // 🔥 FUNGSI: Select customer dari search results
  const handleSelectCustomer = (selectedCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customer_id: selectedCustomer.id,
    }));
    setCustomerSearch(selectedCustomer.name);
    setSearchResults([]);
    setHasSearched(false);
  };

  // 🔥 FUNGSI: Reset search
  const resetSearch = () => {
    setCustomerSearch("");
    setSearchResults([]);
    setHasSearched(false);
    setFormData((prev) => ({ ...prev, customer_id: "" }));
    setExistingOrders([]);
  };

  // 🔥 FUNGSI: Handle submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi customer
    if (!formData.customer_id) {
      alert("Pilih customer terlebih dahulu!");
      return;
    }

    // Validasi existing orders
    if (existingOrders.length > 0) {
      alert("Tidak bisa membuat order baru karena customer masih memiliki order aktif!");
      return;
    }

    setLoading(true);

    try {
      const deliveryData = {
        customer_id: formData.customer_id,
        courier_id: formData.courier_id || null,
        notes: formData.notes,
      };

      const data = await createDelivery(deliveryData);

      alert(`✅ Orderan berhasil dibuat!`);
      onSuccess(data);
    } catch (error) {
      alert("Error membuat orderan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNGSI: Handle save customer dari CustomerFormModal
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
          ? parseInt(customerData.delivery_fee.replace(/\./g, ""))
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

        // Auto-select customer baru di form
        setFormData((prev) => ({ ...prev, customer_id: data.id }));
        setCustomerSearch(data.name);
      }

      // Refresh search results
      if (customerSearch) {
        await performSearch(customerSearch);
      }

      setShowCustomerForm(false);
      setEditingCustomer(null);

      return newCustomerId;
    } catch (error) {
      alert("Error: " + error.message);
      return null;
    }
  };

  // 🔥 CLEANUP: Clear timeout saat component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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

        {/* Customer Info - jika dari customer existing */}
        {mode === "from-existing" && customer && (
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
            <div
              style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}
            >
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
                style={{
                  fontSize: "12px",
                  color: "#059669",
                  fontWeight: "600",
                }}
              >
                💰 Ongkir: Rp {customer.delivery_fee.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* WARNING: Existing Orders */}
        {existingOrders.length > 0 && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontWeight: "600", marginBottom: "8px" }}>
              ⚠️ Ada {existingOrders.length} order aktif pada customer ini:
            </div>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", fontSize: "13px" }}>
              {existingOrders.map((order) => (
                <li key={order.id} style={{ marginBottom: "4px" }}>
                  <strong>Order #{order.order_number}</strong> - Status:{" "}
                  <span
                    style={{
                      background: order.status === "pending" ? "#f59e0b" : "#dbeafe",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {order.status === "pending" ? "PENDING" : "ON DELIVERY"}
                  </span>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: "12px", marginTop: "8px", color: "#b91c1c" }}>
              Selesaikan order tersebut terlebih dahulu sebelum membuat order baru.
            </div>
          </div>
        )}

        {/* Loading Indicator untuk Cek Orders */}
        {checkingOrders && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: "8px 12px",
              borderRadius: "6px",
              marginBottom: "16px",
              textAlign: "center",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            🔍 Memeriksa order aktif...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer Search - hanya tampil jika mode from-new */}
          {mode === "from-new" && (
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
                    maxHeight: "200px",
                    overflow: "auto",
                    background: "white",
                  }}
                >
                  {/* Case 1: Ada hasil */}
                  {searchResults.length > 0 && (
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
                        📊 Ditemukan {searchResults.length} customer
                      </div>

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
                              formData.customer_id === customer.id
                                ? "#f0f9ff"
                                : "white",
                            borderRadius: "4px",
                            margin: "2px 0",
                            border:
                              formData.customer_id === customer.id
                                ? "1px solid #3b82f6"
                                : "none",
                          }}
                          onMouseOver={(e) => {
                            if (formData.customer_id !== customer.id) {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.border =
                                "1px solid #e2e8f0";
                            }
                          }}
                          onMouseOut={(e) => {
                            if (formData.customer_id !== customer.id) {
                              e.currentTarget.style.background = "white";
                              e.currentTarget.style.border =
                                formData.customer_id === customer.id
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
                            {formData.customer_id === customer.id && (
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
                    !formData.customer_id && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#64748b",
                        }}
                      >
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>
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
                          }}
                        >
                          Kata kunci: <strong>"{customerSearch}"</strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomer({
                              name: customerSearch,
                              phone: "",
                              address: "",
                              lat: "",
                              lng: "",
                              distance_km: "",
                              delivery_fee: "",
                            });
                            setShowCustomerForm(true);
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
                            width: "100%",
                          }}
                        >
                          ➕ Buat Customer Baru: "{customerSearch}"
                        </button>
                      </div>
                    )}
                </div>
              )}

              {/* Selected Customer Info */}
              {formData.customer_id && (
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
                          (c) => c.id === formData.customer_id
                        )?.name || customerSearch}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetSearch}
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
          )}

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
              disabled={loading || !formData.customer_id || existingOrders.length > 0}
              style={{
                padding: "12px 20px",
                background: existingOrders.length > 0 ? "#ef4444" : 
                           loading ? "#94a3b8" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: 
                  loading || !formData.customer_id || existingOrders.length > 0 
                    ? "not-allowed" 
                    : "pointer",
                opacity: 
                  loading || !formData.customer_id || existingOrders.length > 0 
                    ? 0.7 
                    : 1,
              }}
            >
              {existingOrders.length > 0 
                ? "❌ Ada Order Aktif" 
                : loading 
                  ? "Membuat..." 
                  : "✅ Buat Orderan"
              }
            </button>
          </div>
        </form>
      </div>

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerFormModal
          editingCustomer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => {
            setShowCustomerForm(false);
            setEditingCustomer(null);
          }}
          currentUserRole="admin" // Default admin untuk create delivery
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

export default CreateDeliveryModal;
