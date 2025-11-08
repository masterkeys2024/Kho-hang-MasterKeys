import React, { useMemo, useState } from 'react';
import * as Icons from './Icons';
import { StockTransaction, Product, Warehouse, Supplier, User, ProductVariant, StockTransactionItem } from '../types';
import { useAuth } from '../App';
import { api } from '../services/mockApi';

declare const pdfMake: any;

interface StockImportDetailProps {
    transaction: StockTransaction;
    products: Product[];
    warehouses: Warehouse[];
    suppliers: Supplier[];
    users: User[];
    onClose: () => void;
    onUpdate: () => void;
}

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

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex justify-between items-center py-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-800 text-right">{children}</span>
    </div>
);

export default function StockImportDetailSidebar({ 
    transaction, 
    products, 
    warehouses, 
    suppliers, 
    users, 
    onClose,
    onUpdate
}: StockImportDetailProps) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<StockTransaction | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    // FIX: Changed showDeleteConfirm state to hold a StockTransaction object or null for type safety.
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
        const productSummary = itemsWithDetails.map(item => `${item.variantSku}-${item.variantName}`).join(', ');
        
        const supplierName = suppliers.find(s => s.id === currentData.supplierId)?.name || 'N/A';
        const warehouseName = warehouses.find(w => w.id === currentData.warehouseToId)?.name || 'N/A';
        const creatorName = users.find(u => u.id === currentData.createdBy)?.name || 'N/A';

        return {
            items: itemsWithDetails,
            totalQty,
            totalAmount,
            productSummary,
            supplierName,
            warehouseName,
            creatorName,
        };
    }, [transaction, formData, isEditing, allVariants, suppliers, warehouses, users]);

    // --- Edit Handlers ---
    const handleEditClick = () => {
        setFormData(JSON.parse(JSON.stringify(transaction))); // Deep copy
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

        // Validation
        if (!formData.date || !formData.warehouseToId) {
            setError("Vui lòng điền đầy đủ các trường bắt buộc (*).");
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
                    supplierId: formData.supplierId,
                    note: formData.note,
                    items: formData.items.map(({ id, ...item }) => ({
                        ...item,
                        id: String(id).startsWith('1') ? id : undefined, // Keep original ID, but not temporary ones
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

    // --- Delete Handler ---
    const handleDelete = async () => {
        if (!showDeleteConfirm) return;
        setIsSubmitting(true);
        setError('');
        try {
            await api.deleteTransaction(showDeleteConfirm.id, user!.id);
            // FIX: Set showDeleteConfirm to null to hide the confirmation modal.
            setShowDeleteConfirm(null);
            onClose(); // Close sidebar after deletion
            onUpdate(); // Refresh list in parent
        } catch(err) {
            setError(err instanceof Error ? err.message : "Lỗi khi xóa phiếu.");
        } finally {
            setIsSubmitting(false);
        }
    };


    const generateStockImportPDF = () => {
        // PDF generation logic remains the same
        const getVariantDescription = (variant: ProductVariant) => {
            const parts: string[] = [];
            if (variant.attributes) {
                if (variant.attributes.type === 'Máy tính bảng' && variant.attributes.cpu && variant.attributes.ram && variant.attributes.ssd) {
                    return `${variant.attributes.type}, ${variant.attributes.cpu}, ${variant.attributes.ram}, ${variant.attributes.ssd}`;
                }
                if (variant.attributes.type === 'Màn hình máy tính 4K' && variant.attributes.size) {
                    return `${variant.attributes.type}, ${variant.attributes.size}`;
                }
                parts.push(...Object.values(variant.attributes));
            }
            if (variant.color) parts.push(`Màu: ${variant.color}`);
            if (variant.size) parts.push(`Size: ${variant.size}`);
            return parts.join(', ');
        };

        const tableBody = [
            [{text: 'Stt', style: 'tableHeader'}, {text: 'Tên sản phẩm', style: 'tableHeader'}, {text: 'Thông tin', style: 'tableHeader'}, {text: 'Đơn giá', style: 'tableHeader'}, {text: 'Số lượng', style: 'tableHeader'}, {text: 'Thành tiền', style: 'tableHeader'}],
            ...transactionDetails.items.map((item, index) => {
                return [
                    { text: index + 1, alignment: 'center' },
                    item.variantName,
                    item.variant ? getVariantDescription(item.variant) : '',
                    { text: formatCurrency(item.unitCost), alignment: 'right' },
                    { text: item.qty, alignment: 'center' },
                    { text: formatCurrency(item.total), alignment: 'right' }
                ];
            })
        ];
        
        const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
       
        pdfMake.fonts = {
            Roboto: {
                normal: 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            }
        };

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [ 40, 60, 40, 60 ],
            content: [
                {
                    columns: [
                        { svg: svgLogo.replace('currentColor', '#3b82f6'), width: 40 },
                        {
                            style: 'companyInfo',
                            text: [
                                { text: 'Công ty: Công ty TNHH An Hưng\n', bold: true },
                                'Địa chỉ: Đường Lê Lợi, Quận 1, HCM\n',
                                'Hotline: 98666666\n',
                                'Email: admin@gmail.com'
                            ]
                        },
                        {
                            text: `Document generated: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')} ${new Date().toLocaleTimeString('en-GB')}`,
                            alignment: 'right',
                            style: 'timestamp'
                        }
                    ],
                    columnGap: 10
                },
                {
                    text: `PHIẾU NHẬP KHO ${transaction.code}`,
                    style: 'header',
                    alignment: 'center',
                    margin: [0, 20, 0, 10]
                },
                {
                    style: 'infoTable',
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [`Nhà cung cấp: ${transactionDetails.supplierName}`, `Kho nhập: ${transactionDetails.warehouseName}`],
                            [`Ngày nhập: ${formatDate(transaction.date)}`, {text: `Tổng tiền: ${formatCurrency(transactionDetails.totalAmount)}`, bold: true}],
                            [`SL nhập: ${transactionDetails.totalQty}`, 'Ghi chú:'],
                            [`Loại nhập: Nhập tồn kho`, transaction.note || '']
                        ]
                    },
                    layout: 'lightHorizontalLines'
                },
                {
                    style: 'itemsTable',
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', '*', 'auto', 'auto', 'auto'],
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: (i: number, node: { table: { body: any[]; }; }) => (i === 0 || i === node.table.body.length) ? 1 : (i === 1) ? 1 : 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#d1d5db',
                        vLineColor: () => '#d1d5db',
                        paddingTop: () => 5,
                        paddingBottom: () => 5,
                    }
                },
                {
                    columns: [
                        { text: 'Người giao\n(Ký, họ tên)', alignment: 'center', style: 'signature' },
                        { text: 'Người nhận\n(Ký, họ tên)', alignment: 'center', style: 'signature' }
                    ],
                    margin: [0, 80, 0, 0]
                }
            ],
            styles: {
                header: { fontSize: 16, bold: true },
                companyInfo: { fontSize: 9, margin: [0, 5, 0, 0] },
                timestamp: { fontSize: 8, italics: true, color: '#9ca3af' },
                infoTable: { margin: [0, 5, 0, 15], fontSize: 10 },
                itemsTable: { margin: [0, 5, 0, 15], fontSize: 10 },
                tableHeader: { bold: true, fontSize: 10, color: 'black', fillColor: '#f3f4f6', alignment: 'center' },
                signature: { fontSize: 10, bold: true }
            },
            defaultStyle: { font: 'Roboto' }
        };

        pdfMake.createPdf(docDefinition).download(`PNK_${transaction.code}.pdf`);
    };
    
    const renderDisplayView = () => (
        <>
            <div className="bg-white p-4 rounded-lg border">
                <div className="divide-y divide-gray-100">
                    <InfoRow label="Phiếu nhập kho">{transaction.code}</InfoRow>
                    <InfoRow label="Loại nhập">Nhập tồn kho</InfoRow>
                    <InfoRow label="Ngày nhập"><span className="font-bold text-blue-600">{formatDate(transaction.date)}</span></InfoRow>
                    <InfoRow label="Nhà cung cấp"><span className="flex items-center gap-1.5"><Icons.WarehouseIcon className="w-4 h-4 text-gray-400" /> {transactionDetails.supplierName}</span></InfoRow>
                    <InfoRow label="KHO">{transactionDetails.warehouseName}</InfoRow>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2">Chi tiết nhập kho <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 ml-1">{transaction.items.length}</span></h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                         <thead className="border-b">
                            <tr>
                                <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                <th className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
                                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá nhập</th>
                                <th className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SL nhập</th>
                                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactionDetails.items.map(item => (
                                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                                    <td className="py-2 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{item.variantName}</div><div className="text-xs text-gray-500">{item.variantSku}</div></td>
                                    <td className="py-2 whitespace-nowrap text-sm text-gray-500 text-center">{item.unit}</td>
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
                <InfoRow label="SL nhập">{transactionDetails.totalQty}</InfoRow>
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
                        <label className="block text-sm font-medium text-gray-700">Ngày nhập*</label>
                        <input type="date" value={formData.date.split('T')[0]} onChange={e => handleFormChange('date', e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nhà cung cấp</label>
                        <select value={formData.supplierId || ''} onChange={e => handleFormChange('supplierId', Number(e.target.value))} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
                            <option value="">Chọn nhà cung cấp</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Kho nhập</label>
                    <p className="mt-1 text-sm text-gray-800 font-semibold p-2 bg-gray-100 rounded-md">{transactionDetails.warehouseName} (Không thể thay đổi)</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2">Chi tiết nhập kho</h3>
                <div className="space-y-2">
                    {formData.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-gray-50 border">
                             <div className="col-span-5">
                                <select value={item.variantId} onChange={e => handleItemChange(index, 'variantId', Number(e.target.value))} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" disabled={!String(item.id).startsWith('1')}>
                                    <option value={0}>Chọn sản phẩm</option>
                                    {allVariants.map(v => <option key={v.id} value={v.id}>{v.variantSku} - {v.productName}</option>)}
                                </select>
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
                {/* Header */}
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
                                <button onClick={generateStockImportPDF} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Tạo file</button>
                             </>
                         )}
                         <span className="w-px h-6 bg-gray-200 mx-2"></span>
                         <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" aria-label="Đóng">
                            <Icons.XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {error && <div className="bg-red-50 p-3 rounded-md text-sm text-red-700 mb-4">{error}</div>}
                    {isEditing ? renderEditView() : renderDisplayView()}
                </div>
            </div>
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa</h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                    Bạn có chắc chắn muốn xóa phiếu nhập <strong className="text-gray-800">{showDeleteConfirm.code}</strong>? Hành động này sẽ hoàn trả lại số lượng tồn kho và không thể hoàn tác.
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