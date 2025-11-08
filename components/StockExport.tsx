import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from './Icons';
import { api } from '../services/mockApi';
import { StockTransaction, Warehouse, User, Product, TransactionType, StockTransactionItem, ProductVariant, InventoryBalance, Employee } from '../types';
import { useAuth } from '../App';

declare const pdfMake: any;

// Helper function to format currency
const formatCurrency = (value: number, useSymbol = false) => {
    if (useSymbol) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }
    return new Intl.NumberFormat('vi-VN').format(value);
};

// Helper function to format date
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// --- FORM COMPONENT ---
interface StockExportFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

type FormItem = {
    variantId: number;
    qty: string;
    unitCost: string;
};

const generateExportCode = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 900000) + 100000;
    return `XK${dateStr}-${randomPart}`;
};

const StockExportForm: React.FC<StockExportFormProps> = ({ isOpen, onClose, onSave }) => {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [inventoryBalances, setInventoryBalances] = useState<InventoryBalance[]>([]);
    
    // Form state
    const [code, setCode] = useState(generateExportCode());
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [warehouseFromId, setWarehouseFromId] = useState<number | undefined>(undefined);
    const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
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
            const fetchData = async () => {
                try {
                    const [whData, empData, prodData, balanceData] = await Promise.all([
                        api.getWarehouses(),
                        api.getEmployees(),
                        api.getProducts(),
                        api.getWarehouses().then(whs => Promise.all(whs.map(w => api.getInventoryForWarehouse(w.id)))).then(res => res.flat())
                    ]);
                    setWarehouses(whData);
                    setEmployees(empData);
                    setProducts(prodData);
                    setInventoryBalances(balanceData);
                    if (!warehouseFromId && whData.length > 0) {
                        setWarehouseFromId(whData[0].id);
                    }
                } catch (err) {
                    setError("Không thể tải dữ liệu cần thiết cho form.");
                }
            };
            fetchData();
        } else {
            // Reset form
            setCode(generateExportCode());
            setDate(new Date().toISOString().split('T')[0]);
            setWarehouseFromId(warehouses.length > 0 ? warehouses[0].id : undefined);
            setEmployeeId(undefined);
            setNote('');
            setItems([{ variantId: 0, qty: '', unitCost: '' }]);
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleItemChange = (index: number, field: keyof FormItem, value: string) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };
    
    const addItem = () => {
        setItems([...items, { variantId: 0, qty: '', unitCost: '' }]);
    };
    
    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const getStockOnHand = (variantId: number): number => {
        if (!warehouseFromId || !variantId) return 0;
        const balance = inventoryBalances.find(b => b.warehouseId === warehouseFromId && b.variantId === variantId);
        return balance?.onhandQty || 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!code || !date || !warehouseFromId) {
            setError("Vui lòng điền đầy đủ các trường bắt buộc (*).");
            return;
        }
        if (items.length === 0 || items.some(item => !item.variantId || Number(item.qty) <= 0)) {
            setError("Vui lòng thêm ít nhất một sản phẩm hợp lệ với số lượng lớn hơn 0.");
            return;
        }

        // Stock availability check
        for (const item of items) {
            const stock = getStockOnHand(Number(item.variantId));
            if (stock < Number(item.qty)) {
                const variant = allVariants.find(v => v.id === Number(item.variantId));
                setError(`Không đủ tồn kho cho sản phẩm ${variant?.variantSku}. Tồn kho: ${stock}, Cần xuất: ${item.qty}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const transactionData = {
                code,
                date,
                type: TransactionType.EXPORT,
                warehouseFromId,
                employeeId,
                note,
                items: items.map(item => ({
                    variantId: Number(item.variantId),
                    qty: Number(item.qty) || 0,
                    unitCost: Number(item.unitCost) || 0
                })),
            };
            await api.createStockTransaction(transactionData, user!.id);
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu phiếu xuất.");
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
                    <div className="flex items-center">
                         <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 mr-2"><Icons.XIcon className="w-6 h-6 text-gray-600" /></button>
                         <h2 className="text-lg font-bold text-gray-800">Tạo Phiếu Xuất Kho</h2>
                    </div>
                     <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy bỏ</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-400">
                             {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
                 <div className="flex-1 overflow-y-auto p-6">
                     <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mã phiếu xuất*</label>
                                <input type="text" value={code} onChange={e => setCode(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ngày xuất*</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Người nhận (Nhân viên)</label>
                                <select value={employeeId || ''} onChange={e => setEmployeeId(Number(e.target.value) || undefined)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Kho xuất*</label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {warehouses.map(wh => (
                                    <button
                                        key={wh.id}
                                        type="button"
                                        onClick={() => setWarehouseFromId(wh.id)}
                                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                                            warehouseFromId === wh.id 
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
                             <label className="block text-sm font-medium text-gray-700">Chi tiết xuất kho</label>
                             <div className="mt-2 space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-gray-50 border">
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
                                            {item.variantId > 0 && <span className="text-xs text-gray-500 mt-1 block">Tồn kho: {getStockOnHand(Number(item.variantId))}</span>}
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

// --- DETAIL SIDEBAR COMPONENT ---
interface StockExportDetailProps {
    transaction: StockTransaction;
    products: Product[];
    warehouses: Warehouse[];
    users: User[];
    employees: Employee[];
    onClose: () => void;
    onUpdate: () => void;
}

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex justify-between items-center py-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-800 text-right">{children}</span>
    </div>
);

const StockExportDetailSidebar: React.FC<StockExportDetailProps> = ({ 
    transaction, 
    products, 
    warehouses, 
    users,
    employees,
    onClose,
    onUpdate
}) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<StockTransaction | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<StockTransaction | null>(null);

     const allVariants = useMemo(() => 
        products.flatMap(p => p.variants.map(v => ({...v, productName: p.name, unit: p.unit})))
    , [products]);

    const transactionDetails = useMemo(() => {
        const currentData = isEditing && formData ? formData : transaction;
        const itemsWithDetails = currentData.items.map(item => {
            const variant = allVariants.find(v => v.id === item.variantId);
            return {
                ...item,
                variant: variant,
                variantName: variant?.productName || 'N/A',
                variantSku: variant?.variantSku || 'N/A',
                unit: variant?.unit || 'N/A',
                total: item.qty * item.unitCost,
            };
        });

        const totalQty = itemsWithDetails.reduce((sum, item) => sum + Number(item.qty), 0);
        const totalAmount = itemsWithDetails.reduce((sum, item) => sum + item.total, 0);
        const warehouseName = warehouses.find(w => w.id === currentData.warehouseFromId)?.name || 'N/A';
        const creatorName = users.find(u => u.id === currentData.createdBy)?.name || 'N/A';
        const employeeName = employees.find(e => e.id === currentData.employeeId)?.name || '-';


        return {
            items: itemsWithDetails,
            totalQty,
            totalAmount,
            warehouseName,
            creatorName,
            employeeName
        };
    }, [transaction, formData, isEditing, allVariants, warehouses, users, employees]);

    const handleEditClick = () => {
        setFormData(JSON.parse(JSON.stringify(transaction)));
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData(null);
        setError('');
    };
    
    const handleFormChange = (field: keyof StockTransaction, value: any) => {
        if (formData) {
            setFormData({ ...formData, [field]: value });
        }
    };
    
    const handleItemChange = (index: number, field: keyof StockTransactionItem, value: any) => {
        if (formData) {
            const newItems = [...formData.items];
            (newItems[index] as any)[field] = value;
            setFormData({ ...formData, items: newItems });
        }
    };

    const handleAddItem = () => {
        if (formData) {
            const newItem: StockTransactionItem = { id: Date.now(), variantId: 0, qty: 1, unitCost: 0 };
            setFormData({ ...formData, items: [...formData.items, newItem] });
        }
    };

    const handleRemoveItem = (index: number) => {
        if (formData) {
            setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
        }
    };

    const handleSaveEdit = async () => {
        if (!formData) return;
        setError('');

        if (!formData.date) {
            setError("Vui lòng điền ngày xuất.");
            return;
        }
        if (formData.items.length === 0 || formData.items.some(item => !item.variantId || Number(item.qty) <= 0)) {
            setError("Vui lòng thêm ít nhất một sản phẩm hợp lệ với số lượng lớn hơn 0.");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.updateStockTransaction(
                formData.id,
                {
                    date: formData.date,
                    note: formData.note,
                    employeeId: formData.employeeId,
                    items: formData.items.map(({ id, ...item }) => ({
                        ...item,
                        id: String(id).startsWith('1') ? id : undefined,
                        qty: Number(item.qty) || 0,
                        unitCost: Number(item.unitCost) || 0
                    }))
                },
                user!.id
            );
            setIsEditing(false);
            onUpdate();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi cập nhật.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        setIsSubmitting(true);
        setError('');
        try {
            await api.deleteTransaction(showDeleteConfirm.id, user!.id);
            // FIX: Argument of type 'boolean' is not assignable to parameter of type 'SetStateAction<StockTransaction>'.
            setShowDeleteConfirm(null);
            onClose();
            onUpdate();
        } catch(err) {
            setError(err instanceof Error ? err.message : "Lỗi khi xóa phiếu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateStockExportPDF = () => {
        const tableBody = [
            [{text: 'Stt', style: 'tableHeader'}, {text: 'Tên sản phẩm', style: 'tableHeader'}, {text: 'SKU', style: 'tableHeader'}, {text: 'Đơn giá', style: 'tableHeader'}, {text: 'Số lượng', style: 'tableHeader'}, {text: 'Thành tiền', style: 'tableHeader'}],
            ...transactionDetails.items.map((item, index) => {
                return [
                    { text: index + 1, alignment: 'center' },
                    item.variantName,
                    item.variantSku,
                    { text: formatCurrency(item.unitCost), alignment: 'right' },
                    { text: item.qty, alignment: 'center' },
                    { text: formatCurrency(item.total), alignment: 'right' }
                ];
            })
        ];

        pdfMake.fonts = { Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf' } };

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [ 40, 60, 40, 60 ],
            content: [
                { text: `PHIẾU XUẤT KHO ${transaction.code}`, style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
                {
                    style: 'infoTable',
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [`Kho xuất: ${transactionDetails.warehouseName}`, `Ngày xuất: ${formatDate(transaction.date)}`],
                            [`Người nhận: ${transactionDetails.employeeName}`, `Người tạo: ${transactionDetails.creatorName}`],
                            [{text: `Ghi chú: ${transaction.note || 'Không có ghi chú'}`, colSpan: 2, italics: true}, '']
                        ]
                    },
                    layout: 'noBorders'
                },
                 { text: `Tổng tiền: ${formatCurrency(transactionDetails.totalAmount, true)}`, bold: true, alignment: 'right', margin: [0, 0, 0, 10] },
                {
                    style: 'itemsTable',
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                        body: tableBody
                    },
                    layout: 'lightHorizontalLines'
                },
                {
                    columns: [
                        { text: 'Người xuất kho\n(Ký, họ tên)', alignment: 'center', style: 'signature' },
                        { text: 'Người nhận hàng\n(Ký, họ tên)', alignment: 'center', style: 'signature' }
                    ],
                    margin: [0, 80, 0, 0]
                }
            ],
            styles: {
                header: { fontSize: 16, bold: true },
                infoTable: { margin: [0, 5, 0, 15], fontSize: 10 },
                itemsTable: { margin: [0, 5, 0, 15], fontSize: 10 },
                tableHeader: { bold: true, fontSize: 10, color: 'black', fillColor: '#f3f4f6', alignment: 'center' },
                signature: { fontSize: 10, bold: true }
            },
            defaultStyle: { font: 'Roboto' }
        };

        pdfMake.createPdf(docDefinition).download(`PXK_${transaction.code}.pdf`);
    };

    const renderDisplayView = () => (
        <>
            <div className="bg-white p-4 rounded-lg border">
                <div className="divide-y divide-gray-100">
                    <InfoRow label="Phiếu xuất kho">{transaction.code}</InfoRow>
                    <InfoRow label="Ngày xuất"><span className="font-bold text-blue-600">{formatDate(transaction.date)}</span></InfoRow>
                    <InfoRow label="Kho xuất">{transactionDetails.warehouseName}</InfoRow>
                    <InfoRow label="Người nhận">{transactionDetails.employeeName}</InfoRow>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2">Chi tiết xuất kho <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 ml-1">{transaction.items.length}</span></h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                         <thead className="border-b">
                            <tr>
                                <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá xuất</th>
                                <th className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SL xuất</th>
                                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactionDetails.items.map(item => (
                                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                                    <td className="py-2 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{item.variantName}</div><div className="text-xs text-gray-500">{item.variantSku}</div></td>
                                    <td className="py-2 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(item.unitCost, true)}</td>
                                    <td className="py-2 whitespace-nowrap text-sm font-bold text-gray-900 text-center">{item.qty}</td>
                                    <td className="py-2 whitespace-nowrap text-sm font-bold text-red-600 text-right">{formatCurrency(item.total, true)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border divide-y divide-gray-100">
                <InfoRow label="SL xuất">{transactionDetails.totalQty}</InfoRow>
                <InfoRow label="Tổng tiền"><span className="font-bold text-red-600">{formatCurrency(transactionDetails.totalAmount, true)}</span></InfoRow>
                <InfoRow label="Ghi chú">{transaction.note || '-'}</InfoRow>
                <InfoRow label="Người tạo">{transactionDetails.creatorName}</InfoRow>
            </div>
        </>
    );
    
    const renderEditView = () => formData && (
         <>
            <div className="bg-white p-4 rounded-lg border space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ngày xuất*</label>
                        <input type="date" value={formData.date.split('T')[0]} onChange={e => handleFormChange('date', e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Người nhận (Nhân viên)</label>
                        <select value={formData.employeeId || ''} onChange={e => handleFormChange('employeeId', Number(e.target.value) || undefined)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
                            <option value="">-- Chọn nhân viên --</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Kho xuất</label>
                    <p className="mt-1 text-sm text-gray-800 font-semibold p-2 bg-gray-100 rounded-md">{transactionDetails.warehouseName} (Không thể thay đổi)</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2">Chi tiết xuất kho</h3>
                <div className="space-y-2">
                    {formData.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 border">
                             <div className="col-span-5">
                                <p className="text-sm font-medium text-gray-800">{allVariants.find(v => v.id === item.variantId)?.productName}</p>
                                <p className="text-xs text-gray-500">{allVariants.find(v => v.id === item.variantId)?.variantSku}</p>
                             </div>
                             <div className="col-span-3">
                                <input type="number" placeholder="Số lượng" value={item.qty} onChange={e => handleItemChange(index, 'qty', Number(e.target.value))} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" min="1"/>
                            </div>
                             <div className="col-span-3">
                                <input type="number" placeholder="Đơn giá" value={item.unitCost} onChange={e => handleItemChange(index, 'unitCost', Number(e.target.value))} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" min="0"/>
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <button type="button" onClick={() => handleRemoveItem(index)} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100"><Icons.TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                 <button type="button" onClick={handleAddItem} className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium px-3 py-2 rounded-md hover:bg-primary-50">
                    <Icons.PlusCircleIcon className="w-4 h-4"/> Thêm dòng
                 </button>
            </div>

            <div className="bg-white p-4 rounded-lg border">
                <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
                <textarea value={formData.note || ''} onChange={e => handleFormChange('note', e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"></textarea>
            </div>
         </>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} aria-modal="true" role="dialog">
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-2xl bg-gray-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ transform: 'translateX(0)' }}
            >
                <div className="flex justify-between items-center p-3.5 bg-white border-b sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800">{transaction.code}</h2>
                    <div className="flex items-center gap-1">
                         {isEditing ? (
                             <>
                                <button onClick={handleCancelEdit} disabled={isSubmitting} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                                <button onClick={handleSaveEdit} disabled={isSubmitting} className="px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:bg-gray-400">
                                    {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                                </button>
                             </>
                         ) : (
                             <>
                                <button onClick={() => setShowDeleteConfirm(transaction)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Xóa phiếu"><Icons.TrashIcon className="w-5 h-5 text-gray-600" /></button>
                                <button onClick={handleEditClick} className="p-2 rounded-md hover:bg-gray-100" aria-label="Sửa phiếu"><Icons.EditIcon className="w-5 h-5 text-gray-600" /></button>
                                <button onClick={generateStockExportPDF} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Tạo file</button>
                             </>
                         )}
                         <span className="w-px h-6 bg-gray-200 mx-2"></span>
                         <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" aria-label="Đóng">
                            <Icons.XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {error && <div className="bg-red-50 p-3 rounded-md text-sm text-red-700 mb-4">{error}</div>}
                    {isEditing ? renderEditView() : renderDisplayView()}
                </div>
            </div>
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa</h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                    Bạn có chắc chắn muốn xóa phiếu xuất <strong className="text-gray-800">{showDeleteConfirm.code}</strong>? Hành động này sẽ hoàn trả lại số lượng tồn kho và không thể hoàn tác.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} disabled={isSubmitting} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-200">Hủy</button>
                            <button onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-400">
                                {isSubmitting ? 'Đang xóa...' : 'Xác nhận Xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- MAIN COMPONENT ---
export default function StockExport() {
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);

    const fetchData = useCallback(async (updateSelected = false) => {
        setLoading(true);
        try {
            const [transData, whData, userData, prodData, empData] = await Promise.all([
                api.getTransactions(),
                api.getWarehouses(),
                api.getUsers(),
                api.getProducts(),
                api.getEmployees(),
            ]);
            
            const exportTransactions = transData.filter(t => t.type === 'EXPORT');
            setTransactions(exportTransactions);
            setWarehouses(whData);
            setUsers(userData);
            setProducts(prodData);
            setEmployees(empData);

            if (updateSelected && selectedTransaction) {
                const updatedTransaction = exportTransactions.find(t => t.id === selectedTransaction.id);
                setSelectedTransaction(updatedTransaction || null);
            }

        } catch (error) {
            console.error("Failed to fetch stock export data:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedTransaction]);

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveSuccess = () => {
        setIsFormOpen(false);
        fetchData(); 
    };

    const getWarehouseName = (id?: number) => warehouses.find(w => w.id === id)?.name || '-';
    const getUserName = (id?: number) => users.find(u => u.id === id)?.name || '-';
    const getEmployeeName = (id?: number) => employees.find(e => e.id === id)?.name || '-';
    
    const getTransactionDetails = (transaction: StockTransaction) => {
        const totalQty = transaction.items.reduce((sum, item) => sum + item.qty, 0);
        const totalAmount = transaction.items.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);
        
        const allVariants = products.flatMap(p => p.variants.map(v => ({...v, productName: p.name})));
        const productSummary = transaction.items.map(item => {
            const variant = allVariants.find(v => v.id === item.variantId);
            return variant ? `${variant.productName} (${variant.variantSku})` : 'Sản phẩm không rõ';
        }).join(', ');

        return { totalQty, totalAmount, productSummary };
    };

     const groupedTransactions = useMemo(() => {
        const groups: Record<string, StockTransaction[]> = {};
        transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(t => {
            const dateKey = t.date.split('T')[0];
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(t);
        });
        return groups;
    }, [transactions]);
    
    if (loading && transactions.length === 0) {
        return <div className="text-center p-10">Đang tải dữ liệu phiếu xuất...</div>;
    }

    return (
        <>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                     <h1 className="text-xl font-bold text-gray-800 self-start">
                        <Link to="/warehouses" className="text-primary-600 hover:underline">Menu</Link>
                        <span className="text-gray-400 mx-2">&gt;</span>
                        <span>Xuất kho</span>
                    </h1>
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                        Thêm phiếu xuất
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phiếu xuất kho</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày xuất</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho xuất</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhận</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SL</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người tạo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {Object.keys(groupedTransactions).map((dateKey) => {
                                const transactionsInGroup = groupedTransactions[dateKey];
                                return (
                                    <React.Fragment key={dateKey}>
                                        <tr className="bg-gray-100">
                                            <td colSpan={10} className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-primary-700">{formatDate(dateKey)}</span>
                                                    <span className="text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">{transactionsInGroup.length}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {transactionsInGroup.map(t => {
                                            const { totalQty, totalAmount, productSummary } = getTransactionDetails(t);
                                            return (
                                                <tr key={t.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-primary-600 hover:underline cursor-pointer" onClick={() => setSelectedTransaction(t)}>
                                                        {t.code}
                                                    </td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{formatDate(t.date)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{getWarehouseName(t.warehouseFromId)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{getEmployeeName(t.employeeId)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={productSummary}>{productSummary}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">{totalQty}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{formatCurrency(totalAmount)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{getUserName(t.createdBy)}</td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                            {transactions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={10} className="text-center py-10 text-gray-500">Không có phiếu xuất kho nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <StockExportForm 
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSaveSuccess}
            />
             {selectedTransaction && (
                <StockExportDetailSidebar
                    transaction={selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    onUpdate={() => fetchData(true)}
                    products={products}
                    warehouses={warehouses}
                    users={users}
                    employees={employees}
                />
            )}
        </>
    );
}