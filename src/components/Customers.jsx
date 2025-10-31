import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "leaflet/dist/leaflet.css";
import CustomerFormModal from "./CustomerFormModal";
import CreateDeliveryModal from "./CreateDeliveryModal";

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
            {/* TOMBOL BUAT ORDERAN */}
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

// Pagination Component
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

      {/* Items Per Page Selector */}
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

// Main Customers Component
const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // STATE MODAL
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  // STATE PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // STATE UNTUK SEARCH
  const [searchInput, setSearchInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

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
      fetchCustomers(1, itemsPerPage);
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
    fetchCouriers();
  }, [itemsPerPage]);

  // 🔥 FUNGSI BARU: Handle buat orderan dari customer
  const handleCreateDelivery = (customer) => {
    setSelectedCustomer(customer);
    setShowDeliveryModal(true);
  };

  // 🔥 FUNGSI BARU: Setelah berhasil buat orderan
  const handleDeliverySuccess = () => {
    setShowDeliveryModal(false);
    setSelectedCustomer(null);
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

  // Submit form dengan default values
  const handleSubmit = async (formData) => {
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

  // Edit customer
  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowCustomerFormModal(true);
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
    setEditingCustomer(null);
    setShowCustomerFormModal(false);
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
            onClick={() => setShowCustomerFormModal(true)}
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

      {/* 🔥 MODAL: Customer Form Modal */}
      {showCustomerFormModal && (
        <CustomerFormModal
          editingCustomer={editingCustomer}
          onSave={handleSubmit}
          onClose={resetForm}
          currentUserRole="admin" // Default admin di customers page
        />
      )}

      {/* 🔥 MODAL: Create Delivery */}
      {showDeliveryModal && selectedCustomer && (
        <CreateDeliveryModal
          customer={selectedCustomer}
          couriers={couriers}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleDeliverySuccess}
          mode="from-existing"
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
