import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/mockApi';
import { ProductGroup, ProductWithStock } from '../types';
import * as Icons from './Icons';
import ProductForm from './ProductForm';

export default function Products() {
    const [products, setProducts] = useState<ProductWithStock[]>([]);
    const [groups, setGroups] = useState<ProductGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [productData, groupData] = await Promise.all([
                api.getProducts(),
                api.getProductGroups()
            ]);
            setProducts(productData as ProductWithStock[]);
            setGroups(groupData);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (product: ProductWithStock) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null); // Also clear editing product on close
    };

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => 
                (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .filter(p => 
                selectedGroup === '' || p.group.id === parseInt(selectedGroup)
            );
    }, [products, searchTerm, selectedGroup]);

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo Tên hoặc SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Icons.SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="w-full md:w-auto px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Tất cả nhóm hàng</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                     <button onClick={handleOpenCreateModal} className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        <Icons.PlusCircleIcon className="w-5 h-5 mr-2" />
                        Thêm sản phẩm
                    </button>
                </div>
            </div>

            {loading ? <p>Đang tải...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhóm sản phẩm</th>
                                <th scope="col" className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                <th scope="col" className="px-2 py-3 md:px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
                                <th scope="col" className="px-2 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thuộc tính / Phiên bản</th>
                                <th scope="col" className="px-2 py-3 md:px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProducts.map((product) => {
                                const isSimpleProduct = product.variants.length === 1 && 
                                    !product.variants[0].color && 
                                    !product.variants[0].size &&
                                    (!product.variants[0].attributes || Object.keys(product.variants[0].attributes).length === 0);

                                if (isSimpleProduct) {
                                    const variant = product.variants[0];
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{product.group.name}</div>
                                            </td>
                                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                <div className="text-sm text-gray-500">[{product.sku}]</div>
                                            </td>
                                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500 text-center">{product.unit}</td>
                                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500 text-center">--</td>
                                            <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap text-center">
                                                <button 
                                                    onClick={() => handleOpenEditModal(product)} 
                                                    className="p-2 text-primary-600 hover:text-primary-900 rounded-full hover:bg-primary-100 transition-colors"
                                                    aria-label={`Sửa sản phẩm ${product.name}`}
                                                >
                                                    <Icons.EditIcon className="w-5 h-5"/>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <React.Fragment key={product.id}>
                                        {product.variants.map((variant, variantIdx) => (
                                            <tr key={variant.id} className="hover:bg-gray-50">
                                                {variantIdx === 0 && (
                                                    <>
                                                        <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap align-top" rowSpan={product.variants.length}>
                                                            <div className="text-sm text-gray-500">{product.group.name}</div>
                                                        </td>
                                                        <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap align-top" rowSpan={product.variants.length}>
                                                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                            <div className="text-sm text-gray-500">[{product.sku}]</div>
                                                        </td>
                                                        <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap align-top text-center" rowSpan={product.variants.length}>
                                                            <div className="text-sm text-gray-500">{product.unit}</div>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{variant.variantSku}</div>
                                                    <div className="text-sm text-gray-500">{[variant.color, variant.size].filter(Boolean).join(' - ')}</div>
                                                </td>
                                                {variantIdx === 0 && (
                                                    <td className="px-2 py-2 md:px-6 md:py-4 whitespace-nowrap align-middle text-center" rowSpan={product.variants.length}>
                                                         <button 
                                                            onClick={() => handleOpenEditModal(product)} 
                                                            className="p-2 text-primary-600 hover:text-primary-900 rounded-full hover:bg-primary-100 transition-colors"
                                                            aria-label={`Sửa sản phẩm ${product.name}`}
                                                         >
                                                            <Icons.EditIcon className="w-5 h-5"/>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                             {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">Không tìm thấy sản phẩm nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <ProductForm 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSave={fetchData}
                productToEdit={editingProduct} 
            />
        </div>
    );
}