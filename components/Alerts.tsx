import React, { useState, useEffect } from 'react';
import { api } from '../services/mockApi';
import { Alert } from '../types';

interface AlertsProps {
    isDashboardView?: boolean;
}

export default function Alerts({ isDashboardView = false }: AlertsProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            setLoading(true);
            try {
                const data = await api.getAlerts();
                setAlerts(data);
            } catch (error) {
                console.error("Failed to fetch alerts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    const displayedAlerts = isDashboardView ? alerts.slice(0, 5) : alerts;
    
    const renderContent = () => {
        if (loading) {
            return <tr><td colSpan={6} className="text-center py-10">Đang tải cảnh báo...</td></tr>;
        }

        if (displayedAlerts.length === 0) {
            return <tr><td colSpan={6} className="text-center py-10 text-gray-500">Không có cảnh báo nào.</td></tr>;
        }

        return displayedAlerts.map((alert, index) => (
            <tr key={index} className={alert.type === 'MIN' ? 'bg-red-50' : 'bg-yellow-50'}>
                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900">{alert.warehouse.name}</td>
                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{alert.variant.variantSku}</td>
                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{alert.product.name}</td>
                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-bold text-center" style={{color: alert.type === 'MIN' ? '#DC2626' : '#F59E0B'}}>
                    {alert.onhandQty}
                </td>
                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {alert.threshold.min} - {alert.threshold.max}
                </td>
                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm">
                    {alert.type === 'MIN' ? 
                        <span className="text-red-600 font-semibold">Dưới mức tối thiểu</span> : 
                        <span className="text-yellow-600 font-semibold">Vượt mức tối đa</span>
                    }
                </td>
            </tr>
        ));
    };


    const table = (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                        <th className="px-2 py-3 md:px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
                        <th className="px-2 py-3 md:px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ngưỡng (Min-Max)</th>
                        <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại cảnh báo</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {renderContent()}
                </tbody>
            </table>
        </div>
    );
    
    if (isDashboardView) {
        return table;
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Danh sách Cảnh báo Tồn kho</h2>
            {table}
        </div>
    );
}