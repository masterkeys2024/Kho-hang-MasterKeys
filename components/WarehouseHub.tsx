import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from './Icons';

interface MenuCardProps {
    to: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}

const MenuCard: React.FC<MenuCardProps> = ({ to, icon, title, description }) => (
    <Link to={to} className="group block p-4 bg-white rounded-lg shadow-md hover:shadow-lg hover:border-primary-500 border border-transparent transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-start">
            <div className="flex-shrink-0">
                <div className="w-12 h-12 flex items-center justify-center bg-primary-100 rounded-lg text-primary-600">
                    {icon}
                </div>
            </div>
            <div className="ml-4">
                <h3 className="text-base font-semibold text-gray-800 group-hover:text-primary-700">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
            </div>
        </div>
    </Link>
);


export default function WarehouseHub() {
    const operations = [
        { to: '/warehouses/import', icon: <Icons.ArrowDownLeftIcon className="w-6 h-6"/>, title: 'Nhập kho', description: 'Tạo phiếu nhập hàng từ nhà cung cấp.' },
        { to: '/warehouses/export', icon: <Icons.ArrowUpRightIcon className="w-6 h-6"/>, title: 'Xuất kho', description: 'Ghi nhận xuất hàng bán hoặc cho nhân viên.' },
        { to: '/warehouses/transfer', icon: <Icons.ArrowLeftRightIcon className="w-6 h-6"/>, title: 'Chuyển kho', description: 'Điều chuyển hàng giữa các kho.' },
        { to: '/warehouses/stocktake', icon: <Icons.ClipboardCheckIcon className="w-6 h-6"/>, title: 'Kiểm kho', description: 'Thực hiện kiểm kê, điều chỉnh tồn kho.' },
    ];
    
    const settingsAndReports = [
        { to: '/warehouses/list', icon: <Icons.ListIcon className="w-6 h-6"/>, title: 'Danh sách kho', description: 'Quản lý, thêm, sửa, xóa kho.' },
        { to: '/reports?tab=stockOnHand', icon: <Icons.ReportIcon className="w-6 h-6"/>, title: 'Tổng tồn kho', description: 'Xem báo cáo tồn kho tổng hợp theo kho.' },
        { to: '/reports?tab=stockCard', icon: <Icons.TransactionIcon className="w-6 h-6"/>, title: 'Thẻ kho', description: 'Tra cứu lịch sử xuất nhập tồn chi tiết.' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Nghiệp vụ kho</h2>
                <p className="text-sm text-gray-500 mb-4">Thực hiện các thao tác nhập, xuất, điều chuyển và kiểm kê hàng hóa.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {operations.map(op => <MenuCard key={op.to} {...op} />)}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Thiết lập & Báo cáo</h2>
                 <p className="text-sm text-gray-500 mb-4">Cấu hình và xem các báo cáo liên quan đến kho hàng.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settingsAndReports.map(item => <MenuCard key={item.to} {...item} />)}
                </div>
            </div>
        </div>
    );
}