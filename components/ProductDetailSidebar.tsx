import React, { useState, useEffect } from 'react';
import { api } from '../services/mockApi';
import * as Icons from './Icons';
import { Product, ProductVariant } from '../types';

// --- TYPE DEFINITIONS ---
type ProductDetails = {
    product: Product;
    variant: ProductVariant;
    importedQty: number;
    exportedQty: number;
    onHandQty: number;
    inventoryValue: number;
};

type TransactionDetail = {
    transactionCode: string;
    date: string;
    productName: string;
    unit: string;
    qty: number;
    unitCost: number;
    total: number;
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
};

// --- CHILD COMPONENTS ---
const InfoRow: React.FC<{ label: string; value: React.ReactNode; valueClassName?: string }> = ({ label, value, valueClassName = '' }) => (
    <div>
        <dt className="text-sm text-gray-500">{label}</dt>
        <dd className={`text-sm font-semibold text-gray-800 ${valueClassName}`}>{value}</dd>
    </div>
);

const CollapsibleSection: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white border rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 font-semibold text-gray-700 bg-gray-50 rounded-t-lg hover:bg-gray-100"
            >
                <div>
                    {title}
                    <span className="ml-2 text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">{count}</span>
                </div>
                {isOpen ? <Icons.ChevronUpIcon className="w-5 h-5" /> : <Icons.ChevronDownIcon className="w-5 h-5" />}
            </button>
            {isOpen && (
                <div className="p-1">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- MAIN SIDEBAR COMPONENT ---
export default function ProductDetailSidebar({ sku, onClose, onEdit }: { sku: string; onClose: () => void; onEdit: (product: Product) => void; }) {
    const [details, setDetails] = useState<ProductDetails | null>(null);
    const [imports, setImports] = useState<TransactionDetail[]>([]);
    const [exports, setExports] = useState<TransactionDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!sku) return;
            setLoading(true);
            try {
                const [detailsData, transactionsData] = await Promise.all([
                    api.getProductDetailsBySku(sku),
                    api.getTransactionsBySku(sku),
                ]);
                setDetails(detailsData);
                setImports(transactionsData.imports as TransactionDetail[]);
                setExports(transactionsData.exports as TransactionDetail[]);
            } catch (error) {
                console.error("Failed to fetch product details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [sku]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
                <p className="text-white">Đang tải chi tiết sản phẩm...</p>
            </div>
        );
    }

    if (!details) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} role="dialog" aria-modal="true">
            <div
                className="fixed top-0 right-0 h-full w-[800px] max-w-[95vw] bg-gray-100 shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-3 border-b bg-white flex justify-between items-center flex-shrink-0">
                    <h2 className="text-base font-bold text-gray-800 truncate pr-4">
                        {details.variant.variantSku} - {details.product.name}
                    </h2>
                    <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"><Icons.TrashIcon className="w-5 h-5" /></button>
                        <button onClick={() => onEdit(details.product)} className="px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-semibold flex items-center gap-1.5 hover:bg-primary-700"><Icons.EditIcon className="w-4 h-4" /> Chỉnh sửa</button>
                        <span className="w-px h-6 bg-gray-200 mx-1"></span>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"><Icons.ChevronLeftIcon className="w-5 h-5" /></button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"><Icons.ChevronRightIcon className="w-5 h-5" /></button>
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"><Icons.MaximizeIcon className="w-5 h-5" /></button>
                        <button onClick={onClose} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"><Icons.XIcon className="w-5 h-5" /></button>
                    </div>
                </header>

                {/* Body */}
                <main className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Summary Section */}
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-3 p-4 border rounded-lg bg-white">
                        <InfoRow label="SL nhập" value={details.importedQty} valueClassName="text-purple-600" />
                        <InfoRow label="SL xuất" value={details.exportedQty} valueClassName="text-orange-500" />
                        <InfoRow label="SL tồn" value={details.onHandQty} valueClassName="font-bold text-xl" />
                        <InfoRow label="Giá trị tồn" value={formatCurrency(details.inventoryValue)} valueClassName="text-red-600 font-bold text-xl" />
                        <InfoRow label="Trạng thái" value={details.product.status} />
                        <InfoRow label="Ngày tạo" value={details.product.createdAt} />
                        <InfoRow label="Người tạo" value={details.product.createdBy} />
                    </dl>

                    {/* Transaction Sections */}
                    <CollapsibleSection title="Chi tiết nhập kho" count={imports.length}>
                       <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left font-medium text-gray-600">Sản phẩm</th>
                                        <th className="px-2 py-1.5 text-left font-medium text-gray-600">ĐVT</th>
                                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">Giá nhập</th>
                                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">SL nhập</th>
                                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {imports.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="px-2 py-1.5 text-gray-800">{item.productName}</td>
                                            <td className="px-2 py-1.5 text-gray-500">{item.unit}</td>
                                            <td className="px-2 py-1.5 text-right text-gray-800">{formatCurrency(item.unitCost)}</td>
                                            <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{item.qty}</td>
                                            <td className="px-2 py-1.5 text-right font-bold text-red-600">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Chi tiết xuất kho" count={exports.length}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                 <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left font-medium text-gray-600">Sản phẩm</th>
                                        <th className="px-2 py-1.5 text-left font-medium text-gray-600">ĐVT</th>
                                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">Giá xuất</th>
                                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">SL xuất</th>
                                        <th className="px-2 py-1.5 text-right font-medium text-gray-600">Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exports.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="px-2 py-1.5 text-gray-800">{item.productName}</td>
                                            <td className="px-2 py-1.5 text-gray-500">{item.unit}</td>
                                            <td className="px-2 py-1.5 text-right text-gray-800">{formatCurrency(item.unitCost)}</td>
                                            <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{item.qty}</td>
                                            <td className="px-2 py-1.5 text-right font-bold text-red-600">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>
                </main>
            </div>
        </div>
    );
}