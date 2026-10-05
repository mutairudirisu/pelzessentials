import { createClient } from "@supabase/supabase-js";
import { fallbackCatalog, type Product } from "@/lib/catalog";

export async function getCatalog(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return fallbackCatalog;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("products")
    .select("id,name,category,description,price,image_url,badge,active")
    .eq("active", true)
    .order("sort_order");
  if (error || !data?.length) return fallbackCatalog;
  return data as Product[];
}
