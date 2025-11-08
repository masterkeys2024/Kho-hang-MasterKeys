import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { api } from '../services/mockApi';
import { Warehouse, ProductVariant, StockCardEntry, TransactionTypeVietnamese, ProductWithStock, Product } from '../types';
import * as Icons from './Icons';
import ProductDetailSidebar from './ProductDetailSidebar';
import ProductForm from './ProductForm';


type StockOnHandReportItem = {
    groupName: string;
    sku: string;
    productName: string;
    imageUrl: string;
    spec: string;
    unit: string;
    purchasePrice: number;
    sellingPrice: number;
    minQty: number;
    maxQty: number;
    importedQty: number;
    exportedQty: number;
    onHandQty: number;
    inventoryValue: number;
    note: string;
    status: string;
    createdDate: string;
    createdBy: string;
};

// Utility to format currency
const formatCurrency = (value: number) => {
    if (!value) return 0;
    return new Intl.NumberFormat('vi-VN').format(value);
};


// Stock On Hand Report Component
const StockOnHandReport: React.FC = () => {
    const [reportData, setReportData] = useState<StockOnHandReportItem[]>([]);
    const [groupedData, setGroupedData] = useState<Record<string, StockOnHandReportItem[]>>({});
    const [loading, setLoading] = useState(false);
    const [selectedSku, setSelectedSku] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<ProductWithStock | null>(null);


    const generateReport = useCallback(async () => {
        setLoading(true);
        try {
            const data: StockOnHandReportItem[] = await api.getStockOnHand(new Date().toISOString().split('T')[0]);
            setReportData(data);
            
            const groups: Record<string, StockOnHandReportItem[]> = {};
            for (const item of data) {
                if (!groups[item.groupName]) {
                    groups[item.groupName] = [];
                }
                groups[item.groupName].push(item);
            }
            setGroupedData(groups);

        } catch (error) {
            console.error("Failed to generate stock on hand report:", error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    const handleEditProduct = async (product: Product) => {
        try {
            const allProducts = await api.getProducts();
            const fullProductData = allProducts.find(p => p.id === product.id) as ProductWithStock | undefined;
            if (fullProductData) {
                setProductToEdit(fullProductData);
                setIsEditModalOpen(true);
            } else {
                console.error("Could not find product to edit");
            }
        } catch (error) {
            console.error("Failed to fetch product for editing:", error);
        }
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setProductToEdit(null);
    };
    
    const handleSave = () => {
        handleCloseEditModal();
        generateReport();
        setSelectedSku(null); // Close sidebar on save
    };


    useEffect(() => {
        generateReport();
    }, [generateReport]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Tồn kho tổng hợp</h2>
                 <Link to="/products" className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 shadow-sm">
                    <Icons.PlusIcon className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Thêm mới</span>
                </Link>
            </div>
             {loading ? <p>Đang tạo báo cáo...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã sản phẩm</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quy cách</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá nhập</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL nhập</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL xuất</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL tồn</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị tồn</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người tạo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Object.keys(groupedData).map((groupName) => {
                                const items = groupedData[groupName];
                                return (
                                <React.Fragment key={groupName}>
                                    <tr className="bg-gray-100">
                                    <td colSpan={13} className="px-4 py-2 font-bold text-primary-700">
                                        {groupName} <span className="text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">{items.length}</span>
                                    </td>
                                    </tr>
                                    {items.map(item => (
                                    <tr key={item.sku} className="hover:bg-blue-50 cursor-pointer" onClick={() => setSelectedSku(item.sku)}>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-800">{item.productName}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">{item.spec}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-red-600 font-semibold">{formatCurrency(item.purchasePrice)}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-blue-600 font-semibold">{formatCurrency(item.importedQty)}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-orange-600 font-semibold">{formatCurrency(item.exportedQty)}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-900 font-bold">{formatCurrency(item.onHandQty)}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-red-600 font-bold">{formatCurrency(item.inventoryValue)}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">{item.note}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">{item.status}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">{item.createdDate}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">{item.createdBy}</td>
                                    </tr>
                                    ))}
                                </React.Fragment>
                            )})}
                              {reportData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={13} className="text-center py-10 text-gray-500">Không có dữ liệu tồn kho.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             )}
            {selectedSku && <ProductDetailSidebar sku={selectedSku} onClose={() => setSelectedSku(null)} onEdit={handleEditProduct} />}
            <ProductForm
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleSave}
                productToEdit={productToEdit}
            />
        </div>
    );
};

// Stock By Warehouse Report Component
const StockByWarehouseReport: React.FC = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [reportData, setReportData] = useState<StockOnHandReportItem[]>([]);
    const [groupedData, setGroupedData] = useState<Record<string, StockOnHandReportItem[]>>({});
    const [loading, setLoading] = useState(false);
    const [selectedSku, setSelectedSku] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<ProductWithStock | null>(null);

    useEffect(() => {
        api.getWarehouses().then(setWarehouses);
    }, []);

    const generateReport = useCallback(async () => {
        if (!selectedWarehouseId) return;
        setLoading(true);
        try {
            const data: StockOnHandReportItem[] = await api.getStockOnHand(new Date().toISOString().split('T')[0], parseInt(selectedWarehouseId));
            setReportData(data);
            const groups: Record<string, StockOnHandReportItem[]> = {};
            for (const item of data) {
                if (!groups[item.groupName]) {
                    groups[item.groupName] = [];
                }
                groups[item.groupName].push(item);
            }
            setGroupedData(groups);
        } catch (error) {
            console.error("Failed to generate stock by warehouse report:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouseId]);

    const handleEditProduct = async (product: Product) => {
        try {
            const allProducts = await api.getProducts();
            const fullProductData = allProducts.find(p => p.id === product.id) as ProductWithStock | undefined;
            if (fullProductData) {
                setProductToEdit(fullProductData);
                setIsEditModalOpen(true);
            } else {
                console.error("Could not find product to edit");
            }
        } catch (error) {
            console.error("Failed to fetch product for editing:", error);
        }
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setProductToEdit(null);
    };

    const handleSave = () => {
        handleCloseEditModal();
        generateReport();
        setSelectedSku(null);
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-end gap-4 mb-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">Chọn kho</label>
                    <select
                        value={selectedWarehouseId}
                        onChange={e => setSelectedWarehouseId(e.target.value)}
                        className="mt-1 w-full sm:w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">-- Chọn một kho --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={generateReport}
                    disabled={!selectedWarehouseId || loading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 w-full sm:w-auto"
                >
                    {loading ? 'Đang tải...' : 'Xem báo cáo'}
                </button>
            </div>

            {!selectedWarehouseId ? (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">Vui lòng chọn một kho để xem báo cáo.</div>
            ) : loading ? (
                <p>Đang tạo báo cáo...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                               <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã sản phẩm</th>
                                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL tồn</th>
                                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị tồn</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Object.keys(groupedData).map((groupName) => {
                                const items = groupedData[groupName];
                                return (
                                <React.Fragment key={groupName}>
                                    <tr className="bg-gray-100">
                                    <td colSpan={4} className="px-4 py-2 font-bold text-primary-700">
                                        {groupName} <span className="text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">{items.length}</span>
                                    </td>
                                    </tr>
                                    {items.map(item => (
                                    <tr key={item.sku} className="hover:bg-blue-50 cursor-pointer" onClick={() => setSelectedSku(item.sku)}>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-800">{item.productName}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-900 font-bold">{formatCurrency(item.onHandQty)}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-red-600 font-bold">{formatCurrency(item.inventoryValue)}</td>
                                    </tr>
                                    ))}
                                </React.Fragment>
                            )})}
                              {reportData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">Kho này không có dữ liệu tồn kho.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedSku && <ProductDetailSidebar sku={selectedSku} onClose={() => setSelectedSku(null)} onEdit={handleEditProduct} />}
            <ProductForm
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleSave}
                productToEdit={productToEdit}
            />
        </div>
    );
};

// Stock by Product Report Component
type StockByProductReportItem = {
    productSku: string;
    productName: string;
    groupName: string;
    unit: string;
    totalOnHandQty: number;
    totalInventoryValue: number;
    variants: StockOnHandReportItem[];
};

const StockByProductReport: React.FC = () => {
    const [reportData, setReportData] = useState<StockByProductReportItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

    const generateReport = useCallback(async () => {
        setLoading(true);
        try {
            const [perVariantData, products] = await Promise.all([
                api.getStockOnHand(new Date().toISOString().split('T')[0]),
                api.getProducts(),
            ]);

            const productMap = new Map<string, { sku: string; unit: string }>();
            products.forEach(p => productMap.set(p.name, { sku: p.sku, unit: p.unit }));
            
            const aggregatedMap = new Map<string, StockByProductReportItem>();

            for (const item of perVariantData) {
                const productName = item.productName;
                if (aggregatedMap.has(productName)) {
                    const entry = aggregatedMap.get(productName)!;
                    entry.totalOnHandQty += item.onHandQty;
                    entry.totalInventoryValue += item.inventoryValue;
                    entry.variants.push(item);
                } else {
                    const parentProduct = productMap.get(productName);
                    aggregatedMap.set(productName, {
                        productSku: parentProduct?.sku || 'N/A',
                        productName: productName,
                        groupName: item.groupName,
                        unit: parentProduct?.unit || item.unit,
                        totalOnHandQty: item.onHandQty,
                        totalInventoryValue: item.inventoryValue,
                        variants: [item],
                    });
                }
            }
            setReportData(Array.from(aggregatedMap.values()));
        } catch (error) {
            console.error("Failed to generate stock by product report:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        generateReport();
    }, [generateReport]);

    const toggleExpand = (productSku: string) => {
        setExpandedProducts(prev => {
            const newSet = new Set(prev);
            newSet.has(productSku) ? newSet.delete(productSku) : newSet.add(productSku);
            return newSet;
        });
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Báo cáo Tồn kho theo Sản phẩm</h2>
            {loading ? <p>Đang tạo báo cáo...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã SP</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhóm SP</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng SL Tồn</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Giá trị Tồn</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                             {reportData.map(product => (
                                <React.Fragment key={product.productSku}>
                                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(product.productSku)}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <div className="flex items-center">
                                                <span className="transform transition-transform duration-200" style={{ transform: expandedProducts.has(product.productSku) ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                    <Icons.ChevronRightIcon className="w-4 h-4 text-gray-400" />
                                                </span>
                                                <span className="ml-2">{product.productSku}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{product.productName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{product.groupName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{product.unit}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 font-bold">{formatCurrency(product.totalOnHandQty)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-red-600 font-bold">{formatCurrency(product.totalInventoryValue)}</td>
                                    </tr>
                                    {expandedProducts.has(product.productSku) && (
                                        <tr className="bg-white">
                                            <td colSpan={6} className="p-0">
                                                <div className="px-4 py-2">
                                                    <table className="min-w-full">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="pl-8 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã biến thể (SKU)</th>
                                                                <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quy cách</th>
                                                                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL tồn</th>
                                                                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị tồn</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {product.variants.map(variant => (
                                                                <tr key={variant.sku} className="border-t">
                                                                    <td className="pl-8 py-2 whitespace-nowrap text-sm text-gray-700">{variant.sku}</td>
                                                                    <td className="py-2 whitespace-nowrap text-sm text-gray-500">{variant.spec}</td>
                                                                    <td className="py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-800">{formatCurrency(variant.onHandQty)}</td>
                                                                    <td className="py-2 whitespace-nowrap text-sm text-right font-semibold text-red-700">{formatCurrency(variant.inventoryValue)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// Stock Card (Cardex) Report Component
const StockCardReport: React.FC = () => {
    const [reportData, setReportData] = useState<StockCardEntry[]>([]);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [filters, setFilters] = useState({ variantId: '', warehouseId: '', from: '2023-10-01', to: new Date().toISOString().split('T')[0] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getVariants().then(setVariants);
        api.getWarehouses().then(setWarehouses);
    }, []);

    const generateReport = async () => {
        if (!filters.variantId || !filters.warehouseId) {
            alert('Vui lòng chọn sản phẩm và kho để xem thẻ kho.');
            return;
        }
        setLoading(true);
        try {
            const data: StockCardEntry[] = await api.getStockCard(
                parseInt(filters.variantId),
                parseInt(filters.warehouseId),
                filters.from,
                filters.to
            );
            setReportData(data);
        } catch (error) {
            console.error("Failed to generate stock card:", error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div>
            <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-4 mb-4">
                <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700">Sản phẩm (SKU)</label>
                    <select value={filters.variantId} onChange={e => setFilters({...filters, variantId: e.target.value})} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Chọn sản phẩm</option>
                        {variants.map(v => <option key={v.id} value={v.id}>{v.variantSku}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700">Kho</label>
                    <select value={filters.warehouseId} onChange={e => setFilters({...filters, warehouseId: e.target.value})} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Chọn kho</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                 <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700">Từ ngày</label>
                    <input type="date" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700">Đến ngày</label>
                    <input type="date" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <button onClick={generateReport} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Xem</button>
                    <button 
                        onClick={() => { /* CSV Export logic would need updating for this component */}}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Icons.DownloadIcon className="w-5 h-5 mr-2" />
                        Xuất
                    </button>
                </div>
            </div>
             {loading ? <p>Đang tạo báo cáo...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã phiếu</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                                <th className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diễn giải</th>
                                <th className="px-2 py-3 md:px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nhập</th>
                                <th className="px-2 py-3 md:px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Xuất</th>
                                <th className="px-2 py-3 md:px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((row, i) => (
                                <tr key={i}>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{row.date}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-primary-600">{row.transactionCode}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500">{TransactionTypeVietnamese[row.transactionType]}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-900">{row.note}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-green-600 text-right">{row.importQty > 0 ? row.importQty : ''}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-red-600 text-right">{row.exportQty > 0 ? row.exportQty : ''}</td>
                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{row.balance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             )}
        </div>
    );
};


// Main Reports Component with Tabs
export default function Reports() {
    const location = useLocation();
    const activeTab = new URLSearchParams(location.search).get('tab') || 'stockOnHand';

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 md:space-x-8" aria-label="Tabs">
                    <Link
                        to="/reports?tab=stockOnHand"
                        className={`${activeTab === 'stockOnHand' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Tồn kho tổng hợp
                    </Link>
                    <Link
                        to="/reports?tab=stockByWarehouse"
                        className={`${activeTab === 'stockByWarehouse' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Tồn theo kho
                    </Link>
                     <Link
                        to="/reports?tab=stockByProduct"
                        className={`${activeTab === 'stockByProduct' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Tồn theo sản phẩm
                    </Link>
                    <Link
                        to="/reports?tab=stockCard"
                        className={`${activeTab === 'stockCard' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Thẻ kho
                    </Link>
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'stockOnHand' && <StockOnHandReport />}
                {activeTab === 'stockByWarehouse' && <StockByWarehouseReport />}
                {activeTab === 'stockByProduct' && <StockByProductReport />}
                {activeTab === 'stockCard' && <StockCardReport />}
            </div>
        </div>
    );
}