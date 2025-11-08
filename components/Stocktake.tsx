import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from './Icons';
import { api } from '../services/mockApi';
import { Warehouse, Product, InventoryBalance, ProductVariant, TransactionType } from '../types';
import { useAuth } from '../App';

type StocktakeItem = {
    variant: ProductVariant & { productName: string };
    systemQty: number;
    actualQty: string;
};

const generateAdjustCode = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 900000) + 100000;
    return `KK${dateStr}-${randomPart}`;
};

export default function Stocktake() {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [stocktakeList, setStocktakeList] = useState<StocktakeItem[]>([]);
    const [note, setNote] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedVariants, setSelectedVariants] = useState<Set<number>>(new Set());
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [bulkEditQuantity, setBulkEditQuantity] = useState('');


    useEffect(() => {
        api.getWarehouses().then(setWarehouses);
        api.getProducts().then(setProducts);
    }, []);

    const allVariants = useMemo(() => products.flatMap(p => 
        p.variants.map(v => ({...v, productName: p.name}))
    ), [products]);

    useEffect(() => {
        const fetchInventory = async () => {
            if (!selectedWarehouseId) {
                setStocktakeList([]);
                return;
            }
            setLoading(true);
            try {
                const balances = await api.getInventoryForWarehouse(parseInt(selectedWarehouseId));
                const balanceMap = new Map(balances.map(b => [b.variantId, b.onhandQty]));
                
                const list: StocktakeItem[] = allVariants.map(variant => ({
                    variant,
                    systemQty: balanceMap.get(variant.id) || 0,
                    actualQty: (balanceMap.get(variant.id) || 0).toString(),
                }));
                setStocktakeList(list);
            } catch (err) {
                setError("Không thể tải dữ liệu tồn kho.");
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, [selectedWarehouseId, allVariants]);

    const handleActualQtyChange = (variantId: number, value: string) => {
        setStocktakeList(prevList => 
            prevList.map(item => 
                item.variant.id === variantId ? { ...item, actualQty: value } : item
            )
        );
    };

    const filteredList = useMemo(() => {
        return stocktakeList.filter(item => {
            const query = searchTerm.toLowerCase();
            return (
                item.variant.productName.toLowerCase().includes(query) ||
                item.variant.variantSku.toLowerCase().includes(query)
            );
        });
    }, [stocktakeList, searchTerm]);

    useEffect(() => {
        // Clear selection if filtered list changes
        setSelectedVariants(new Set());
    }, [searchTerm, selectedWarehouseId]);

    const itemsToAdjust = useMemo(() => {
        return stocktakeList.filter(item => {
            const actual = parseFloat(item.actualQty);
            return !isNaN(actual) && actual !== item.systemQty;
        });
    }, [stocktakeList]);

    const handleSelectVariant = (variantId: number) => {
        setSelectedVariants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(variantId)) {
                newSet.delete(variantId);
            } else {
                newSet.add(variantId);
            }
            return newSet;
        });
    };

    const isAllSelected = filteredList.length > 0 && selectedVariants.size === filteredList.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedVariants(new Set());
        } else {
            setSelectedVariants(new Set(filteredList.map(item => item.variant.id)));
        }
    };

    const handleBulkUpdate = () => {
        if (bulkEditQuantity === '' || isNaN(Number(bulkEditQuantity))) {
            return; // Or show validation in modal
        }
        const newQuantity = bulkEditQuantity;
        setStocktakeList(prevList => {
            return prevList.map(item => {
                if (selectedVariants.has(item.variant.id)) {
                    return { ...item, actualQty: newQuantity };
                }
                return item;
            });
        });
        setIsBulkEditModalOpen(false);
        setBulkEditQuantity('');
        setSelectedVariants(new Set()); // Clear selection after update
    };

    const handleSubmit = async () => {
        if (itemsToAdjust.length === 0) {
            setError("Không có thay đổi nào để ghi nhận. Vui lòng điều chỉnh số lượng thực tế.");
            return;
        }
        setError('');
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            const transactionData = {
                code: generateAdjustCode(),
                date: new Date().toISOString().split('T')[0],
                type: TransactionType.ADJUST,
                warehouseFromId: parseInt(selectedWarehouseId), // Use fromId for the location of adjustment
                note: note || `Kiểm kê kho ${warehouses.find(w => w.id === parseInt(selectedWarehouseId))?.name}`,
                items: itemsToAdjust.map(item => ({
                    variantId: item.variant.id,
                    qty: parseFloat(item.actualQty) - item.systemQty, // The difference
                    unitCost: 0 // Cost is not relevant for adjustment here
                }))
            };

            await api.createStockTransaction(transactionData, user!.id);
            setSuccessMessage(`Đã tạo thành công phiếu điều chỉnh ${transactionData.code} với ${itemsToAdjust.length} dòng sản phẩm.`);
            setNote('');
            // Refetch inventory to show updated numbers
            const balances = await api.getInventoryForWarehouse(parseInt(selectedWarehouseId));
            const balanceMap = new Map(balances.map(b => [b.variantId, b.onhandQty]));
            setStocktakeList(prev => prev.map(item => ({
                ...item,
                systemQty: balanceMap.get(item.variant.id) || 0,
                actualQty: (balanceMap.get(item.variant.id) || 0).toString()
            })));

        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo phiếu điều chỉnh.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md space-y-6">
            <div>
                 <h1 className="text-xl font-bold text-gray-800">
                    <Link to="/warehouses" className="text-primary-600 hover:underline">Menu</Link>
                    <span className="text-gray-400 mx-2">&gt;</span>
                    <span>Kiểm kho / Điều chỉnh tồn kho</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">Chọn kho và nhập số lượng thực tế để điều chỉnh chênh lệch.</p>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
                <label htmlFor="warehouse-select" className="block text-sm font-medium text-gray-700 mb-1">Chọn kho để kiểm kê *</label>
                <select 
                    id="warehouse-select"
                    value={selectedWarehouseId}
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">-- Chọn kho --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                </select>
            </div>

            {selectedWarehouseId && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                         <div className="relative w-full md:w-1/2">
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo Tên hoặc SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <Icons.SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>
                    </div>

                    {selectedVariants.size > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col md:flex-row justify-between items-center mb-4 gap-3 animate-fade-in">
                            <p className="text-sm font-medium text-blue-800">
                                Đã chọn <span className="font-bold">{selectedVariants.size}</span> sản phẩm.
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => setIsBulkEditModalOpen(true)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5">
                                    <Icons.EditIcon className="w-4 h-4" />
                                    Chỉnh sửa
                                </button>
                                <button onClick={() => setSelectedVariants(new Set())} className="px-3 py-1.5 text-sm bg-white text-blue-700 border border-blue-600 rounded-md hover:bg-blue-100">
                                    Bỏ chọn
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? <p>Đang tải tồn kho...</p> : (
                         <div className="overflow-x-auto border rounded-lg">
                             <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                onChange={handleSelectAll}
                                                disabled={filteredList.length === 0}
                                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                aria-label="Chọn tất cả"
                                            />
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn hệ thống</th>
                                        <th className="w-40 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng thực tế</th>
                                        <th className="w-32 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chênh lệch</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredList.map(item => {
                                        const actual = parseFloat(item.actualQty);
                                        const diff = isNaN(actual) ? 0 : actual - item.systemQty;
                                        const isSelected = selectedVariants.has(item.variant.id);
                                        return (
                                            <tr key={item.variant.id} className={`${diff !== 0 ? 'bg-yellow-50' : ''} ${isSelected ? 'bg-blue-50' : ''}`}>
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectVariant(item.variant.id)}
                                                        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{item.variant.variantSku}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{item.variant.productName}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-800 font-semibold">{item.systemQty}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                    <input 
                                                        type="number"
                                                        value={item.actualQty}
                                                        onChange={e => handleActualQtyChange(item.variant.id, e.target.value)}
                                                        className="w-full p-1 border rounded-md text-center focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                </td>
                                                <td className={`px-3 py-2 whitespace-nowrap text-sm text-center font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                             </table>
                         </div>
                    )}

                    <div className="mt-6">
                        <label htmlFor="note" className="block text-sm font-medium text-gray-700">Ghi chú / Lý do điều chỉnh</label>
                        <textarea
                            id="note"
                            rows={3}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="mt-1 w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="VD: Kiểm kê định kỳ cuối tháng"
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-600 mt-4 p-3 bg-red-50 rounded-md">{error}</p>}
                    {successMessage && <p className="text-sm text-green-600 mt-4 p-3 bg-green-50 rounded-md">{successMessage}</p>}

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || itemsToAdjust.length === 0}
                            className="flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                        >
                            <Icons.SaveIcon className="w-5 h-5 mr-2" />
                            {isSubmitting ? 'Đang xử lý...' : `Xác nhận điều chỉnh (${itemsToAdjust.length} thay đổi)`}
                        </button>
                    </div>
                </div>
            )}

            {isBulkEditModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900">Chỉnh sửa hàng loạt</h3>
                            <p className="text-sm text-gray-600 mt-2">
                                Nhập số lượng thực tế mới để cập nhật cho 
                                <strong className="text-gray-800"> {selectedVariants.size} </strong> 
                                sản phẩm đã chọn.
                            </p>
                            <div className="mt-4">
                                <label htmlFor="bulk-quantity" className="block text-sm font-medium text-gray-700">
                                    Số lượng thực tế mới
                                </label>
                                <input
                                    id="bulk-quantity"
                                    type="number"
                                    value={bulkEditQuantity}
                                    onChange={(e) => setBulkEditQuantity(e.target.value)}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleBulkUpdate()}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsBulkEditModalOpen(false);
                                    setBulkEditQuantity('');
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkUpdate}
                                className="px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700"
                            >
                                Cập nhật hàng loạt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}