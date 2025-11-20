// services/products.ts
import { supabase } from '../lib/supabase';

export type InsertProduct = {
  sku: string;
  name: string;
  unit?: string | null;
  price?: number | null;
  supplier_id?: string | null;
  group_id?: string | null;    // uuid -> dùng string
  image_url?: string | null;
};

// Lấy danh sách sản phẩm
export async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, sku, name, unit, price, created_at, supplier_id, group_id, image_url'
    )
    .order('created_at', { ascending: false });

  return { data, error };
}

// Tạo sản phẩm
export async function createProduct(input: InsertProduct) {
  const { data, error } = await supabase
    .from('products')
    .insert(input)
    .select(
      'id, sku, name, unit, price, created_at, supplier_id, group_id, image_url'
    )
    .single();

  return { data, error };
}

// Cập nhật sản phẩm
export async function updateProduct(
  id: string,
  patch: {
    sku?: string;
    name?: string;
    unit?: string | null;
    price?: number | null;
    supplier_id?: string | null;
    group_id?: string | null;
    image_url?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select(
      'id, sku, name, unit, price, created_at, supplier_id, group_id, image_url'
    )
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
