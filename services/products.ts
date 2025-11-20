// services/products.ts
import { supabase } from '../lib/supabase';

export type InsertProduct = {
  sku: string;
  name: string;
  unit?: string | null;
  group_id?: number | null; 
};

// Lấy danh sách sản phẩm
export async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, name, unit, group_id') 
    .order('id', { ascending: false });
  return { data, error };
}

// Tạo sản phẩm
export async function createProduct(input: InsertProduct) {
  const { data, error } = await supabase
    .from('products')
    .insert(input)
    .select('id, sku, name, unit, group_id')
    .single();
  return { data, error };
}

// Sửa sản phẩm
export async function updateProduct(id: string, patch: { sku?: string; name?: string; unit?: string | null; group_id?: number | null }) {
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('id, sku, name, unit, group_id')
    .single();
  return { data, error };
}

// Xoá sản phẩm
export async function deleteProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  return { data, error };
}
