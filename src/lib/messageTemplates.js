import { supabase } from "./supabase";

// CREATE/UPDATE - Simpan template message
export const saveMessageTemplate = async (templateData) => {
  // Cek apakah template sudah ada untuk user ini
  const { data: existing } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", templateData.userId)
    .eq("template_type", templateData.templateType)
    .single();

  if (existing) {
    // Update existing template
    const { data, error } = await supabase
      .from("message_templates")
      .update({
        message: templateData.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new template
    const { data, error } = await supabase
      .from("message_templates")
      .insert([
        {
          user_id: templateData.userId,
          template_type: templateData.templateType,
          message: templateData.message,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// READ - Get semua template by user
export const getMessageTemplates = async (userId) => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
};

// READ - Get template specific
export const getMessageTemplate = async (userId, templateType) => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("template_type", templateType)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Template tidak ditemukan, return null
      return null;
    }
    throw error;
  }
  return data;
};

// DELETE - Hapus template
export const deleteMessageTemplate = async (templateId) => {
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
};
