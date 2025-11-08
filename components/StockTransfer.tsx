import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from './Icons';
import { api } from '../services/mockApi';
import { Warehouse, Product, InventoryBalance, ProductVariant, TransactionType, StockTransaction, User, StockTransactionItem } from '../types';
import { useAuth } from '../App';

// Helper function to format date
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const generateTransferCode = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 900000) + 100000;
    return `CK${dateStr}-${randomPart}`;
};

// --- FORM COMPONENT ---
interface StockTransferFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}
type TransferItem = { variantId: number; qty: string; };

const StockTransferForm: React.FC<StockTransferFormProps> = ({ isOpen, onClose, onSave }) => {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [inventoryBalances, setInventoryBalances] = useState<InventoryBalance[]>([]);
    
    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [warehouseFromId, setWarehouseFromId] = useState('');
    const [warehouseToId, setWarehouseToId] = useState('');
    const [note, setNote] = useState('');
    const [items, setItems] = useState<TransferItem[]>([{ variantId: 0, qty: '' }]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [whData, prodData, balanceData] = await Promise.all([
                        api.getWarehouses(),
                        api.getProducts(),
                        api.getWarehouses().then(whs => Promise.all(whs.map(w => api.getInventoryForWarehouse(w.id)))).then(res => res.flat())
                    ]);
                    setWarehouses(whData);
                    setProducts(prodData);
                    setInventoryBalances(balanceData);
                } catch (err) {
                    setError("Không thể tải dữ liệu cần thiết.");
                }
            };
            fetchData();
        } else {
             setDate(new Date().toISOString().split('T')[0]);
            setWarehouseFromId('');
            setWarehouseToId('');
            setNote('');
            setItems([{ variantId: 0, qty: '' }]);
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const allVariants = useMemo(() => products.flatMap(p => p.variants.map(v => ({...v, productName: p.name}))), [products]);
    const handleItemChange = (index: number, field: keyof TransferItem, value: string) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };
    const addItem = () => setItems([...items, { variantId: 0, qty: '' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const getStockOnHand = (variantId: number): number => {
        if (!warehouseFromId || !variantId) return 0;
        const balance = inventoryBalances.find(b => b.warehouseId === parseInt(warehouseFromId) && b.variantId === variantId);
        return balance?.onhandQty || 0;
    };
    
    const handleTransferAll = () => {
        if (!warehouseFromId) {
            setError("Vui lòng chọn 'Từ kho' trước khi chuyển tất cả.");
            return;
        }

        const itemsInWarehouse = inventoryBalances
            .filter(b => b.warehouseId === parseInt(warehouseFromId) && b.onhandQty > 0);

        if (itemsInWarehouse.length === 0) {
            setError("Kho đã chọn không có sản phẩm nào để chuyển.");
            return;
        }

        const newItems: TransferItem[] = itemsInWarehouse.map(b => ({
            variantId: b.variantId,
            qty: String(b.onhandQty)
        }));

        setItems(newItems);
        setError(''); // Clear any previous errors
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!date || !warehouseFromId || !warehouseToId) {
            setError("Vui lòng chọn kho đi, kho đến và ngày chuyển."); return;
        }
        if (warehouseFromId === warehouseToId) {
            setError("Kho đi và kho đến không được trùng nhau."); return;
        }
        if (items.length === 0 || items.some(item => !item.variantId || Number(item.qty) <= 0)) {
            setError("Vui lòng thêm ít nhất một sản phẩm hợp lệ với số lượng lớn hơn 0."); return;
        }
        for (const item of items) {
            const stock = getStockOnHand(Number(item.variantId));
            if (stock < Number(item.qty)) {
                const variant = allVariants.find(v => v.id === Number(item.variantId));
                setError(`Không đủ tồn kho cho sản phẩm ${variant?.variantSku}. Tồn kho: ${stock}, Cần chuyển: ${item.qty}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const transactionData = {
                code: generateTransferCode(), date, type: TransactionType.TRANSFER,
                warehouseFromId: parseInt(warehouseFromId), warehouseToId: parseInt(warehouseToId),
                note, items: items.map(item => ({ variantId: Number(item.variantId), qty: Number(item.qty) || 0, unitCost: 0 })),
            };
            await api.createStockTransaction(transactionData, user!.id);
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo phiếu chuyển kho.");
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
                 <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Tạo phiếu Chuyển kho</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><Icons.XIcon className="w-6 h-6 text-gray-600" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Từ kho *</label>
                            <select value={warehouseFromId} onChange={e => setWarehouseFromId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                <option value="">-- Chọn kho đi --</option>
                                {warehouses.filter(w => w.id.toString() !== warehouseToId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Đến kho *</label>
                            <select value={warehouseToId} onChange={e => setWarehouseToId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                <option value="">-- Chọn kho đến --</option>
                                {warehouses.filter(w => w.id.toString() !== warehouseFromId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ngày chuyển *</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                    </div>
                     <div className="pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700">Chi tiết sản phẩm</label>
                        <div className="mt-2 space-y-3">{items.map((item, index) => (
                             <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-gray-50 border">
                                <div className="col-span-8 md:col-span-6">
                                    <select value={item.variantId} onChange={e => handleItemChange(index, 'variantId', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" disabled={!warehouseFromId}>
                                        <option value={0} disabled>Chọn sản phẩm</option>
                                        {allVariants.map(v => <option key={v.id} value={v.id}>{v.variantSku} - {v.productName}</option>)}
                                    </select>
                                    {item.variantId > 0 && <span className="text-xs text-gray-500 mt-1 block">Tồn kho: {getStockOnHand(Number(item.variantId))}</span>}
                                </div>
                                <div className="col-span-4 md:col-span-3">
                                    <input type="number" placeholder="Số lượng" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" min="1"/>
                                </div>
                                <div className="col-span-12 md:col-span-3 flex justify-end items-center">{items.length > 1 && (<button type="button" onClick={() => removeItem(index)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100"><Icons.TrashIcon className="w-4 h-4" /></button>)}</div>
                            </div>))}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium px-3 py-2 rounded-md hover:bg-primary-50">
                                <Icons.PlusCircleIcon className="w-4 h-4"/>
                                Thêm sản phẩm
                            </button>
                             <button
                                type="button"
                                onClick={handleTransferAll}
                                disabled={!warehouseFromId}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded-md hover:bg-blue-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={!warehouseFromId ? "Vui lòng chọn 'Từ kho' trước" : "Chuyển tất cả sản phẩm có tồn kho"}
                            >
                                <Icons.ArrowLeftRightIcon className="w-4 h-4"/>
                                Chuyển tất cả
                            </button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"></textarea>
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-400">
                        {isSubmitting ? 'Đang tạo...' : 'Tạo phiếu'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// --- DETAIL SIDEBAR COMPONENT ---
interface StockTransferDetailProps {
    transaction: StockTransaction; products: Product[]; warehouses: Warehouse[]; users: User[];
    onClose: () => void; onUpdate: () => void;
}
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
        <span className="text-sm text-gray-500 col-span-1">{label}</span>
        <div className="text-sm font-medium text-gray-800 text-right col-span-2">{children}</div>
    </div>
);
const StockTransferDetailSidebar: React.FC<StockTransferDetailProps> = ({ transaction, products, warehouses, users, onClose, onUpdate }) => {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const allVariants = useMemo(() => products.flatMap(p => p.variants.map(v => ({...v, productName: p.name, unit: p.unit}))), [products]);

    const details = useMemo(() => {
        const from = warehouses.find(w => w.id === transaction.warehouseFromId)?.name || 'N/A';
        const to = warehouses.find(w => w.id === transaction.warehouseToId)?.name || 'N/A';
        const creator = users.find(u => u.id === transaction.createdBy)?.name || 'N/A';
        const items = transaction.items.map(item => ({...item, variant: allVariants.find(v => v.id === item.variantId)}));
        const totalQty = transaction.items.reduce((sum, item) => sum + item.qty, 0);
        return { from, to, creator, items, totalQty };
    }, [transaction, warehouses, users, allVariants]);

    const handleDelete = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            await api.deleteTransaction(transaction.id, user!.id);
            setShowDeleteConfirm(false);
            onClose();
            onUpdate();
        } catch(err) {
            setError(err instanceof Error ? err.message : "Lỗi khi xóa phiếu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} aria-modal="true" role="dialog">
                <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <header className="flex justify-between items-center p-4 border-b bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-800">{transaction.code}</h2>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-md text-gray-600 hover:bg-gray-200"><Icons.EditIcon className="w-5 h-5" /> <span className="sr-only">Chỉnh sửa</span></button>
                            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-md text-gray-600 hover:bg-gray-200"><Icons.TrashIcon className="w-5 h-5 text-red-500" /> <span className="sr-only">Xóa</span></button>
                            <button onClick={onClose} className="p-2 rounded-md text-gray-600 hover:bg-gray-200"><Icons.XIcon className="w-6 h-6" /> <span className="sr-only">Đóng</span></button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="border-b pb-4">
                            <InfoRow label="Mã chuyển kho">{transaction.code}</InfoRow>
                            <InfoRow label="Ngày chuyển">{formatDate(transaction.date)}</InfoRow>
                            <InfoRow label="Lý do chuyển">{transaction.note || 'Thay đổi kệ'}</InfoRow>
                            <InfoRow label="Vị trí ban đầu">{details.from}</InfoRow>
                            <InfoRow label="Vị trí chuyển">{details.to}</InfoRow>
                            <InfoRow label="SL chuyển"><span className="font-bold text-lg">{details.totalQty}</span></InfoRow>
                            <InfoRow label="Ngày tạo">{formatDate(transaction.date)}</InfoRow>
                            <InfoRow label="Người tạo">{details.creator}</InfoRow>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800 mb-2">Sản phẩm đã chuyển</h3>
                            <div className="space-y-2">
                                {details.items.map(item => (
                                    <div key={item.id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.variant?.productName}</p>
                                            <p className="text-xs text-gray-500">{item.variant?.variantSku}</p>
                                        </div>
                                        <p className="font-bold text-gray-800">{item.qty} <span className="text-xs font-normal text-gray-500">{item.variant?.unit}</span></p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {error && <div className="bg-red-50 p-3 rounded-md text-sm text-red-700">{error}</div>}
                    </main>
                </div>
            </div>
            {showDeleteConfirm && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa</h3>
                            <p className="mt-2 text-sm text-gray-600">Bạn có chắc muốn xóa phiếu <strong className="text-gray-800">{transaction.code}</strong>? Tồn kho sẽ được hoàn lại.</p>
                        </div>
                        <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                            <button onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">{isSubmitting ? 'Đang xóa...' : 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- MAIN LIST VIEW ---
export default function StockTransfer() {
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);

    const fetchData = useCallback(async (updateSelected = false) => {
        setLoading(true);
        try {
            const [transData, whData, userData, prodData] = await Promise.all([
                api.getTransactions(), api.getWarehouses(), api.getUsers(), api.getProducts(),
            ]);
            setTransactions(transData.filter(t => t.type === 'TRANSFER'));
            setWarehouses(whData);
            setUsers(userData);
            setProducts(prodData);
            if (updateSelected && selectedTransaction) {
                setSelectedTransaction(transData.find(t => t.id === selectedTransaction.id) || null);
            }
        } catch (error) { console.error("Failed to fetch data:", error); } 
        finally { setLoading(false); }
    }, [selectedTransaction]);

    useEffect(() => { fetchData(); }, []);
    const handleSaveSuccess = () => { setIsFormOpen(false); fetchData(); };

    const getWarehouseName = (id?: number) => warehouses.find(w => w.id === id)?.name || '-';
    const getUserName = (id?: number) => users.find(u => u.id === id)?.name || '-';
    const allVariants = useMemo(() => products.flatMap(p => p.variants.map(v => ({...v, productName: p.name}))), [products]);

    const groupedTransactions = useMemo(() => {
        const groups: Record<string, StockTransaction[]> = {};
        transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(t => {
            const dateKey = t.date.split('T')[0];
            if (!groups[dateKey]) { groups[dateKey] = []; }
            groups[dateKey].push(t);
        });
        return groups;
    }, [transactions]);
    
    if (loading && transactions.length === 0) {
        return <div className="text-center p-10">Đang tải dữ liệu...</div>;
    }
    
    return (
        <>
            <div className="bg-white rounded-lg shadow-md">
                 <header className="flex items-center justify-between p-4 border-b">
                     <h1 className="text-xl font-bold text-gray-800">Chuyển kho</h1>
                     <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        <Icons.PlusIcon className="w-5 h-5" /> Thêm mới
                    </button>
                </header>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã chuyển kho</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Từ kho</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đến kho</th>
                                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SL chuyển</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                             {Object.keys(groupedTransactions).map(dateKey => (
                                <React.Fragment key={dateKey}>
                                    <tr className="bg-gray-100">
                                        <td colSpan={7} className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-primary-700">{formatDate(dateKey)}</span>
                                                <span className="text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">{groupedTransactions[dateKey].length}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {groupedTransactions[dateKey].map(t => {
                                        const totalQty = t.items.reduce((sum, i) => sum + i.qty, 0);
                                        const productSummary = t.items.map(item => allVariants.find(v => v.id === item.variantId)?.productName).slice(0, 2).join(', ') + (t.items.length > 2 ? '...' : '');
                                        return (
                                            <tr key={t.id} onClick={() => setSelectedTransaction(t)} className="hover:bg-primary-50 cursor-pointer border-b last:border-b-0">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-blue-600">{t.code}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 max-w-xs truncate" title={productSummary}>{productSummary || 'N/A'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getWarehouseName(t.warehouseFromId)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getWarehouseName(t.warehouseToId)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-gray-900">{totalQty}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={t.note}>{t.note || 'Thay đổi kệ'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getUserName(t.createdBy)}</td>
                                            </tr>
                                        )
                                    })}
                                </React.Fragment>
                            ))}
                            {transactions.length === 0 && !loading && (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-500">Chưa có phiếu chuyển kho nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <StockTransferForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSuccess} />
            {selectedTransaction && (
                <StockTransferDetailSidebar
                    transaction={selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    onUpdate={() => fetchData(true)}
                    products={products} warehouses={warehouses} users={users}
                />
            )}
        </>
    );
}