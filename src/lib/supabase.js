import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fqdjhmslbhqpdzsukkxs.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZGpobXNsYmhxcGR6c3Vra3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MzM3MzUsImV4cCI6MjA3NjMwOTczNX0.WY3S0s8PQqDpx5JSAxVAFoF_qzRelZtpdCXAULZkhzw";

export const supabase = createClient(supabaseUrl, supabaseKey);
