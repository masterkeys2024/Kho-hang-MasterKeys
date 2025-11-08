import React, { useState, useEffect } from 'react';
import { api } from '../services/mockApi';
import { User, AuditLog } from '../types';


const UserManagementTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getUsers().then(data => {
            setUsers(data);
            setLoading(false);
        });
    }, []);

    if (loading) return <p>Đang tải danh sách người dùng...</p>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên người dùng</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                        <tr key={user.id}>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium">
                                <button className="text-primary-600 hover:text-primary-900">Sửa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AuditLogTab: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAuditLogs().then(data => {
            setLogs(data);
            setLoading(false);
        });
    }, []);
    
    if (loading) return <p>Đang tải nhật ký hệ thống...</p>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đối tượng</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map(log => (
                        <tr key={log.id}>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900">{log.actor.name}</td>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {log.action}
                                </span>
                            </td>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{log.entityType} (ID: {log.entityId})</td>
                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">
                                <details className="cursor-pointer">
                                    <summary className="text-xs text-primary-600 hover:underline">Xem chi tiết</summary>
                                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                                        {log.before && <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-auto"><strong>Trước:</strong> {JSON.stringify(log.before, null, 2)}</pre>}
                                        {log.after && <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-auto"><strong>Sau:</strong> {JSON.stringify(log.after, null, 2)}</pre>}
                                        {(!log.before && !log.after) && <span className="text-xs">Không có dữ liệu thay đổi.</span>}
                                    </div>
                                </details>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function Settings() {
    const [activeTab, setActiveTab] = useState('users');

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 md:space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`${activeTab === 'users' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Người dùng
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`${activeTab === 'audit' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Nhật ký hệ thống
                    </button>
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'users' && <UserManagementTab />}
                {activeTab === 'audit' && <AuditLogTab />}
            </div>
        </div>
    );
}