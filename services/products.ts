// services/products.ts
import { supabase } from '../lib/supabase';

export type InsertProduct = {
  sku: string;
  name: string;
  group_id?: number | null;
  unit?: string | null;
  image_url?: string | null;
  note?: string | null;
};

// Lấy danh sách sản phẩm
export async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, name, unit, image_url, note')
    .order('id', { ascending: false });
  return { data, error };
}

// Tạo sản phẩm
export async function createProduct(input: InsertProduct) {
  const { data, error } = await supabase
    .from('products')
    .insert(input)
    .select('id, sku, name, unit, image_url, note')
    .single();
  return { data, error };
}

// Sửa sản phẩm
export async function updateProduct(id: number, patch: Partial<InsertProduct>) {
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('id, sku, name, unit, image_url, note')
    .single();
  return { data, error };
}

// Xoá sản phẩm
export async function deleteProduct(id: number) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  return { error };
}
