import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApi';
import { Employee } from '../types';
import * as Icons from './Icons';
import { useAuth } from '../App';

export default function Employees() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newEmployee, setNewEmployee] = useState({ code: '', name: '' });
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<Employee | null>(null);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getEmployees();
            setEmployees(data);
            setError('');
        } catch (err) {
            setError('Không thể tải danh sách nhân viên.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmployee.code.trim() || !newEmployee.name.trim()) return;
        setError('');
        try {
            await api.createEmployee(newEmployee, user!.id);
            setNewEmployee({ code: '', name: '' });
            await fetchEmployees();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi khi tạo nhân viên mới.');
        }
    };
    
    const handleUpdate = async () => {
        if (!editingEmployee || !editingEmployee.code.trim() || !editingEmployee.name.trim()) return;
        setError('');
        try {
            await api.updateEmployee(editingEmployee.id, { code: editingEmployee.code, name: editingEmployee.name }, user!.id);
            setEditingEmployee(null);
            await fetchEmployees();
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin nhân viên.');
        }
    }

    const confirmDelete = (employee: Employee) => {
        setDeleteConfirmation(employee);
    };

    const handleDelete = async () => {
        if (!deleteConfirmation) return;
        setError('');
        try {
            await api.deleteEmployee(deleteConfirmation.id, user!.id);
            await fetchEmployees();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi xóa. Đảm bảo nhân viên không được sử dụng trong giao dịch nào.');
        } finally {
            setDeleteConfirmation(null);
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 items-end gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="sm:col-span-1">
                     <label htmlFor="new-emp-code" className="block text-sm font-medium text-gray-700">Mã nhân viên*</label>
                     <input
                        id="new-emp-code"
                        type="text"
                        value={newEmployee.code}
                        onChange={(e) => setNewEmployee({ ...newEmployee, code: e.target.value.toUpperCase() })}
                        placeholder="VD: NV001"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required
                    />
                </div>
                 <div className="sm:col-span-1">
                     <label htmlFor="new-emp-name" className="block text-sm font-medium text-gray-700">Tên Nhân viên*</label>
                    <input
                        id="new-emp-name"
                        type="text"
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                        placeholder="VD: Nguyễn Văn A"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required
                    />
                </div>
                <button type="submit" className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                    Thêm NV
                </button>
            </form>

            {error && <p className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{error}</p>}

            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                            <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Nhân viên</th>
                            <th className="px-2 py-3 md:px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={3} className="text-center py-4">Đang tải...</td></tr>
                        ) : employees.map(emp => (
                            <tr key={emp.id}>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {editingEmployee?.id === emp.id ? (
                                        <input 
                                            type="text"
                                            value={editingEmployee.code}
                                            onChange={(e) => setEditingEmployee({...editingEmployee, code: e.target.value.toUpperCase()})}
                                            className="px-2 py-1 border border-primary-500 rounded-md shadow-sm"
                                        />
                                    ) : (
                                        emp.code
                                    )}
                                </td>
                                 <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-800">
                                    {editingEmployee?.id === emp.id ? (
                                        <input 
                                            type="text"
                                            value={editingEmployee.name}
                                            onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                                            autoFocus
                                            className="px-2 py-1 border border-primary-500 rounded-md shadow-sm w-full"
                                        />
                                    ) : (
                                        emp.name
                                    )}
                                </td>
                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-right">
                                     {editingEmployee?.id === emp.id ? (
                                         <div className="flex items-center justify-end gap-2">
                                             <button onClick={handleUpdate} className="p-1 text-green-600 hover:text-green-900 rounded-full hover:bg-green-100"><Icons.SaveIcon className="w-5 h-5"/></button>
                                             <button onClick={() => setEditingEmployee(null)} className="p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"><Icons.XIcon className="w-5 h-5" /></button>
                                         </div>
                                     ) : (
                                         <div className="flex items-center justify-end gap-4">
                                             <button onClick={() => setEditingEmployee(emp)} className="p-1 text-primary-600 hover:text-primary-900 rounded-full hover:bg-primary-100"><Icons.EditIcon className="w-5 h-5"/></button>
                                             <button onClick={() => confirmDelete(emp)} className="p-1 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100"><Icons.TrashIcon className="w-5 h-5"/></button>
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
                                    Bạn có chắc chắn muốn xóa nhân viên <strong className="text-gray-800">{deleteConfirmation.name} ({deleteConfirmation.code})</strong> không?
                                </p>
                                <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                                    Lưu ý: Bạn không thể xóa nhân viên đã có giao dịch.
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