import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from './Icons';
import { api } from '../services/mockApi';
import { StockTransaction, Warehouse, User, Supplier, Product } from '../types';
import StockImportForm from './StockImportForm';
import StockImportDetailSidebar from './StockImportDetailSidebar';

// Helper function to format currency
const formatCurrency = (value: number) => {
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

export default function StockImport() {
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);

    const fetchData = useCallback(async (updateSelected = false) => {
        setLoading(true);
        try {
            const [transData, whData, userData, supData, prodData] = await Promise.all([
                api.getTransactions(),
                api.getWarehouses(),
                api.getUsers(),
                api.getSuppliers(),
                api.getProducts()
            ]);
            
            const importTransactions = transData.filter(t => t.type === 'IMPORT');
            setTransactions(importTransactions);
            setWarehouses(whData);
            setUsers(userData);
            setSuppliers(supData);
            setProducts(prodData);

            if (updateSelected && selectedTransaction) {
                const updatedTransaction = importTransactions.find(t => t.id === selectedTransaction.id);
                setSelectedTransaction(updatedTransaction || null);
            }

        } catch (error) {
            console.error("Failed to fetch stock import data:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedTransaction]);

    useEffect(() => {
        fetchData();
    }, []); // Initial fetch only

    const handleSaveSuccess = () => {
        setIsFormOpen(false);
        fetchData(); // Refresh the list
    };

    const getWarehouseName = (id?: number) => warehouses.find(w => w.id === id)?.name || '-';
    const getUserName = (id?: number) => users.find(u => u.id === id)?.name || '-';
    const getSupplierName = (id?: number) => suppliers.find(s => s.id === id)?.name || '-';
    
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
        return <div className="text-center p-10">Đang tải dữ liệu phiếu nhập...</div>;
    }

    return (
        <>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                     <h1 className="text-xl font-bold text-gray-800 self-start">
                        <Link to="/warehouses" className="text-primary-600 hover:underline">Menu</Link>
                        <span className="text-gray-400 mx-2">&gt;</span>
                        <span>Nhập kho</span>
                    </h1>
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                        Thêm phiếu nhập
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phiếu nhập kho</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại nhập</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nhập</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà cung cấp</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục SP</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SL nhập</th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người tạo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Object.keys(groupedTransactions).map((dateKey) => {
                                const transactionsInGroup = groupedTransactions[dateKey];
                                return (
                                    <React.Fragment key={dateKey}>
                                        <tr className="bg-gray-100">
                                            <td colSpan={11} className="px-3 py-2">
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
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">Nhập tồn kho</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{formatDate(t.date)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center"><Icons.WarehouseIcon className="w-4 h-4 mr-1.5 text-gray-400" />{getSupplierName(t.supplierId)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{getWarehouseName(t.warehouseToId)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={productSummary}>{productSummary}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">{totalQty}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{formatCurrency(totalAmount)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{t.note}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(t.date)}</td>
                                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{getUserName(t.createdBy)}</td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                            {transactions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={11} className="text-center py-10 text-gray-500">Không có phiếu nhập kho nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <StockImportForm 
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSaveSuccess}
            />
             {selectedTransaction && (
                <StockImportDetailSidebar
                    transaction={selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    onUpdate={() => fetchData(true)}
                    products={products}
                    warehouses={warehouses}
                    suppliers={suppliers}
                    users={users}
                />
            )}
        </>
    );
}