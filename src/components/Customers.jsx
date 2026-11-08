import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import CustomerFormModal from "./CustomerFormModal";
import CreateDeliveryModal from "./CreateDeliveryModal";
import PhotoModal from "./PhotoModal";

// ==========================================
// KOMPONEN CUSTOMER CARD
// ==========================================
const CustomerCard = ({ customer, onEdit, onDelete, isExpanded, onExpand, onCreateDelivery, onOpenPhoto }) => {
  const openInGoogleMaps = (e) => {
    e.stopPropagation();
    if (customer.lat && customer.lng) {
      window.open(`https://www.google.com/maps?q=${customer.lat},${customer.lng}`, "_blank");
    }
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", background: "white", overflow: "hidden", transition: "all 0.2s", boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header (Klik untuk expand) */}
      <div onClick={() => onExpand(customer.id)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px", background: isExpanded ? "#f8fafc" : "white", flex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", lineHeight: 1.3 }}>{customer.name}</div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#059669", flexShrink: 0, background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px" }}>Rp {(customer.delivery_fee || 0).toLocaleString()}</div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
              <span style={{ opacity: 0.7 }}>📍</span>
              <span style={{ lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: isExpanded ? "none" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{customer.address || "Alamat belum diisi"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ opacity: 0.7 }}>📞</span> {customer.phone}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
          {customer.lat && customer.lng && (
            <button onClick={openInGoogleMaps} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}>🗺️ Map</button>
          )}
          <div style={{ color: "#94a3b8", fontSize: "16px", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none", padding: "2px" }}>⌄</div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: "12px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          {customer.distance_km > 0 && (
            <div style={{ fontSize: "11px", color: "#475569", display: "flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
              <span>📏</span> Jarak: {customer.distance_km} km
            </div>
          )}
          {/* Grid Tombol Aksi (4 Kolom) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
            <button onClick={(e) => { e.stopPropagation(); onCreateDelivery(customer); }} style={{ padding: "8px 4px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>📦 Order</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(customer); }} style={{ padding: "8px 4px", background: "white", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>✏️ Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onOpenPhoto(customer); }} style={{ padding: "8px 4px", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>{customer.house_photo_url ? "📸 Foto" : "+ Foto"}</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(customer.id); }} style={{ padding: "8px 4px", background: "white", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>🗑️ Hapus</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// KOMPONEN PAGINATION
// ==========================================
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  let startPage = Math.max(1, currentPage - 1);
  let endPage = Math.min(totalPages, startPage + 2);
  if (endPage - startPage < 2) startPage = Math.max(1, endPage - 2);
  const pages = [];
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px", padding: "12px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ fontSize: "12px", color: "#64748b" }}>Menampilkan <strong>{startItem}-{endItem}</strong> dari <strong>{totalItems.toLocaleString()}</strong></div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={() => onPageChange(1)} disabled={currentPage === 1} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "white", color: currentPage === 1 ? "#cbd5e1" : "#475569", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "600" }}>«</button>
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "white", color: currentPage === 1 ? "#cbd5e1" : "#475569", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "600" }}>‹</button>
          {pages.map((page) => (
            <button key={page} onClick={() => onPageChange(page)} style={{ padding: "6px 10px", borderRadius: "6px", border: currentPage === page ? "1px solid #6366f1" : "1px solid #e2e8f0", background: currentPage === page ? "#6366f1" : "white", color: currentPage === page ? "white" : "#475569", cursor: "pointer", fontSize: "12px", fontWeight: "600", minWidth: "32px" }}>{page}</button>
          ))}
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: currentPage === totalPages ? "#f8fafc" : "white", color: currentPage === totalPages ? "#cbd5e1" : "#475569", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "600" }}>›</button>
          <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: currentPage === totalPages ? "#f8fafc" : "white", color: currentPage === totalPages ? "#cbd5e1" : "#475569", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "600" }}>»</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
          <select value={itemsPerPage === "all" ? "all" : itemsPerPage} onChange={(e) => onPageChange(1, e.target.value === "all" ? "all" : parseInt(e.target.value))} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", outline: "none" }}>
            <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option><option value="all">Semua</option>
          </select><span>/ halaman</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// KOMPONEN UTAMA CUSTOMERS
// ==========================================
const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerForPhoto, setSelectedCustomerForPhoto] = useState(null); // State untuk foto
  const [couriers, setCouriers] = useState([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearchInput = (value) => {
    setSearchInput(value); setSearchLoading(true);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!value.trim()) { setSearchLoading(false); fetchCustomers(1, itemsPerPage); return; }
    const newTimeout = setTimeout(async () => {
      try { await performSearch(value.trim()); } catch (error) { console.error("Search error:", error); } finally { setSearchLoading(false); }
    }, 400);
    setSearchTimeout(newTimeout);
  };

  const performSearch = async (searchTerm, page = 1, limit = itemsPerPage) => {
    try {
      let data, count;
      if (limit === "all") {
        const result = await supabase.from("customers").select("*").or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`).order("created_at", { ascending: false });
        data = result.data; count = result.data?.length || 0;
      } else {
        const from = (page - 1) * limit; const to = from + limit - 1;
        const result = await supabase.from("customers").select("*", { count: "exact" }).or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`).order("created_at", { ascending: false }).range(from, to);
        data = result.data; count = result.count;
      }
      if (data) { setCustomers(data); setFilteredCustomers(data); setTotalCount(count || 0); setCurrentPage(page); setTotalPages(limit === "all" ? 1 : Math.ceil((count || 0) / limit)); }
    } catch (error) { throw error; }
  };

  const clearSearch = () => {
    setSearchInput(""); setSearchLoading(false);
    if (searchTimeout) { clearTimeout(searchTimeout); setSearchTimeout(null); }
    fetchCustomers(1, itemsPerPage);
  };

  const fetchCustomers = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);
      let data, error, count;
      if (limit === "all") {
        const result = await supabase.from("customers").select("*").order("created_at", { ascending: false });
        data = result.data; error = result.error; count = result.data?.length || 0;
      } else {
        const from = (page - 1) * limit; const to = from + limit - 1;
        const result = await supabase.from("customers").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
        data = result.data; error = result.error; count = result.count;
      }
      if (error) throw error;
      setCustomers(data || []); setFilteredCustomers(data || []); setTotalCount(count || 0);
      setTotalPages(limit === "all" ? 1 : Math.ceil((count || 0) / limit));
      setCurrentPage(page);
    } catch (error) { alert("Error fetching customers: " + error.message); } finally { setLoading(false); }
  };

  const fetchCouriers = async () => {
    try {
      const { data, error } = await supabase.from("couriers").select("*").order("name");
      if (error) throw error;
      setCouriers(data || []);
    } catch (error) { console.error("Error fetching couriers:", error); }
  };

  useEffect(() => { fetchCustomers(1, itemsPerPage); fetchCouriers(); }, [itemsPerPage]);

  const handleCreateDelivery = (customer) => { setSelectedCustomer(customer); setShowDeliveryModal(true); };
  const handleDeliverySuccess = () => { setShowDeliveryModal(false); setSelectedCustomer(null); fetchCustomers(currentPage, itemsPerPage); };

  const handlePageChange = (newPage, newItemsPerPage = itemsPerPage) => {
    if (newItemsPerPage !== itemsPerPage) { setItemsPerPage(newItemsPerPage); if (searchInput.trim()) performSearch(searchInput.trim(), 1, newItemsPerPage); else fetchCustomers(1, newItemsPerPage); }
    else if (searchInput.trim()) { performSearch(searchInput.trim(), newPage, newItemsPerPage); }
    else { fetchCustomers(newPage, newItemsPerPage); }
  };

  const handleExpandCustomer = (customerId) => { setExpandedCustomerId(expandedCustomerId === customerId ? null : customerId); };

  const handleSubmit = async (formData) => {
    if (!formData.name?.trim() || !formData.address?.trim() || !formData.phone?.trim()) return alert("Nama, Alamat, dan No HP harus diisi!");
    try {
      const customerData = { name: formData.name.trim(), address: formData.address.trim(), phone: formData.phone.trim(), lat: formData.lat ? parseFloat(formData.lat) : null, lng: formData.lng ? parseFloat(formData.lng) : null, distance_km: formData.distance_km ? parseFloat(formData.distance_km) : 0, delivery_fee: formData.delivery_fee ? parseInt(formData.delivery_fee.replace(/\./g, "")) : 0, house_photo_url: formData.house_photo_url };
      if (editingCustomer) {
        const { error } = await supabase.from("customers").update(customerData).eq("id", editingCustomer.id);
        if (error) throw error; alert("Data pelanggan berhasil diupdate!");
      } else {
        const { error } = await supabase.from("customers").insert([customerData]);
        if (error) throw error; alert("Data pelanggan berhasil ditambahkan!");
      }
      resetForm(); fetchCustomers(currentPage, itemsPerPage);
    } catch (error) { alert("Error: " + error.message); }
  };

  const handleEdit = (customer) => { setEditingCustomer(customer); setShowCustomerFormModal(true); };
  const handleDelete = async (id) => {
    if (!confirm("Apakah yakin ingin menghapus data pelanggan ini?")) return;
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      alert("Data pelanggan berhasil dihapus!"); fetchCustomers(currentPage, itemsPerPage);
    } catch (error) { alert("Error: " + error.message); }
  };

  const resetForm = () => { setEditingCustomer(null); setShowCustomerFormModal(false); setExpandedCustomerId(null); };

  useEffect(() => { return () => { if (searchTimeout) clearTimeout(searchTimeout); }; }, [searchTimeout]);
  useEffect(() => { if (searchInput) setExpandedCustomerId(null); }, [searchInput]);

  if (loading && customers.length === 0) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          Memuat data pelanggan...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h1 style={{ margin: "0 0 2px 0", fontSize: "20px", fontWeight: "800", color: "#1e293b" }}>👥 Data Pelanggan</h1>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>Kelola data pelanggan</p>
            </div>
            <button onClick={() => setShowCustomerFormModal(true)} style={{ padding: "8px 14px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" }}><span>+</span> Tambah</button>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "14px" }}>🔍</span>
              <input type="text" placeholder="Cari nama, alamat, atau no HP..." value={searchInput} onChange={(e) => handleSearchInput(e.target.value)} style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "white" }} />
              {searchLoading && <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", border: "2px solid #e2e8f0", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", background: "white", padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{searchInput ? `${filteredCustomers.length} hasil` : `${totalCount.toLocaleString()} data`}</div>
            {searchInput && <button onClick={clearSearch} style={{ padding: "8px 12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Clear</button>}
          </div>
        </div>

        <div>
          {filteredCustomers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
              <p style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "600", color: "#6b7280" }}>{searchInput ? "Pelanggan tidak ditemukan" : "Belum ada data pelanggan"}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              {filteredCustomers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} onEdit={handleEdit} onDelete={handleDelete} isExpanded={expandedCustomerId === customer.id} onExpand={handleExpandCustomer} onCreateDelivery={handleCreateDelivery} onOpenPhoto={(cust) => setSelectedCustomerForPhoto(cust)} />
              ))}
            </div>
          )}
          {(totalPages > 1 || searchInput || itemsPerPage !== "all") && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalItems={searchInput ? filteredCustomers.length : totalCount} itemsPerPage={itemsPerPage} />
          )}
        </div>
      </div>

      {showCustomerFormModal && <CustomerFormModal editingCustomer={editingCustomer} onSave={handleSubmit} onClose={resetForm} currentUserRole="admin" />}
      {showDeliveryModal && selectedCustomer && <CreateDeliveryModal customer={selectedCustomer} couriers={couriers} onClose={() => { setShowDeliveryModal(false); setSelectedCustomer(null); }} onSuccess={handleDeliverySuccess} mode="from-existing" currentUser={JSON.parse(localStorage.getItem("user"))} />}
      {selectedCustomerForPhoto && <PhotoModal customer={selectedCustomerForPhoto} onClose={() => setSelectedCustomerForPhoto(null)} onUpdate={() => fetchCustomers(currentPage, itemsPerPage)} />}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Customers;