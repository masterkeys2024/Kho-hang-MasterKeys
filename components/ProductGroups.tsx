import React, { useState, useEffect, useCallback } from 'react';
import { listGroups, createGroup, updateGroup, deleteGroup } from '../services/productGroups';
import { ProductGroup } from '../types';
import * as Icons from './Icons';
import { useAuth } from '../App';

export default function ProductGroups() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<ProductGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroup, setEditingGroup] = useState<{ id: number; name: string } | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: number; name: string } | null>(null);

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getProductGroups();
            setGroups(data);
            setError('');
        } catch (err) {
            setError('Không thể tải danh sách nhóm sản phẩm.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setError('');
        try {
            await api.createProductGroup(newGroupName, user!.id);
            setNewGroupName('');
            await fetchGroups();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi khi tạo nhóm mới.');
        }
    };

    const confirmDeleteGroup = (id: number, name: string) => {
        setDeleteConfirmation({ id, name });
    };

    const handleDeleteGroup = async () => {
        if (!deleteConfirmation) return;
        setError('');
        try {
            await api.deleteProductGroup(deleteConfirmation.id, user!.id);
            await fetchGroups();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi xóa nhóm. Đảm bảo nhóm không có sản phẩm nào.');
        } finally {
            setDeleteConfirmation(null);
        }
    };
    
    const handleUpdateGroup = async () => {
        if (!editingGroup || !editingGroup.name.trim()) return;
        setError('');
        try {
            await api.updateProductGroup(editingGroup.id, editingGroup.name, user!.id);
            setEditingGroup(null);
            await fetchGroups();
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật nhóm.');
        }
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <form onSubmit={handleAddGroup} className="flex flex-col sm:flex-row items-center gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
                <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Tên nhóm sản phẩm mới"
                    className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <button type="submit" className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                    Thêm nhóm
                </button>
            </form>

            {error && <p className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{error}</p>}

            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên nhóm</th>
                            <th className="px-2 py-3 md:px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={2} className="text-center py-4">Đang tải...</td></tr>
                        ) : groups.map(group => (
                            <tr key={group.id}>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {editingGroup?.id === group.id ? (
                                        <input 
                                            type="text"
                                            value={editingGroup.name}
                                            onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateGroup()}
                                            onBlur={() => setEditingGroup(null)}
                                            autoFocus
                                            className="px-2 py-1 border border-primary-500 rounded-md shadow-sm"
                                        />
                                    ) : (
                                        group.name
                                    )}
                                </td>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-right">
                                     {editingGroup?.id === group.id ? (
                                         <div className="flex items-center justify-end gap-2">
                                             <button onClick={handleUpdateGroup} className="p-1 text-green-600 hover:text-green-900 rounded-full hover:bg-green-100"><Icons.SaveIcon className="w-5 h-5"/></button>
                                             <button onClick={() => setEditingGroup(null)} className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">Hủy</button>
                                         </div>
                                     ) : (
                                         <div className="flex items-center justify-end gap-4">
                                             <button onClick={() => setEditingGroup({id: group.id, name: group.name})} className="p-1 text-primary-600 hover:text-primary-900 rounded-full hover:bg-primary-100"><Icons.EditIcon className="w-5 h-5"/></button>
                                             <button onClick={() => confirmDeleteGroup(group.id, group.name)} className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100"><Icons.TrashIcon className="w-5 h-5"/></button>
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
                                    Bạn có chắc chắn muốn xóa nhóm sản phẩm <strong className="text-gray-800">{deleteConfirmation.name}</strong> không?
                                </p>
                                <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                                    Lưu ý: Bạn không thể xóa nhóm đang được gán cho sản phẩm.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                            <button onClick={handleDeleteGroup} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
