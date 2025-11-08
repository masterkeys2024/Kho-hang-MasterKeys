import { Role, User, Warehouse, ProductGroup, Product, ProductVariant, InventoryBalance, StockTransaction, StockTransactionItem, TransactionType, TransactionStatus, Alert, AuditLog, StockCardEntry, Supplier, Employee } from "../types";
import { db } from './database';

// --- MOCK API IMPLEMENTATION ---

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

class MockApi {

    private logAction(actorId: number, action: string, entityType: string, entityId: number, before?: object, after?: object) {
        const actor = db.users.find(u => u.id === actorId);
        if (actor) {
            const log: AuditLog = {
                id: db.auditLogs.length + 1,
                actor,
                action,
                entityType,
                entityId,
                before,
                after,
                createdAt: new Date().toISOString()
            };
            db.auditLogs.unshift(log);
            db.save();
        }
    }

    async login(email: string, pass: string): Promise<User> {
        await delay(500);
        const user = db.users.find(u => u.email === email);
        
        if (!user) {
            throw new Error("Email không tồn tại.");
        }
        
        if (user.password !== pass) {
             throw new Error("Mật khẩu không đúng.");
        }

        // Return user object without password for security
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updatePassword(userId: number, oldPass: string, newPass: string): Promise<void> {
        await delay(500);
        const user = db.users.find(u => u.id === userId);
        if (!user) {
            throw new Error("Người dùng không tồn tại.");
        }

        if (user.password !== oldPass) {
            throw new Error("Mật khẩu cũ không đúng.");
        }

        user.password = newPass;
        this.logAction(userId, 'UPDATE_PASSWORD', 'User', userId);
        db.save();
        return;
    }

    async getDashboardData() {
        await delay(800);
        const lowStockItems = this.getAlertsInternal().filter(a => a.type === 'MIN').length;
        const totalStock = db.inventoryBalances.reduce((sum, item) => sum + item.onhandQty, 0);
        const inventoryByWarehouse = db.warehouses.map(w => {
            const warehouseStock = db.inventoryBalances
                .filter(b => b.warehouseId === w.id)
                .reduce((sum, item) => sum + item.onhandQty, 0);
            return { name: w.name, value: warehouseStock };
        });

        return {
            totalSKU: db.products.reduce((sum, p) => sum + p.variants.length, 0),
            totalStock,
            lowStockItems,
            inventoryByWarehouse
        };
    }

    async getWarehouses(): Promise<Warehouse[]> {
        await delay(200);
        return [...db.warehouses];
    }

    async createWarehouse(data: { code: string; name: string; }, actorId: number): Promise<Warehouse> {
        await delay(500);
        if (db.warehouses.some(w => w.code === data.code)) {
            throw new Error(`Mã kho "${data.code}" đã tồn tại.`);
        }
        const newWarehouse: Warehouse = {
            id: db.warehouses.length > 0 ? Math.max(...db.warehouses.map(w => w.id)) + 1 : 1,
            code: data.code,
            name: data.name,
        };
        db.warehouses.push(newWarehouse);
        this.logAction(actorId, 'CREATE_WAREHOUSE', 'Warehouse', newWarehouse.id, undefined, { code: data.code, name: data.name });
        db.save();
        return newWarehouse;
    }

    async updateWarehouse(id: number, data: { code: string; name: string; }, actorId: number): Promise<Warehouse> {
        await delay(500);
        const warehouse = db.warehouses.find(w => w.id === id);
        if (!warehouse) throw new Error("Kho không tồn tại.");
        
        if (db.warehouses.some(w => w.code === data.code && w.id !== id)) {
            throw new Error(`Mã kho "${data.code}" đã tồn tại.`);
        }
        
        const oldData = { code: warehouse.code, name: warehouse.name };
        warehouse.code = data.code;
        warehouse.name = data.name;
        
        this.logAction(actorId, 'UPDATE_WAREHOUSE', 'Warehouse', id, oldData, data);
        db.save();
        return warehouse;
    }

    async deleteWarehouse(id: number, actorId: number): Promise<void> {
        await delay(500);
        const isUsed = db.inventoryBalances.some(b => b.warehouseId === id && b.onhandQty > 0);
        if (isUsed) {
            throw new Error("Không thể xóa kho đang có hàng tồn kho.");
        }
        const warehouseIndex = db.warehouses.findIndex(w => w.id === id);
        if (warehouseIndex === -1) throw new Error("Kho không tồn tại.");

        const [deletedWarehouse] = db.warehouses.splice(warehouseIndex, 1);
        this.logAction(actorId, 'DELETE_WAREHOUSE', 'Warehouse', id, { name: deletedWarehouse.name });
        
        // Also remove inventory balances for this warehouse
        db.inventoryBalances = db.inventoryBalances.filter(b => b.warehouseId !== id);

        db.save();
    }
    
    async getProductGroups(): Promise<ProductGroup[]> {
        await delay(200);
        return [...db.productGroups];
    }

    async createProductGroup(name: string, actorId: number): Promise<ProductGroup> {
        await delay(500);
        const newGroup: ProductGroup = {
            id: db.productGroups.length > 0 ? Math.max(...db.productGroups.map(g => g.id)) + 1 : 1,
            name,
        };
        db.productGroups.push(newGroup);
        this.logAction(actorId, 'CREATE_PRODUCT_GROUP', 'ProductGroup', newGroup.id, undefined, { name });
        db.save();
        return newGroup;
    }

    async updateProductGroup(id: number, newName: string, actorId: number): Promise<ProductGroup> {
        await delay(500);
        const group = db.productGroups.find(g => g.id === id);
        if (!group) throw new Error("Nhóm sản phẩm không tồn tại.");
        
        const oldName = group.name;
        group.name = newName;
        
        this.logAction(actorId, 'UPDATE_PRODUCT_GROUP', 'ProductGroup', id, { name: oldName }, { name: newName });
        db.save();
        return group;
    }

    async deleteProductGroup(id: number, actorId: number): Promise<void> {
        await delay(500);
        const isUsed = db.products.some(p => p.group.id === id);
        if (isUsed) {
            throw new Error("Không thể xóa nhóm sản phẩm đang được sử dụng.");
        }
        const groupIndex = db.productGroups.findIndex(g => g.id === id);
        if (groupIndex === -1) throw new Error("Nhóm sản phẩm không tồn tại.");

        const [deletedGroup] = db.productGroups.splice(groupIndex, 1);
        this.logAction(actorId, 'DELETE_PRODUCT_GROUP', 'ProductGroup', id, { name: deletedGroup.name });
        db.save();
    }
    
    async getProducts() {
        await delay(700);
        return db.products.map(p => ({
            ...p,
            variants: p.variants.map(v => {
                const totalStock = db.inventoryBalances
                    .filter(b => b.variantId === v.id)
                    .reduce((sum, item) => sum + item.onhandQty, 0);
                return { ...v, totalStock };
            })
        }));
    }

    async createProduct(
        productData: Omit<Product, 'id' | 'variants'> & { 
            variants: (Omit<ProductVariant, 'id' | 'productId'> & { initialStock?: Record<number, number> })[] 
        }, 
        actorId: number
    ) {
        await delay(1000);
        const newProductId = db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
        const group = db.productGroups.find(g => g.id === productData.group.id);
        if (!group) throw new Error("Product group not found");

        const newProduct: Product = {
            ...productData,
            id: newProductId,
            group,
            variants: [],
        };

        newProduct.variants = productData.variants.map((v, index) => {
             const newVariantId = db.products.flatMap(p => p.variants).length > 0 ? Math.max(...db.products.flatMap(p => p.variants).map(v => v.id)) + 1 + index : 1 + index;
            // Initialize inventory balances for the new variant in all warehouses
            db.warehouses.forEach(warehouse => {
                const initialQty = v.initialStock?.[warehouse.id] || 0;
                db.inventoryBalances.push({
                    warehouseId: warehouse.id,
                    variantId: newVariantId,
                    onhandQty: initialQty
                });
            });
            const { initialStock, ...variantData } = v;
            return {
                ...variantData,
                id: newVariantId,
                productId: newProductId
            };
        });

        db.products.push(newProduct);
        this.logAction(actorId, "CREATE_PRODUCT", "Product", newProduct.id, undefined, { sku: newProduct.sku, name: newProduct.name });
        db.save();
        return newProduct;
    }

    async updateProduct(
        productId: number, 
        productData: Omit<Product, 'id' | 'variants'> & { variants: Partial<ProductVariant>[] }, 
        actorId: number
    ): Promise<Product> {
        await delay(1000);
        const productIndex = db.products.findIndex(p => p.id === productId);
        if (productIndex === -1) throw new Error("Sản phẩm không tồn tại.");

        const originalProduct = JSON.parse(JSON.stringify(db.products[productIndex]));
        const product = db.products[productIndex];
        const group = db.productGroups.find(g => g.id === productData.group.id);
        if (!group) throw new Error("Nhóm sản phẩm không tồn tại.");
        
        // Update product-level details
        product.name = productData.name;
        product.sku = productData.sku;
        product.unit = productData.unit;
        product.group = group;
        product.imageUrl = productData.imageUrl;

        const updatedVariantIds = productData.variants.map(v => v.id).filter(Boolean);
        const originalVariantIds = product.variants.map(v => v.id);

        // Delete variants that are no longer present
        const variantsToDelete = originalVariantIds.filter(id => !updatedVariantIds.includes(id));
        if (variantsToDelete.length > 0) {
            // Check if deleted variants have stock
            const hasStock = db.inventoryBalances.some(b => variantsToDelete.includes(b.variantId) && b.onhandQty > 0);
            if (hasStock) {
                throw new Error("Không thể xóa phiên bản đang có tồn kho.");
            }
            product.variants = product.variants.filter(v => !variantsToDelete.includes(v.id));
            db.inventoryBalances = db.inventoryBalances.filter(b => !variantsToDelete.includes(b.variantId));
        }

        // Update existing variants and add new ones
        let maxVariantId = Math.max(...db.products.flatMap(p => p.variants).map(v => v.id), 0);
        product.variants = productData.variants.map(variantData => {
            if (variantData.id) { // Existing variant
                const existingVariant = product.variants.find(v => v.id === variantData.id)!;
                Object.assign(existingVariant, variantData);
                return existingVariant;
            } else { // New variant
                maxVariantId++;
                const newVariant: ProductVariant = {
                    ...(variantData as Omit<ProductVariant, 'id' | 'productId'>),
                    id: maxVariantId,
                    productId: productId
                };
                 // Initialize inventory for new variant
                db.warehouses.forEach(warehouse => {
                    db.inventoryBalances.push({
                        warehouseId: warehouse.id,
                        variantId: newVariant.id,
                        onhandQty: 0
                    });
                });
                return newVariant;
            }
        });
        
        this.logAction(actorId, "UPDATE_PRODUCT", "Product", productId, { name: originalProduct.name }, { name: product.name });
        db.save();
        return product;
    }

    async deleteProduct(productId: number, actorId: number): Promise<void> {
        await delay(1000);
        const productIndex = db.products.findIndex(p => p.id === productId);
        if (productIndex === -1) throw new Error("Sản phẩm không tồn tại.");

        const productToDelete = db.products[productIndex];
        const variantIds = productToDelete.variants.map(v => v.id);

        // Proceed with deletion
        db.products.splice(productIndex, 1);
        
        // Remove associated inventory balances
        db.inventoryBalances = db.inventoryBalances.filter(b => !variantIds.includes(b.variantId));

        this.logAction(actorId, "DELETE_PRODUCT", "Product", productId, { name: productToDelete.name, sku: productToDelete.sku });
        db.save();
    }
    
    private getAlertsInternal(): Alert[] {
        const alerts: Alert[] = [];
        for (const balance of db.inventoryBalances) {
            const variant = db.products.flatMap(p => p.variants).find(v => v.id === balance.variantId);
            if (!variant) continue;

            const product = db.products.find(p => p.id === variant.productId);
            const warehouse = db.warehouses.find(w => w.id === balance.warehouseId);
            if (!product || !warehouse) continue;

            const threshold = variant.thresholds[balance.warehouseId];
            if (!threshold) continue;

            if (balance.onhandQty < threshold.min) {
                alerts.push({ warehouse, product, variant, onhandQty: balance.onhandQty, threshold, type: 'MIN' });
            }
            if (balance.onhandQty > threshold.max) {
                alerts.push({ warehouse, product, variant, onhandQty: balance.onhandQty, threshold, type: 'MAX' });
            }
        }
        return alerts;
    }

    async getAlerts(): Promise<Alert[]> {
        await delay(600);
        return this.getAlertsInternal();
    }
    
    async getStockOnHand(date: string, warehouseId?: number) {
        await delay(1000);
        const result: any[] = [];
    
        for (const product of db.products) {
            for (const variant of product.variants) {
                
                // 1. Get On-Hand Qty
                let onhandQty = 0;
                if (warehouseId) {
                    const balance = db.inventoryBalances.find(b => b.variantId === variant.id && b.warehouseId === warehouseId);
                    onhandQty = balance?.onhandQty || 0;
                } else {
                    onhandQty = db.inventoryBalances
                        .filter(b => b.variantId === variant.id)
                        .reduce((sum, b) => sum + b.onhandQty, 0);
                }

                // 2. Get Imported/Exported Qty
                let importedQty = 0;
                let exportedQty = 0;
                const relevantTransactions = db.transactions.filter(t => 
                    t.status === TransactionStatus.APPROVED && t.items.some(i => i.variantId === variant.id)
                );

                for (const t of relevantTransactions) {
                    const item = t.items.find(i => i.variantId === variant.id)!;
                    if (t.type === TransactionType.IMPORT) {
                        if (!warehouseId || t.warehouseToId === warehouseId) {
                            importedQty += item.qty;
                        }
                    } else if (t.type === TransactionType.EXPORT) {
                        if (!warehouseId || t.warehouseFromId === warehouseId) {
                            exportedQty += item.qty;
                        }
                    }
                }

                // 3. Get Thresholds
                const threshold = warehouseId ? variant.thresholds[warehouseId] : null;
                const fallbackThreshold = variant.thresholds[Object.keys(variant.thresholds)[0]] || { min: 0, max: 0 };

                // 4. Combine data
                result.push({
                    groupName: product.group.name,
                    sku: variant.variantSku,
                    productName: product.name,
                    imageUrl: product.imageUrl,
                    spec: variant.spec || '-',
                    unit: product.unit,
                    purchasePrice: variant.purchasePrice || 0,
                    sellingPrice: variant.sellingPrice || 0,
                    minQty: threshold ? threshold.min : fallbackThreshold.min,
                    maxQty: threshold ? threshold.max : fallbackThreshold.max,
                    importedQty,
                    exportedQty,
                    onHandQty: onhandQty,
                    inventoryValue: onhandQty * (variant.purchasePrice || 0),
                    note: product.note || '',
                    status: product.status || 'Đang hoạt động',
                    createdDate: product.createdAt || '-',
                    createdBy: product.createdBy || 'Nguyễn Văn An',
                });
            }
        }
    
        return result.sort((a, b) => {
            const groupA = db.productGroups.find(g => g.name === a.groupName)?.id || 99;
            const groupB = db.productGroups.find(g => g.name === b.groupName)?.id || 99;
            if (groupA < groupB) return -1;
            if (groupA > groupB) return 1;
            return a.sku.localeCompare(b.sku);
        });
    }
    
    async getVariants(): Promise<ProductVariant[]> {
        await delay(300);
        return db.products.flatMap(p => p.variants);
    }
    
    async getStockCard(variantId: number, warehouseId: number, from: string, to: string): Promise<StockCardEntry[]> {
        await delay(1200);
        const relevantTransactions = db.transactions.filter(t => 
            t.status === TransactionStatus.APPROVED &&
            t.date >= from && t.date <= to &&
            t.items.some(item => item.variantId === variantId) &&
            (t.warehouseFromId === warehouseId || t.warehouseToId === warehouseId)
        );

        let balance = 0; // Simplified: in real app, get opening balance
        
        const entries: StockCardEntry[] = [];
        for (const t of relevantTransactions) {
            const item = t.items.find(i => i.variantId === variantId)!;
            let importQty = 0;
            let exportQty = 0;

            if (t.type === TransactionType.IMPORT && t.warehouseToId === warehouseId) {
                importQty = item.qty;
                balance += item.qty;
            } else if (t.type === TransactionType.EXPORT && t.warehouseFromId === warehouseId) {
                exportQty = item.qty;
                balance -= item.qty;
            }
            // ... handle TRANSFER, ADJUST
            
            if (importQty > 0 || exportQty > 0) {
                 entries.push({
                    date: t.date,
                    transactionCode: t.code,
                    transactionType: t.type,
                    note: t.note || '',
                    importQty,
                    exportQty,
                    balance,
                });
            }
        }
        return entries;
    }

    async getTransactions(): Promise<StockTransaction[]> {
        await delay(500);
        return [...db.transactions].sort((a,b) => b.id - a.id);
    }

    async createStockTransaction(
        transactionData: Omit<StockTransaction, 'id' | 'status' | 'createdBy' | 'items'> & { items: Omit<StockTransactionItem, 'id'>[] }, 
        actorId: number
    ): Promise<StockTransaction> {
        await delay(1000);

        if (transactionData.type === TransactionType.IMPORT && !transactionData.warehouseToId) {
            throw new Error("Warehouse is required for import transaction.");
        }
        if (transactionData.type === TransactionType.EXPORT && !transactionData.warehouseFromId) {
            throw new Error("Warehouse is required for export transaction.");
        }
        if (transactionData.type === TransactionType.ADJUST && !transactionData.warehouseFromId) {
            throw new Error("Warehouse is required for adjustment transaction.");
        }


        const newTransactionId = db.transactions.length > 0 ? Math.max(...db.transactions.map(t => t.id)) + 1 : 1;
        
        let maxItemId = db.transactions.flatMap(t => t.items).reduce((max, item) => Math.max(max, item.id), 0);
        
        const newItems: StockTransactionItem[] = transactionData.items.map(item => {
            maxItemId++;
            return { ...item, id: maxItemId };
        });

        const newTransaction: StockTransaction = {
            ...transactionData,
            id: newTransactionId,
            items: newItems,
            createdBy: actorId,
            status: TransactionStatus.APPROVED, // Auto-approve for simplicity
        };
        
        // --- IMPORTANT: Update inventory balances ---
        if (newTransaction.type === TransactionType.IMPORT) {
            for (const item of newItems) {
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === newTransaction.warehouseToId
                );
                if (balance) {
                    balance.onhandQty += item.qty;
                } else {
                    db.inventoryBalances.push({
                        variantId: item.variantId,
                        warehouseId: newTransaction.warehouseToId!,
                        onhandQty: item.qty
                    });
                }
            }
        } else if (newTransaction.type === TransactionType.EXPORT) {
            for (const item of newItems) {
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === newTransaction.warehouseFromId
                );
    
                if (!balance || balance.onhandQty < item.qty) {
                    const variant = db.products.flatMap(p => p.variants).find(v => v.id === item.variantId);
                    throw new Error(`Không đủ tồn kho cho sản phẩm ${variant?.variantSku || 'N/A'}. Tồn kho: ${balance?.onhandQty || 0}, Cần xuất: ${item.qty}`);
                }
                balance.onhandQty -= item.qty;
            }
        } else if (newTransaction.type === TransactionType.TRANSFER) {
            if (!newTransaction.warehouseFromId || !newTransaction.warehouseToId) {
                throw new Error("Cả kho đi và kho đến đều là bắt buộc cho việc chuyển kho.");
            }
            if (newTransaction.warehouseFromId === newTransaction.warehouseToId) {
                throw new Error("Kho đi và kho đến không được trùng nhau.");
            }
        
            for (const item of newItems) {
                // Decrement from source warehouse
                let balanceFrom = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === newTransaction.warehouseFromId
                );
                if (!balanceFrom || balanceFrom.onhandQty < item.qty) {
                    const variant = db.products.flatMap(p => p.variants).find(v => v.id === item.variantId);
                    throw new Error(`Không đủ tồn kho tại kho đi cho sản phẩm ${variant?.variantSku || 'N/A'}. Tồn kho: ${balanceFrom?.onhandQty || 0}, Cần chuyển: ${item.qty}`);
                }
                balanceFrom.onhandQty -= item.qty;
        
                // Increment to destination warehouse
                let balanceTo = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === newTransaction.warehouseToId
                );
                if (balanceTo) {
                    balanceTo.onhandQty += item.qty;
                } else {
                    db.inventoryBalances.push({
                        variantId: item.variantId,
                        warehouseId: newTransaction.warehouseToId,
                        onhandQty: item.qty
                    });
                }
            }
        } else if (newTransaction.type === TransactionType.ADJUST) {
             for (const item of newItems) {
                const warehouseId = newTransaction.warehouseFromId; // For adjustments, warehouse is specified in fromId
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === warehouseId
                );
                if (balance) {
                    // item.qty represents the CHANGE (new - old)
                    balance.onhandQty += item.qty;
                } else {
                    db.inventoryBalances.push({
                        variantId: item.variantId,
                        warehouseId: warehouseId!,
                        onhandQty: item.qty
                    });
                }
            }
        }
        
        db.transactions.unshift(newTransaction);
        let actionType = 'CREATE_TRANSACTION';
        if(newTransaction.type === TransactionType.IMPORT) actionType = 'CREATE_STOCK_IMPORT';
        if(newTransaction.type === TransactionType.EXPORT) actionType = 'CREATE_STOCK_EXPORT';
        if(newTransaction.type === TransactionType.TRANSFER) actionType = 'CREATE_STOCK_TRANSFER';
        if(newTransaction.type === TransactionType.ADJUST) actionType = 'CREATE_STOCK_ADJUSTMENT';

        this.logAction(actorId, actionType, 'StockTransaction', newTransaction.id, undefined, { code: newTransaction.code, totalItems: newTransaction.items.length });
        db.save();
        return newTransaction;
    }
    
    async updateStockTransaction(
        transactionId: number,
        transactionData: { 
            date: string;
            supplierId?: number;
            employeeId?: number;
            note?: string;
            items: (Pick<StockTransactionItem, 'variantId' | 'qty' | 'unitCost'> & { id?: number })[];
        },
        actorId: number
    ): Promise<StockTransaction> {
        await delay(800);
        const transaction = db.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            throw new Error("Không tìm thấy giao dịch.");
        }
    
        if (transaction.status !== TransactionStatus.APPROVED) {
            throw new Error("Chỉ có thể cập nhật các giao dịch đã được duyệt.");
        }
        
        const originalData = JSON.parse(JSON.stringify(transaction)); // For logging

        // 1. Revert original inventory impact
        if (transaction.type === TransactionType.IMPORT) {
            for (const item of transaction.items) {
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseToId
                );
                if (balance) {
                    balance.onhandQty -= item.qty;
                }
            }
        } else if (transaction.type === TransactionType.EXPORT) {
             for (const item of transaction.items) {
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseFromId
                );
                if (balance) {
                    balance.onhandQty += item.qty;
                }
            }
        }
    
        // 2. Apply new inventory impact & check stock for export
        if (transaction.type === TransactionType.EXPORT) {
            for (const item of transactionData.items) {
                 let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseFromId
                );
                if (!balance || balance.onhandQty < item.qty) {
                    // Re-apply original impact before throwing error
                    for (const oldItem of transaction.items) {
                         let b = db.inventoryBalances.find(bal => 
                            bal.variantId === oldItem.variantId && bal.warehouseId === transaction.warehouseFromId
                        );
                        if(b) b.onhandQty -= oldItem.qty;
                    }
                    const variant = db.products.flatMap(p => p.variants).find(v => v.id === item.variantId);
                    throw new Error(`Không đủ tồn kho để cập nhật cho sản phẩm ${variant?.variantSku}. Tồn: ${balance?.onhandQty || 0}, Cần: ${item.qty}`);
                }
                balance.onhandQty -= item.qty;
            }
        } else if (transaction.type === TransactionType.IMPORT) {
             for (const item of transactionData.items) {
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseToId
                );
                if (balance) {
                    balance.onhandQty += item.qty;
                } else {
                     db.inventoryBalances.push({
                        variantId: item.variantId,
                        warehouseId: transaction.warehouseToId!,
                        onhandQty: item.qty
                    });
                }
            }
        }

        // 3. Update transaction data
        transaction.date = transactionData.date;
        transaction.supplierId = transactionData.supplierId;
        transaction.employeeId = transactionData.employeeId;
        transaction.note = transactionData.note;

        let maxItemId = db.transactions.flatMap(t => t.items).reduce((max, item) => Math.max(max, item.id), 0);
        const updatedItems: StockTransactionItem[] = [];
        const existingItemIds = new Set<number>();
        
        for(const itemData of transactionData.items) {
            if(itemData.id) { // Existing item
                const existingItem = transaction.items.find(i => i.id === itemData.id);
                if (existingItem) {
                    existingItem.qty = itemData.qty;
                    existingItem.unitCost = itemData.unitCost;
                    updatedItems.push(existingItem);
                    existingItemIds.add(existingItem.id);
                }
            } else { // New item
                maxItemId++;
                updatedItems.push({
                    id: maxItemId,
                    variantId: itemData.variantId,
                    qty: itemData.qty,
                    unitCost: itemData.unitCost
                });
            }
        }

        transaction.items = updatedItems;

        this.logAction(actorId, "UPDATE_TRANSACTION", "StockTransaction", transactionId, { itemsCount: originalData.items.length }, { itemsCount: transaction.items.length });
        db.save();
        return transaction;
    }

    async deleteTransaction(transactionId: number, actorId: number): Promise<void> {
        await delay(800);
        const transactionIndex = db.transactions.findIndex(t => t.id === transactionId);
        if (transactionIndex === -1) {
            throw new Error("Không tìm thấy giao dịch.");
        }
        const transaction = db.transactions[transactionIndex];
    
        if (transaction.status !== TransactionStatus.APPROVED) {
            throw new Error("Chỉ có thể xóa các giao dịch đã được duyệt.");
        }
    
        // Revert inventory impact
        if (transaction.type === TransactionType.IMPORT) {
            for (const item of transaction.items) {
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseToId
                );
                // Check if deletion would result in negative stock
                if (!balance || balance.onhandQty < item.qty) {
                     const variant = db.products.flatMap(p => p.variants).find(v => v.id === item.variantId);
                    throw new Error(`Không thể xóa phiếu nhập. Việc này sẽ dẫn đến tồn kho âm cho sản phẩm ${variant?.variantSku || 'N/A'}.`);
                }
                balance.onhandQty -= item.qty;
            }
        } else if (transaction.type === TransactionType.EXPORT) {
            for (const item of transaction.items) {
                let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseFromId
                );
                if (balance) {
                    balance.onhandQty += item.qty;
                } else {
                     db.inventoryBalances.push({
                        variantId: item.variantId,
                        warehouseId: transaction.warehouseFromId!,
                        onhandQty: item.qty
                    });
                }
            }
        } else if (transaction.type === TransactionType.TRANSFER) {
            for (const item of transaction.items) {
                // Check if deletion would cause negative stock in destination warehouse
                let balanceTo = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseToId
                );
                if (!balanceTo || balanceTo.onhandQty < item.qty) {
                    const variant = db.products.flatMap(p => p.variants).find(v => v.id === item.variantId);
                    throw new Error(`Không thể xóa phiếu chuyển. Việc này sẽ dẫn đến tồn kho âm cho sản phẩm ${variant?.variantSku || 'N/A'} tại kho đến.`);
                }
                balanceTo.onhandQty -= item.qty; // Subtract from destination
        
                // Add back to source warehouse
                let balanceFrom = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseFromId
                );
                if (balanceFrom) {
                    balanceFrom.onhandQty += item.qty;
                } else {
                    db.inventoryBalances.push({
                        variantId: item.variantId,
                        warehouseId: transaction.warehouseFromId!,
                        onhandQty: item.qty
                    });
                }
            }
        } else if (transaction.type === TransactionType.ADJUST) {
             for (const item of transaction.items) {
                 let balance = db.inventoryBalances.find(b => 
                    b.variantId === item.variantId && b.warehouseId === transaction.warehouseFromId
                );
                if (balance) {
                    balance.onhandQty -= item.qty; // Revert the adjustment
                }
             }
        }
    
        // Delete the transaction
        db.transactions.splice(transactionIndex, 1);
        
        this.logAction(actorId, "DELETE_TRANSACTION", "StockTransaction", transactionId, { code: transaction.code });
        db.save();
    }
    
    async getUsers(): Promise<User[]> {
        await delay(100);
        return [...db.users];
    }
    
    async getSuppliers(): Promise<Supplier[]> {
        await delay(100);
        return [...db.suppliers];
    }

    async createSupplier(data: { code: string; name: string; }, actorId: number): Promise<Supplier> {
        await delay(500);
        if (db.suppliers.some(s => s.code === data.code)) {
            throw new Error(`Mã nhà cung cấp "${data.code}" đã tồn tại.`);
        }
        const newSupplier: Supplier = {
            id: db.suppliers.length > 0 ? Math.max(...db.suppliers.map(s => s.id)) + 1 : 1,
            code: data.code,
            name: data.name,
        };
        db.suppliers.push(newSupplier);
        this.logAction(actorId, 'CREATE_SUPPLIER', 'Supplier', newSupplier.id, undefined, { code: data.code, name: data.name });
        db.save();
        return newSupplier;
    }

    async updateSupplier(id: number, data: { code: string; name: string; }, actorId: number): Promise<Supplier> {
        await delay(500);
        const supplier = db.suppliers.find(s => s.id === id);
        if (!supplier) throw new Error("Nhà cung cấp không tồn tại.");
        
        if (db.suppliers.some(s => s.code === data.code && s.id !== id)) {
            throw new Error(`Mã nhà cung cấp "${data.code}" đã tồn tại.`);
        }
        
        const oldData = { code: supplier.code, name: supplier.name };
        supplier.code = data.code;
        supplier.name = data.name;
        
        this.logAction(actorId, 'UPDATE_SUPPLIER', 'Supplier', id, oldData, data);
        db.save();
        return supplier;
    }

    async deleteSupplier(id: number, actorId: number): Promise<void> {
        await delay(500);
        const isUsed = db.transactions.some(t => t.supplierId === id);
        if (isUsed) {
            throw new Error("Không thể xóa nhà cung cấp đang được sử dụng trong giao dịch.");
        }
        const supplierIndex = db.suppliers.findIndex(s => s.id === id);
        if (supplierIndex === -1) throw new Error("Nhà cung cấp không tồn tại.");

        const [deletedSupplier] = db.suppliers.splice(supplierIndex, 1);
        this.logAction(actorId, 'DELETE_SUPPLIER', 'Supplier', id, { name: deletedSupplier.name });
        db.save();
    }
    
    async getEmployees(): Promise<Employee[]> {
        await delay(100);
        return [...db.employees];
    }

    async createEmployee(data: { code: string; name: string; }, actorId: number): Promise<Employee> {
        await delay(500);
        if (db.employees.some(e => e.code === data.code)) {
            throw new Error(`Mã nhân viên "${data.code}" đã tồn tại.`);
        }
        const newEmployee: Employee = {
            id: db.employees.length > 0 ? Math.max(...db.employees.map(e => e.id)) + 1 : 1,
            ...data,
        };
        db.employees.push(newEmployee);
        this.logAction(actorId, 'CREATE_EMPLOYEE', 'Employee', newEmployee.id, undefined, data);
        db.save();
        return newEmployee;
    }

    async updateEmployee(id: number, data: { code: string; name: string; }, actorId: number): Promise<Employee> {
        await delay(500);
        const employee = db.employees.find(e => e.id === id);
        if (!employee) throw new Error("Nhân viên không tồn tại.");
        
        if (db.employees.some(e => e.code === data.code && e.id !== id)) {
            throw new Error(`Mã nhân viên "${data.code}" đã tồn tại.`);
        }
        
        const oldData = { code: employee.code, name: employee.name };
        Object.assign(employee, data);
        
        this.logAction(actorId, 'UPDATE_EMPLOYEE', 'Employee', id, oldData, data);
        db.save();
        return employee;
    }

    async deleteEmployee(id: number, actorId: number): Promise<void> {
        await delay(500);
        const isUsed = db.transactions.some(t => t.employeeId === id);
        if (isUsed) {
            throw new Error("Không thể xóa nhân viên đang được sử dụng trong giao dịch.");
        }
        const index = db.employees.findIndex(e => e.id === id);
        if (index === -1) throw new Error("Nhân viên không tồn tại.");

        const [deletedEmployee] = db.employees.splice(index, 1);
        this.logAction(actorId, 'DELETE_EMPLOYEE', 'Employee', id, { name: deletedEmployee.name });
        db.save();
    }


    async getAuditLogs(): Promise<AuditLog[]> {
        await delay(400);
        return [...db.auditLogs];
    }
    
    async getInventoryForWarehouse(warehouseId: number): Promise<InventoryBalance[]> {
        await delay(400);
        return db.inventoryBalances.filter(b => b.warehouseId === warehouseId);
    }
    
    async getProductDetailsBySku(sku: string) {
        await delay(200);
        const allStockData = await this.getStockOnHand(new Date().toISOString().split('T')[0]);
        const productData = allStockData.find(item => item.sku === sku);
        if (!productData) throw new Error("Product data not found for SKU");

        const product = db.products.find(p => p.variants.some(v => v.variantSku === sku));
        const variant = product?.variants.find(v => v.variantSku === sku);
        if (!product || !variant) throw new Error("Product or variant not found in DB");

        return {
            product,
            variant,
            importedQty: productData.importedQty,
            exportedQty: productData.exportedQty,
            onHandQty: productData.onHandQty,
            inventoryValue: productData.inventoryValue,
        };
    }

    async getTransactionsBySku(sku: string) {
        await delay(300);
        const variant = db.products.flatMap(p => p.variants).find(v => v.variantSku === sku);
        if (!variant) throw new Error("Variant not found");
        const product = db.products.find(p => p.id === variant.productId)!;

        const imports = [];
        const exports = [];

        const relevantTransactions = db.transactions.filter(t => 
            t.status === TransactionStatus.APPROVED && t.items.some(i => i.variantId === variant.id)
        );

        for (const t of relevantTransactions) {
            const item = t.items.find(i => i.variantId === variant.id)!;
            const detailItem = {
                transactionCode: t.code,
                date: t.date,
                productName: product.name,
                unit: product.unit,
                qty: item.qty,
                unitCost: item.unitCost,
                total: item.qty * item.unitCost,
            };
            if (t.type === TransactionType.IMPORT) {
                imports.push(detailItem);
            } else if (t.type === TransactionType.EXPORT) {
                exports.push(detailItem);
            }
        }
        
        return { imports, exports };
    }
}


export const api = new MockApi();