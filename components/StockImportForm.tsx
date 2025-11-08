import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from './Icons';
import { api } from '../services/mockApi';
import { Warehouse, Supplier, Product, TransactionType } from '../types';
import { useAuth } from '../App';

interface StockImportFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

type FormItem = {
    variantId: number;
    qty: string;
    unitCost: string;
};

// Auto-generate a unique import code
const generateImportCode = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 900000) + 100000;
    return `NK${dateStr}-${randomPart}`;
};

export default function StockImportForm({ isOpen, onClose, onSave }: StockImportFormProps) {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    
    // Form state
    const [code, setCode] = useState(generateImportCode());
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState<number | undefined>(undefined);
    const [warehouseToId, setWarehouseToId] = useState<number | undefined>(undefined);
    const [note, setNote] = useState('');
    const [items, setItems] = useState<FormItem[]>([{ variantId: 0, qty: '', unitCost: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const allVariants = useMemo(() => {
        return products.flatMap(p => 
            p.variants.map(v => ({
                ...v,
                productName: p.name
            }))
        );
    }, [products]);

    useEffect(() => {
        if (isOpen) {
            // Fetch necessary data when form opens
            const fetchData = async () => {
                try {
                    const [whData, supData, prodData] = await Promise.all([
                        api.getWarehouses(),
                        api.getSuppliers(),
                        api.getProducts()
                    ]);
                    setWarehouses(whData);
                    setSuppliers(supData);
                    setProducts(prodData);
                    // Set default warehouse if not set
                    if (!warehouseToId && whData.length > 0) {
                        setWarehouseToId(whData[0].id);
                    }
                } catch (err) {
                    setError("Không thể tải dữ liệu cần thiết cho form.");
                }
            };
            fetchData();
        } else {
            // Reset form when closed
            setCode(generateImportCode());
            setDate(new Date().toISOString().split('T')[0]);
            setSupplierId(undefined);
            setWarehouseToId(warehouses.length > 0 ? warehouses[0].id : undefined);
            setNote('');
            setItems([{ variantId: 0, qty: '', unitCost: '' }]);
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, warehouses]);

    const handleItemChange = (index: number, field: keyof FormItem, value: string) => {
        const newItems = [...items];
        if (field === 'variantId') {
            newItems[index].variantId = Number(value);
        } else { // qty or unitCost
            newItems[index][field] = value;
        }
        setItems(newItems);
    };
    
    const addItem = () => {
        setItems([...items, { variantId: 0, qty: '', unitCost: '' }]);
    };
    
    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!code || !date || !warehouseToId) {
            setError("Vui lòng điền đầy đủ các trường bắt buộc (*).");
            return;
        }
        if (items.length === 0 || items.some(item => !item.variantId || Number(item.qty) <= 0)) {
            setError("Vui lòng thêm ít nhất một sản phẩm hợp lệ với số lượng lớn hơn 0.");
            return;
        }

        setIsSubmitting(true);
        try {
            const transactionData = {
                code,
                date,
                type: TransactionType.IMPORT,
                supplierId,
                warehouseToId,
                note,
                items: items.map(item => ({
                    variantId: item.variantId,
                    qty: Number(item.qty) || 0,
                    unitCost: Number(item.unitCost) || 0
                })),
            };
            await api.createStockTransaction(transactionData, user!.id);
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu phiếu nhập.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40" onClick={onClose}>
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <div className="flex items-center">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 mr-2">
                            <Icons.XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                        <h2 className="text-lg font-bold text-gray-800">NHẬP KHO Form</h2>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy bỏ</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-400">
                             {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phiếu nhập kho*</label>
                                <input type="text" value={code} onChange={e => setCode(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Loại nhập</label>
                                <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm bg-gray-100" disabled>
                                    <option>Nhập tồn kho</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ngày nhập*</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nhà cung cấp</label>
                                <select value={supplierId || ''} onChange={e => setSupplierId(Number(e.target.value))} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
                                    <option value="">Chọn nhà cung cấp</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">KHO*</label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {warehouses.map(wh => (
                                    <button
                                        key={wh.id}
                                        type="button"
                                        onClick={() => setWarehouseToId(wh.id)}
                                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                                            warehouseToId === wh.id 
                                            ? 'bg-primary-600 text-white border-primary-600' 
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {wh.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                             <label className="block text-sm font-medium text-gray-700">Chi tiết nhập kho</label>
                             <div className="mt-2 space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 border">
                                        <div className="col-span-5">
                                             <select 
                                                value={item.variantId} 
                                                onChange={e => handleItemChange(index, 'variantId', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm text-sm"
                                            >
                                                <option value={0} disabled>Chọn sản phẩm</option>
                                                {allVariants.map(v => (
                                                    <option key={v.id} value={v.id}>
                                                        {v.variantSku} - {v.productName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="number" placeholder="Số lượng" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" min="1"/>
                                        </div>
                                         <div className="col-span-3">
                                            <input type="number" placeholder="Đơn giá" value={item.unitCost} onChange={e => handleItemChange(index, 'unitCost', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" min="0"/>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100">
                                                    <Icons.TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                             </div>
                             <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium px-3 py-2 rounded-md hover:bg-primary-50">
                                <Icons.PlusCircleIcon className="w-4 h-4"/>
                                Mới
                             </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"></textarea>
                        </div>
                        
                        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                    </form>
                </div>
            </div>
        </div>
    );
}