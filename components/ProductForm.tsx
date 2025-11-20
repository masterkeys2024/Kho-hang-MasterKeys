import React, { useState, useEffect, useMemo } from 'react';
import { createProduct, updateProduct, deleteProduct } from '../services/products';
import { listGroups } from '../services/productGroups';
import { ProductGroup, ProductVariant, Warehouse, ProductWithStock } from '../types';
import * as Icons from './Icons';
import { useAuth } from '../App';

// Form Modal Component
interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    productToEdit?: ProductWithStock | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSave, productToEdit }) => {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [groups, setGroups] = useState<ProductGroup[]>([]);

    // Form state
    const [productName, setProductName] = useState('');
    const [productSku, setProductSku] = useState('');
    const [productGroupId, setProductGroupId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [unit, setUnit] = useState('Cái');
    const [imageUrl, setImageUrl] = useState('https://picsum.photos/200/200');
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState<(Partial<ProductVariant> & {variantSku: string, initialStock?: Record<number, number>})[]>([
        { variantSku: '', color: '', size: '', thresholds: {}, initialStock: {} }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isEditMode = !!productToEdit;

    const resetForm = () => {
        setProductName('');
        setProductSku('');
        setProductGroupId('');
        setSelectedWarehouseId('');
        setUnit('Cái');
        setImageUrl('https://picsum.photos/200/200');
        setHasVariants(false);
        setVariants([{ variantSku: '', color: '', size: '', thresholds: {}, initialStock: {} }]);
        setError('');
    };

    useEffect(() => {
        if (isOpen) {
      setWarehouses([]); // chưa nối DB kho => để rỗng
      listGroups().then(({ data }) => setGroups(data ?? [])); // NẠP NHÓM
            if (isEditMode && productToEdit) {
                setProductName(productToEdit.name);
                setProductSku(productToEdit.sku);
                setProductGroupId(productToEdit.group?.id && productToEdit.group.id !== 0 ? String(productToEdit.group.id) : '');
                setUnit(productToEdit.unit);
                setImageUrl(productToEdit.imageUrl);
                setVariants(productToEdit.variants.map(v => ({ ...v }))); // Copy variants
                
                // FIX: Coerce values to boolean to prevent type error with setHasVariants.
                // The `||` operator on strings returns the string, not a boolean.
                const hasMultipleOrComplexVariants = productToEdit.variants.length > 1 || 
                    (productToEdit.variants.length === 1 && (
                        !!productToEdit.variants[0].color || 
                        !!productToEdit.variants[0].size ||
                        (productToEdit.variants[0].attributes && Object.keys(productToEdit.variants[0].attributes).length > 0)
                    ));
                setHasVariants(hasMultipleOrComplexVariants);
                
                setError('');
            } else {
                resetForm();
            }
        }
    }, [isOpen, productToEdit, isEditMode]);
    
     useEffect(() => {
        // When switching to simple product, ensure we only have one variant definition
        if (!hasVariants) {
            const firstVariant = variants[0] || {};
            setVariants([{ 
                ...firstVariant,
                variantSku: '',
                color: '',
                size: '',
            }]);
        }
    }, [hasVariants]);

    const displayedWarehouses = useMemo(() => {
        if (!selectedWarehouseId) {
            return warehouses;
        }
        return warehouses.filter(wh => wh.id === parseInt(selectedWarehouseId));
    }, [warehouses, selectedWarehouseId]);

    const handleVariantChange = (index: number, field: keyof ProductVariant, value: string) => {
        const newVariants = [...variants];
        (newVariants[index] as any)[field] = value;
        setVariants(newVariants);
    };

    const handleInitialStockChange = (variantIndex: number, warehouseId: number, value: number) => {
        const newVariants = [...variants];
        const variant = newVariants[variantIndex];
        if (!variant.initialStock) {
            variant.initialStock = {};
        }
        variant.initialStock[warehouseId] = value;
        setVariants(newVariants);
    };
    
    const addVariant = () => {
        setVariants([...variants, { variantSku: '', color: '', size: '', thresholds: {} }]);
    };
    
    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

   const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  try {
    // Lấy dữ liệu từ state của form (đang có sẵn trong file của bạn)
    // tên state phổ biến: productSku, productName, unit ...
const payload = {
  sku: (productSku || '').trim(),
  name: (productName || '').trim(),
  unit: (unit || '').trim() || null,
  group_id: productGroupId || null,   // để nguyên string uuid
};


    if (!payload.sku || !payload.name) {
      setError('Vui lòng nhập SKU và Tên sản phẩm.');
      setIsSubmitting(false);
      return;
    }

    if (isEditMode && productToEdit) {
      const { error } = await updateProduct(productToEdit.id, payload);
      if (error) throw error;
    } else {
      const { error } = await createProduct(payload);
      if (error) throw error;
    }

    // Báo cho parent refetch + đóng modal
    onSave?.();
    onClose();
  } catch (err: any) {
    setError(err?.message || 'Đã xảy ra lỗi khi lưu sản phẩm.');
  } finally {
    setIsSubmitting(false);
  }
};

const handleDeleteProduct = async () => {
  if (!productToEdit) return;
  if (!confirm('Bạn có chắc muốn xoá sản phẩm này?')) return;

  try {
    const { error } = await deleteProduct(productToEdit.id);
    if (error) throw error;
    onSave?.();
    onClose();
  } catch (err: any) {
    setError(err?.message || 'Không thể xoá sản phẩm.');
  }
};


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg md:max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 md:p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm mới'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tên sản phẩm*</label>
                                <input type="text" value={productName} onChange={e => setProductName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Mã sản phẩm (SKU)*</label>
                                <input type="text" value={productSku} onChange={e => setProductSku(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nhóm sản phẩm*</label>
                                <select value={productGroupId} onChange={e => setProductGroupId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">Chọn nhóm</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Đơn vị tính</label>
                                <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                        </div>

                         <div className="pt-2">
                            <div className="flex items-center">
                                <input
                                    id="has-variants-checkbox"
                                    type="checkbox"
                                    checked={hasVariants}
                                    onChange={e => setHasVariants(e.target.checked)}
                                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="has-variants-checkbox" className="ml-3 block text-sm font-medium text-gray-700">
                                    Sản phẩm này có nhiều lựa chọn (ví dụ: màu sắc, kích thước)
                                </label>
                            </div>
                        </div>

                        {/* Variants Section */}
                        {hasVariants ? (
                            <div className="pt-4 border-t">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Các phiên bản</h3>
                                <div className="space-y-4">
                                {variants.map((variant, index) => (
                                    <div key={variant.id || index} className="p-4 border rounded-md bg-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input type="text" placeholder="SKU phiên bản*" value={variant.variantSku} onChange={e => handleVariantChange(index, 'variantSku', e.target.value)} required className="border-gray-300 rounded-md shadow-sm"/>
                                            <input type="text" placeholder="Màu sắc" value={variant.color || ''} onChange={e => handleVariantChange(index, 'color', e.target.value)} className="border-gray-300 rounded-md shadow-sm"/>
                                            <input type="text" placeholder="Kích thước" value={variant.size || ''} onChange={e => handleVariantChange(index, 'size', e.target.value)} className="border-gray-300 rounded-md shadow-sm"/>
                                            {variants.length > 1 && <button type="button" onClick={() => removeVariant(index)} className="text-red-500 hover:text-red-700 justify-self-end"><Icons.TrashIcon className="w-5 h-5"/></button>}
                                        </div>
                                        {!isEditMode && (
                                            <div className="mt-3 pt-3 border-t">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-medium text-gray-600">Tồn kho ban đầu</label>
                                                    <select value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)} className="block border-gray-300 rounded-md shadow-sm text-xs p-1">
                                                        <option value="">Tất cả kho</option>
                                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-1 gap-x-4 gap-y-2 mt-1">
                                                    {displayedWarehouses.map(wh => (
                                                        <div key={wh.id} className="grid items-center gap-2 grid-cols-2">
                                                            <label className="text-sm text-gray-500 truncate col-span-1">{wh.name}:</label>
                                                            <input type="number" placeholder="Tồn ban đầu" onChange={e => handleInitialStockChange(index, wh.id, parseInt(e.target.value) || 0)} className="w-full border-gray-300 rounded-md shadow-sm text-sm col-span-1"/>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                </div>
                                 <button type="button" onClick={addVariant} className="mt-2 text-sm text-primary-600 hover:text-primary-800 flex items-center">
                                    <Icons.PlusCircleIcon className="w-4 h-4 mr-1"/>Thêm phiên bản
                                </button>
                            </div>
                        ) : (
                            !isEditMode && (
                                <div className="pt-4 border-t">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-medium text-gray-900">Tồn kho ban đầu</h3>
                                         <select value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)} className="block border-gray-300 rounded-md shadow-sm text-xs p-1">
                                            <option value="">Tất cả kho</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="p-4 border rounded-md bg-gray-50">
                                         <div className="grid grid-cols-1 gap-x-4 gap-y-2 mt-1">
                                             {displayedWarehouses.map(wh => (
                                                 <div key={wh.id} className="grid items-center gap-2 grid-cols-2">
                                                     <label className="text-sm text-gray-500 truncate col-span-1">{wh.name}:</label>
                                                     <input 
                                                        type="number" 
                                                        placeholder="Tồn ban đầu"
                                                        value={variants[0]?.initialStock?.[wh.id] || ''}
                                                        onChange={e => handleInitialStockChange(0, wh.id, parseInt(e.target.value) || 0)} 
                                                        className="w-full border-gray-300 rounded-md shadow-sm text-sm col-span-1"/>
                                                 </div>
                                             ))}
                                             {displayedWarehouses.length === 0 && warehouses.length > 0 && <p className="text-sm text-gray-500 col-span-2">Kho được chọn không tồn tại.</p>}
                                         </div>
                                    </div>
                                </div>
                            )
                        )}
                        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
                    </div>

                    <div className="p-4 md:p-6 bg-gray-50 border-t flex justify-end items-center gap-3">
                        {isEditMode && (
                             <button 
                                type="button" 
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-400 mr-auto"
                            >
                                Xóa sản phẩm
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-400">
                             {isSubmitting ? 'Đang lưu...' : (isEditMode ? 'Cập nhật' : 'Lưu sản phẩm')}
                        </button>
                    </div>
                </form>
            </div>
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" aria-modal="true" role="dialog">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa</h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                    Bạn có chắc chắn muốn xóa sản phẩm <strong className="text-gray-800">{productToEdit?.name}</strong>? Hành động này không thể hoàn tác.
                                </p>
                                <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                                    Lưu ý: Toàn bộ dữ liệu tồn kho liên quan cũng sẽ bị xóa.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-200">Hủy</button>
                            <button onClick={handleDeleteProduct} disabled={isSubmitting} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-400">
                                {isSubmitting ? 'Đang xóa...' : 'Xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductForm;
