import React, { useState, useEffect } from 'react';
import { createProduct, updateProduct } from '../services/products';
import { listGroups } from '../services/productGroups';
import { ProductGroup, ProductWithStock } from '../types';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  productToEdit?: ProductWithStock | null;
}

const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listGroups().then(({ data }) => setGroups(data ?? []));
  }, []);

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku);
      setName(productToEdit.name);
      setUnit(productToEdit.unit ?? '');
      setGroupId(productToEdit.group ? String(productToEdit.group.id) : '');
      setImageUrl((productToEdit as any).imageUrl ?? '');
    } else {
      setSku('');
      setName('');
      setUnit('');
      setGroupId('');
      setImageUrl('');
    }
  }, [productToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      alert('Vui lòng nhập SKU và Tên sản phẩm');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sku: sku.trim(),
        name: name.trim(),
        unit: unit.trim() || null,
        group_id: groupId || null,
        image_url: imageUrl.trim() || null,
      };

      if (productToEdit) {
        await updateProduct(String(productToEdit.id), payload);
      } else {
        await createProduct(payload);
      }

      await onSave();
      onClose();
    } catch (e: any) {
      console.error('[PRODUCT_FORM] save error', e);
      alert('Lưu sản phẩm thất bại: ' + (e?.message ?? 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!productToEdit;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Đơn vị tính
                </label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nhóm sản phẩm
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Chưa phân nhóm</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ảnh (URL)
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="px-6 py-3 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:bg-gray-400"
            >
              {isSubmitting
                ? isEditing
                  ? 'Đang lưu...'
                  : 'Đang tạo...'
                : isEditing
                ? 'Lưu'
                : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
