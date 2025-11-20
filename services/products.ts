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
    .select('id, sku, name, unit, group_id, image_url')
    .order('id', { ascending: false });

  return { data, error };
}

// Tạo sản phẩm
export async function createProduct(input: InsertProduct) {
  const { data, error } = await supabase
    .from('products')
    .insert(input)
    .select('id, sku, name, unit, group_id, image_url')
    .single();

  return { data, error };
}

// Cập nhật sản phẩm
export async function updateProduct(
  id: string | number,
  patch: {
    sku?: string;
    name?: string;
    unit?: string | null;
    group_id?: number | null;
    status?: string | null;
    note?: string | null;
    image_url?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('id, sku, name, unit, group_id, image_url')
    .single();

  return { data, error };
}

// Xoá sản phẩm
export async function deleteProduct(id: string | number) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  return { data, error };
}
