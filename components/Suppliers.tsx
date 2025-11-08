import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApi';
import { Supplier } from '../types';
import * as Icons from './Icons';
import { useAuth } from '../App';

export default function Suppliers() {
    const { user } = useAuth();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newSupplier, setNewSupplier] = useState({ code: '', name: '' });
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<Supplier | null>(null);

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getSuppliers();
            setSuppliers(data);
            setError('');
        } catch (err) {
            setError('Không thể tải danh sách nhà cung cấp.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleAddSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplier.code.trim() || !newSupplier.name.trim()) return;
        setError('');
        try {
            await api.createSupplier(newSupplier, user!.id);
            setNewSupplier({ code: '', name: '' });
            await fetchSuppliers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi khi tạo nhà cung cấp mới.');
        }
    };
    
    const handleUpdateSupplier = async () => {
        if (!editingSupplier || !editingSupplier.code.trim() || !editingSupplier.name.trim()) return;
        setError('');
        try {
            await api.updateSupplier(editingSupplier.id, { code: editingSupplier.code, name: editingSupplier.name }, user!.id);
            setEditingSupplier(null);
            await fetchSuppliers();
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật nhà cung cấp.');
        }
    }

    const confirmDelete = (supplier: Supplier) => {
        setDeleteConfirmation(supplier);
    };

    const handleDelete = async () => {
        if (!deleteConfirmation) return;
        setError('');
        try {
            await api.deleteSupplier(deleteConfirmation.id, user!.id);
            await fetchSuppliers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi xóa. Đảm bảo nhà cung cấp không được sử dụng trong giao dịch nào.');
        } finally {
            setDeleteConfirmation(null);
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <form onSubmit={handleAddSupplier} className="grid grid-cols-1 sm:grid-cols-3 items-end gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="sm:col-span-1">
                     <label htmlFor="new-sup-code" className="block text-sm font-medium text-gray-700">Mã NCC*</label>
                     <input
                        id="new-sup-code"
                        type="text"
                        value={newSupplier.code}
                        onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value.toUpperCase() })}
                        placeholder="VD: DMX"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required
                    />
                </div>
                 <div className="sm:col-span-1">
                     <label htmlFor="new-sup-name" className="block text-sm font-medium text-gray-700">Tên Nhà cung cấp*</label>
                    <input
                        id="new-sup-name"
                        type="text"
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                        placeholder="VD: Điện Máy Xanh"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required
                    />
                </div>
                <button type="submit" className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                    Thêm NCC
                </button>
            </form>

            {error && <p className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{error}</p>}

            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NCC</th>
                            <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Nhà cung cấp</th>
                            <th className="px-2 py-3 md:px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={3} className="text-center py-4">Đang tải...</td></tr>
                        ) : suppliers.map(sup => (
                            <tr key={sup.id}>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {editingSupplier?.id === sup.id ? (
                                        <input 
                                            type="text"
                                            value={editingSupplier.code}
                                            onChange={(e) => setEditingSupplier({...editingSupplier, code: e.target.value.toUpperCase()})}
                                            className="px-2 py-1 border border-primary-500 rounded-md shadow-sm"
                                        />
                                    ) : (
                                        sup.code
                                    )}
                                </td>
                                 <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-800">
                                    {editingSupplier?.id === sup.id ? (
                                        <input 
                                            type="text"
                                            value={editingSupplier.name}
                                            onChange={(e) => setEditingSupplier({...editingSupplier, name: e.target.value})}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateSupplier()}
                                            autoFocus
                                            className="px-2 py-1 border border-primary-500 rounded-md shadow-sm w-full"
                                        />
                                    ) : (
                                        sup.name
                                    )}
                                </td>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-right">
                                     {editingSupplier?.id === sup.id ? (
                                         <div className="flex items-center justify-end gap-2">
                                             <button onClick={handleUpdateSupplier} className="p-1 text-green-600 hover:text-green-900 rounded-full hover:bg-green-100"><Icons.SaveIcon className="w-5 h-5"/></button>
                                             <button onClick={() => setEditingSupplier(null)} className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"><Icons.XIcon className="w-5 h-5" /></button>
                                         </div>
                                     ) : (
                                         <div className="flex items-center justify-end gap-4">
                                             <button onClick={() => setEditingSupplier(sup)} className="p-1 text-primary-600 hover:text-primary-900 rounded-full hover:bg-primary-100"><Icons.EditIcon className="w-5 h-5"/></button>
                                             <button onClick={() => confirmDelete(sup)} className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100"><Icons.TrashIcon className="w-5 h-5"/></button>
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
                                    Bạn có chắc chắn muốn xóa nhà cung cấp <strong className="text-gray-800">{deleteConfirmation.name} ({deleteConfirmation.code})</strong> không?
                                </p>
                                <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                                    Lưu ý: Bạn không thể xóa nhà cung cấp đã có giao dịch.
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