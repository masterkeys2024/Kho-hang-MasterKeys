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
    console.log('🚀 [DEBUG] Bắt đầu chạy fetchData');

    try {
      // 1. Thử gọi Products trước
      console.log('⏳ [DEBUG] Đang gọi listProducts()...');
      const { data: products, error: err1 } = await listProducts();
      
      if (err1) {
        console.error('❌ [DEBUG] Lỗi ở listProducts:', err1);
        throw err1;
      }
      console.log('✅ [DEBUG] listProducts OK! Số lượng:', products?.length);

      // 2. Thử gọi Groups sau
      console.log('⏳ [DEBUG] Đang gọi listGroups()...');
      const { data: groups, error: err2 } = await listGroups();

      if (err2) {
         console.error('❌ [DEBUG] Lỗi ở listGroups:', err2);
         throw err2;
      }
      console.log('✅ [DEBUG] listGroups OK! Số lượng:', groups?.length);

      // 3. Nếu cả 2 đều qua được thì xử lý data như cũ
      // (Copy đoạn code xử lý normalized của bạn vào đây nếu muốn test hiển thị)
      
      // Tạm thời alert ra để biết là đã thành công
      alert("Đã tải xong dữ liệu! Kiểm tra Console.");

    } catch (e: any) {
      console.error('💥 [DEBUG] Lỗi nghiêm trọng:', e);
      alert('Lỗi: ' + e.message);
    } finally {
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
