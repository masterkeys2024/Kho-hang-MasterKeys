
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../services/mockApi';
import { Alert } from '../types';
import * as Icons from './Icons';
import Alerts from './Alerts';

type DashboardData = {
    totalSKU: number;
    totalStock: number;
    lowStockItems: number;
    inventoryByWarehouse: { name: string; value: number }[];
};

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const dashboardData = await api.getDashboardData();
                setData(dashboardData);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="text-center p-10">Đang tải dữ liệu...</div>;
    }

    if (!data) {
        return <div className="text-center p-10 text-red-500">Không thể tải dữ liệu.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Icons.PackageIcon className="w-6 h-6 text-white"/>} title="Tổng số SKU" value={data.totalSKU} color="bg-blue-500"/>
                <StatCard icon={<Icons.BoxIcon className="w-6 h-6 text-white"/>} title="Tổng tồn kho" value={data.totalStock.toLocaleString()} color="bg-green-500"/>
                <StatCard icon={<Icons.AlertIcon className="w-6 h-6 text-white"/>} title="SP dưới tồn tối thiểu" value={data.lowStockItems} color="bg-red-500"/>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Tồn kho theo kho</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.inventoryByWarehouse}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#3b82f6" name="Số lượng tồn"/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <h2 className="text-lg font-semibold text-gray-700 mb-4">Cảnh báo tồn kho gần đây</h2>
                <Alerts isDashboardView={true} />
            </div>
        </div>
    );
}
