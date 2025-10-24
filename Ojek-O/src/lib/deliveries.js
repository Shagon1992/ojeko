import { supabase } from "./supabase";

// CREATE - Buat pengiriman baru (VERSI SIMPLE)
export const createDelivery = async (deliveryData) => {
  const { data, error } = await supabase
    .from("deliveries")
    .insert([
      {
        customer_id: deliveryData.customer_id || deliveryData.customerId, // Support both formats
        courier_id: deliveryData.courier_id || deliveryData.courierId, // Support both formats
        status: "pending",
        delivery_date: new Date().toISOString().split("T")[0],
        notes: deliveryData.notes || "",
        // created_by: deliveryData.createdBy // Opsional: hilangkan jika tidak ada
      },
    ])
    .select(
      `
      *,
      customers (*),
      couriers (*)
    `
    )
    .single();

  if (error) throw error;
  return data;
};

// READ - Get semua deliveries dengan filters
export const getDeliveries = async (filters = {}) => {
  let query = supabase.from("deliveries").select(`
      *,
      customers (*),
      couriers (*)
    `);

  // Filter by status
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  // Filter by date
  if (filters.date) {
    query = query.eq("delivery_date", filters.date);
  }

  // Filter by date range
  if (filters.startDate && filters.endDate) {
    query = query
      .gte("delivery_date", filters.startDate)
      .lte("delivery_date", filters.endDate);
  }

  // Filter by courier
  if (filters.courierId) {
    query = query.eq("courier_id", filters.courierId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

// UPDATE - Update status delivery
export const updateDeliveryStatus = async (deliveryId, status) => {
  const updateData = { status };

  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }

  if (status === "on_delivery") {
    updateData.assigned_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("deliveries")
    .update(updateData)
    .eq("id", deliveryId)
    .select(
      `
      *,
      customers (*),
      couriers (*)
    `
    )
    .single();

  if (error) throw error;
  return data;
};

// UPDATE - Ganti kurir
export const updateDeliveryCourier = async (deliveryId, courierId) => {
  const { data, error } = await supabase
    .from("deliveries")
    .update({
      courier_id: courierId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", deliveryId)
    .select(
      `
      *,
      customers (*),
      couriers (*)
    `
    )
    .single();

  if (error) throw error;
  return data;
};

// DELETE - Hapus delivery
export const deleteDelivery = async (deliveryId) => {
  const { error } = await supabase
    .from("deliveries")
    .delete()
    .eq("id", deliveryId);

  if (error) throw error;
};

// GET - Dapatkan delivery by ID
export const getDeliveryById = async (deliveryId) => {
  const { data, error } = await supabase
    .from("deliveries")
    .select(
      `
      *,
      customers (*),
      couriers (*)
    `
    )
    .eq("id", deliveryId)
    .single();

  if (error) throw error;
  return data;
};
