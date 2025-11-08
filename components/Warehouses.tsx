import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApi';
import { Warehouse } from '../types';
import * as Icons from './Icons';
import { useAuth } from '../App';

export default function Warehouses() {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newWarehouse, setNewWarehouse] = useState({ code: '', name: '' });
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<Warehouse | null>(null);

    const fetchWarehouses = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getWarehouses();
            setWarehouses(data);
            setError('');
        } catch (err) {
            setError('Không thể tải danh sách kho.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    const handleAddWarehouse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWarehouse.code.trim() || !newWarehouse.name.trim()) return;
        setError('');
        try {
            await api.createWarehouse(newWarehouse, user!.id);
            setNewWarehouse({ code: '', name: '' });
            await fetchWarehouses();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi khi tạo kho mới.');
        }
    };
    
    const handleUpdateWarehouse = async () => {
        if (!editingWarehouse || !editingWarehouse.code.trim() || !editingWarehouse.name.trim()) return;
        setError('');
        try {
            await api.updateWarehouse(editingWarehouse.id, { code: editingWarehouse.code, name: editingWarehouse.name }, user!.id);
            setEditingWarehouse(null);
            await fetchWarehouses();
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật kho.');
        }
    }

    const confirmDelete = (warehouse: Warehouse) => {
        setDeleteConfirmation(warehouse);
    };

    const handleDelete = async () => {
        if (!deleteConfirmation) return;
        setError('');
        try {
            await api.deleteWarehouse(deleteConfirmation.id, user!.id);
            await fetchWarehouses();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi xóa kho. Đảm bảo kho không còn tồn hàng.');
        } finally {
            setDeleteConfirmation(null);
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <form onSubmit={handleAddWarehouse} className="grid grid-cols-1 sm:grid-cols-3 items-end gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="sm:col-span-1">
                     <label htmlFor="new-wh-code" className="block text-sm font-medium text-gray-700">Mã kho*</label>
                     <input
                        id="new-wh-code"
                        type="text"
                        value={newWarehouse.code}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value.toUpperCase() })}
                        placeholder="VD: KHO-HN"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required
                    />
                </div>
                 <div className="sm:col-span-1">
                     <label htmlFor="new-wh-name" className="block text-sm font-medium text-gray-700">Tên kho*</label>
                    <input
                        id="new-wh-name"
                        type="text"
                        value={newWarehouse.name}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                        placeholder="VD: Kho Hà Nội"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required
                    />
                </div>
                <button type="submit" className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                    Thêm kho
                </button>
            </form>

            {error && <p className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{error}</p>}

            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Kho</th>
                            <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Kho</th>
                            <th className="px-2 py-3 md:px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={3} className="text-center py-4">Đang tải...</td></tr>
                        ) : warehouses.map(wh => (
                            <tr key={wh.id}>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {editingWarehouse?.id === wh.id ? (
                                        <input 
                                            type="text"
                                            value={editingWarehouse.code}
                                            onChange={(e) => setEditingWarehouse({...editingWarehouse, code: e.target.value.toUpperCase()})}
                                            className="px-2 py-1 border border-primary-500 rounded-md shadow-sm"
                                        />
                                    ) : (
                                        wh.code
                                    )}
                                </td>
                                 <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-800">
                                    {editingWarehouse?.id === wh.id ? (
                                        <input 
                                            type="text"
                                            value={editingWarehouse.name}
                                            onChange={(e) => setEditingWarehouse({...editingWarehouse, name: e.target.value})}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateWarehouse()}
                                            autoFocus
                                            className="px-2 py-1 border border-primary-500 rounded-md shadow-sm w-full"
                                        />
                                    ) : (
                                        wh.name
                                    )}
                                </td>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-right">
                                     {editingWarehouse?.id === wh.id ? (
                                         <div className="flex items-center justify-end gap-2">
                                             <button onClick={handleUpdateWarehouse} className="p-1 text-green-600 hover:text-green-900 rounded-full hover:bg-green-100"><Icons.SaveIcon className="w-5 h-5"/></button>
                                             <button onClick={() => setEditingWarehouse(null)} className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"><Icons.XIcon className="w-5 h-5" /></button>
                                         </div>
                                     ) : (
                                         <div className="flex items-center justify-end gap-4">
                                             <button onClick={() => setEditingWarehouse(wh)} className="p-1 text-primary-600 hover:text-primary-900 rounded-full hover:bg-primary-100"><Icons.EditIcon className="w-5 h-5"/></button>
                                             <button onClick={() => confirmDelete(wh)} className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100"><Icons.TrashIcon className="w-5 h-5"/></button>
                                         </div>
                                     )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa</h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                    Bạn có chắc chắn muốn xóa kho <strong className="text-gray-800">{deleteConfirmation.name} ({deleteConfirmation.code})</strong> không?
                                </p>
                                <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                                    Lưu ý: Bạn không thể xóa kho đang có tồn kho.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}