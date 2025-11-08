import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/mockApi';
import { StockTransaction, TransactionStatus, TransactionStatusVietnamese, TransactionType, TransactionTypeVietnamese, Warehouse } from '../types';
import * as Icons from './Icons';

const statusColorMap: Record<TransactionStatus, string> = {
    [TransactionStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [TransactionStatus.APPROVED]: 'bg-green-100 text-green-800',
    [TransactionStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

export default function Transactions() {
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        warehouse: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [transData, whData] = await Promise.all([
                    api.getTransactions(),
                    api.getWarehouses()
                ]);
                setTransactions(transData);
                setWarehouses(whData);
            } catch (error) {
                console.error("Failed to fetch transactions:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const typeMatch = filters.type === '' || t.type === filters.type;
            const statusMatch = filters.status === '' || t.status === filters.status;
            const warehouseMatch = filters.warehouse === '' || 
                t.warehouseFromId === parseInt(filters.warehouse) ||
                t.warehouseToId === parseInt(filters.warehouse);
            return typeMatch && statusMatch && warehouseMatch;
        });
    }, [transactions, filters]);
    
    const getWarehouseName = (id?: number) => {
        if (!id) return '-';
        return warehouses.find(w => w.id === id)?.name || 'Không rõ';
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <h1 className="text-xl font-bold mb-4">Danh sách Giao dịch</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <select 
                    value={filters.type} 
                    onChange={e => setFilters({...filters, type: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Tất cả loại phiếu</option>
                    {Object.values(TransactionType).map(t => <option key={t} value={t}>{TransactionTypeVietnamese[t]}</option>)}
                </select>
                <select 
                    value={filters.status} 
                    onChange={e => setFilters({...filters, status: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Tất cả trạng thái</option>
                    {Object.values(TransactionStatus).map(s => <option key={s} value={s}>{TransactionStatusVietnamese[s]}</option>)}
                </select>
                <select 
                    value={filters.warehouse} 
                    onChange={e => setFilters({...filters, warehouse: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Tất cả kho</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                 <button className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                    Thêm mới
                </button>
            </div>

            {loading ? <p>Đang tải...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã phiếu</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Từ kho</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đến kho</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-primary-600">{t.code}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900">{TransactionTypeVietnamese[t.type]}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{t.date}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{getWarehouseName(t.warehouseFromId)}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{getWarehouseName(t.warehouseToId)}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorMap[t.status]}`}>
                                            {TransactionStatusVietnamese[t.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                             {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-gray-500">Không tìm thấy giao dịch nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}