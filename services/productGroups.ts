// src/services/productGroups.ts
import { supabase } from '../lib/supabase';

// Lấy danh sách nhóm sản phẩm
export async function listGroups() {
  return await supabase
    .from('product_groups')
    .select('id, name, parent_id')
    .order('name', { ascending: true });
    .limit(1);
}

// Tạo nhóm mới
export async function createGroup(name: string, parent_id?: string | null) {
  return await supabase
    .from('product_groups')
    .insert({ name, parent_id: parent_id ?? null })
    .select('id, name, parent_id')
    .single();
}

// Cập nhật nhóm
export async function updateGroup(
  id: string,
  patch: { name?: string; parent_id?: string | null }
) {
  return await supabase
    .from('product_groups')
    .update(patch)
    .eq('id', id)
    .select('id, name, parent_id')
    .single();
}

// Xoá nhóm
export async function deleteGroup(id: string) {
  return await supabase
    .from('product_groups')
    .delete()
    .eq('id', id);
}
