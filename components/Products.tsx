import React, { useState, useEffect, useMemo } from 'react';
import { listProducts, deleteProduct } from '../services/products';
import { listGroups } from '../services/productGroups';
import { ProductGroup, ProductWithStock } from '../types';
import ProductForm from './ProductForm';

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

  // Lấy tên nhóm theo id
  const groupName = (gid?: number | string | null) => {
    if (!gid || gid === 0) return 'Chưa phân nhóm';
    const g = groups.find((x) => String(x.id) === String(gid));
    return g?.name ?? '(nhóm đã xoá)';
  };

const fetchData = async () => {
    setLoading(true);
    try {
      console.log('[PRODUCTS] fetchData start');

      // Tối ưu: Gọi 2 API Products và Groups song song (Parallel)
      const [{ data: productRows, error: productError }, { data: groupRows, error: groupError }] =
        await Promise.all([listProducts(), listGroups()]);

      if (productError) throw productError;
      if (groupError) throw groupError;

      const normalized: ProductWithStock[] = (productRows ?? []).map((p: any) => ({
        id: p.id, // uuid trả về từ Supabase
        sku: p.sku,
        name: p.name,
        unit: p.unit ?? '',
        imageUrl: p.image_url ?? '',
        group: p.group_id
          ? { id: p.group_id, name: '' }
          : { id: 0, name: 'Chưa phân nhóm' },
        variants: [
          {
            id: p.id,
            productId: p.id,
            variantSku: p.sku,
            attributes: {},
            thresholds: {},
            totalStock: 0,
          },
        ],
      }));

      setProducts(normalized);
      setGroups(groupRows ?? []);
      console.log('[PRODUCTS] resp', {
        rows: normalized.length,
        sample: normalized[0],
      });
    } catch (e: any) {
      console.error('[PRODUCTS] fetchData error', e);
      alert('Lỗi tải danh sách sản phẩm: ' + (e?.message ?? 'Unknown error'));
    } finally {
      // Đảm bảo loading luôn tắt dù có lỗi hay không
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term);

      const matchGroup =
        !selectedGroup || String(p.group?.id) === String(selectedGroup);

      return matchTerm && matchGroup;
    });
  }, [products, searchTerm, selectedGroup]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductWithStock) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleDelete = async (p: ProductWithStock) => {
    if (!window.confirm(`Xoá sản phẩm "${p.name}"?`)) return;
    try {
      const { error } = await deleteProduct(String(p.id));
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      console.error('[PRODUCTS] delete error', e);
      alert('Không xoá được sản phẩm: ' + (e?.message ?? 'Unknown error'));
    }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
      {/* Thanh tìm kiếm + filter nhóm + nút thêm */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên hoặc SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div className="flex gap-3 items-center w-full md:w-auto">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Tất cả nhóm hàng</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            + Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      {loading ? (
        <p>Đang tải...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="mt-4 text-gray-500">Chưa có sản phẩm nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2">Nhóm sản phẩm</th>
                <th className="text-left px-3 py-2">Sản phẩm</th>
                <th className="text-left px-3 py-2">SKU</th>
                <th className="text-left px-3 py-2">ĐVT</th>
                <th className="text-right px-3 py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{groupName(p.group?.id)}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.sku}</td>
                  <td className="px-3 py-2">{p.unit}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(p)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal thêm / sửa sản phẩm */}
      <ProductForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productToEdit={editingProduct}
        onSave={async () => {
          await fetchData();
        }}
      />
    </div>
  );
};

export default Products;
