import { Role, User, Warehouse, ProductGroup, Product, InventoryBalance, StockTransaction, AuditLog, Supplier, Employee } from "../types";

// --- SEED DATA ---
const users: User[] = [
    { id: 1, name: "Admin", email: "admin@masterkeys.vn", role: Role.QUAN_LY, password: "admin" },
    { id: 2, name: "Hà Nội Kho", email: "thukho@masterkeys.vn", role: Role.THU_KHO, password: "thukho" },
    { id: 3, name: "Kế toán tổng hợp", email: "ketoan@masterkeys.vn", role: Role.KE_TOAN, password: "ketoan" },
    { id: 4, name: "Bán hàng 1", email: "banhang1@example.com", role: Role.NHAN_VIEN_BAN_HANG, password: "password" },
    { id: 5, name: "Viewer", email: "viewer@example.com", role: Role.VIEWER, password: "password" },
    { id: 6, name: "Nguyễn Văn An", email: "an.nguyen@example.com", role: Role.QUAN_LY, password: "password" },
    { id: 7, name: "Nhân viên Xem", email: "nhanvien@masterkeys.vn", role: Role.VIEWER, password: "nhanvien" },
];

const warehouses: Warehouse[] = [
    { id: 1, code: "KHO-A", name: "Kho A" },
    { id: 2, code: "KHO-B", name: "Kho B" },
    { id: 3, code: "KHO-01", name: "Kho 01" },
    { id: 4, code: "KHO-Q2", name: "Kho Q2" },
];

const productGroups: ProductGroup[] = [
    { id: 1, name: "BỘ KHOÁ TAY GẠT" },
    { id: 2, name: "BỘ KHOÁ TAY NẮM TRÒN" },
    { id: 3, name: "KHOÁ TỦ" },
    { id: 4, name: "BỘ KHOÁ CỬA KÍNH" },
    { id: 5, name: "CỬA CUỐN" },
    { id: 6, name: "RUỘT KHOÁ" },
    { id: 7, name: "REMOTE OTO (có mạch)" },
    { id: 8, name: "VỎ REMOTE OTO" },
];


const suppliers: Supplier[] = [
    { id: 1, code: "DMX", name: "Điện Máy Xanh" },
    { id: 2, code: "FPT", name: "FPT Shop" },
    { id: 3, code: "TGDĐ", name: "Thế Giới Di Động" },
    { id: 4, code: "GLVN", name: "Greenlife VN" },
];

const employees: Employee[] = [
    { id: 1, code: "NV001", name: "Trần Văn Bình (Nhân viên A)" },
    { id: 2, code: "NV002", name: "Lê Thị Cúc" },
    { id: 3, code: "NV003", name: "Phạm Hùng Dũng" },
];

let products: Product[] = [
    // Group 1: BỘ KHOÁ TAY GẠT
    {
        id: 1, sku: "BKTG01", name: "KIM LONG đơn điểm", group: productGroups[0], unit: "Bộ", imageUrl: "https://picsum.photos/id/401/200/200",
        variants: [
            { id: 1, productId: 1, variantSku: "BKTG01-DEN", color: "Đen", thresholds: { 1: { min: 2, max: 10 } } },
            { id: 2, productId: 1, variantSku: "BKTG01-TRG", color: "Trắng", thresholds: { 1: { min: 2, max: 10 } } },
        ]
    },
    {
        id: 2, sku: "BKTG02", name: "KIM LONG đa điểm", group: productGroups[0], unit: "Bộ", imageUrl: "https://picsum.photos/id/402/200/200",
        variants: [
            { id: 3, productId: 2, variantSku: "BKTG02-DEN", color: "Đen", thresholds: { 1: { min: 2, max: 10 } } },
            { id: 4, productId: 2, variantSku: "BKTG02-TRG", color: "Trắng", thresholds: { 1: { min: 2, max: 10 } } },
        ]
    },
    {
        id: 3, sku: "BKTG03", name: "PASINI 26cm", group: productGroups[0], unit: "Bộ", imageUrl: "https://picsum.photos/id/403/200/200",
        variants: [ { id: 5, productId: 3, variantSku: "BKTG03-INOX", spec: "26cm", color: "Inox 304", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 4, sku: "BKTG04", name: "PASINI 20cm", group: productGroups[0], unit: "Bộ", imageUrl: "https://picsum.photos/id/404/200/200",
        variants: [ { id: 6, productId: 4, variantSku: "BKTG04-INOX", spec: "20cm", color: "Inox 304", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 5, sku: "BKTG05", name: "TOP", group: productGroups[0], unit: "Bộ", imageUrl: "https://picsum.photos/id/405/200/200",
        variants: [ { id: 7, productId: 5, variantSku: "BKTG05-INOX", color: "Inox 304", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 6, sku: "BKTG06", name: "BOSCA", group: productGroups[0], unit: "Bộ", imageUrl: "https://picsum.photos/id/406/200/200",
        variants: [ { id: 8, productId: 6, variantSku: "BKTG06-INOX", color: "Inox 304", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 7, sku: "BKTG07", name: "GOLKING", group: productGroups[0], unit: "Bộ", imageUrl: "https://picsum.photos/id/407/200/200",
        variants: [ { id: 9, productId: 7, variantSku: "BKTG07-INOX", color: "Inox 304", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    // Group 2: BỘ KHOÁ TAY NẮM TRÒN
    {
        id: 8, sku: "BKTNT01", name: "PASINI (LOCK)", group: productGroups[1], unit: "Bộ", imageUrl: "https://picsum.photos/id/411/200/200",
        variants: [ { id: 10, productId: 8, variantSku: "BKTNT01", thresholds: { 1: { min: 5, max: 20 } } } ]
    },
    {
        id: 9, sku: "BKTNT02", name: "BLOSSOM", group: productGroups[1], unit: "Bộ", imageUrl: "https://picsum.photos/id/412/200/200",
        variants: [ { id: 11, productId: 9, variantSku: "BKTNT02", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    // Group 3: KHOÁ TỦ
    {
        id: 10, sku: "KT01", name: "CỐP 3 PHÂN", group: productGroups[2], unit: "Cái", imageUrl: "https://picsum.photos/id/421/200/200",
        variants: [ { id: 12, productId: 10, variantSku: "KT01", thresholds: { 1: { min: 10, max: 50 } } } ]
    },
    {
        id: 11, sku: "KT02", name: "CỐP 2 PHÂN", group: productGroups[2], unit: "Cái", imageUrl: "https://picsum.photos/id/422/200/200",
        variants: [ { id: 13, productId: 11, variantSku: "KT02", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 12, sku: "KT03", name: "TỦ VUÔNG SOLEX", group: productGroups[2], unit: "Cái", imageUrl: "https://picsum.photos/id/423/200/200",
        variants: [ { id: 14, productId: 12, variantSku: "KT03", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 13, sku: "KT04", name: "TỦ VUÔNG (chung)", group: productGroups[2], unit: "Cái", imageUrl: "https://picsum.photos/id/424/200/200",
        variants: [ { id: 15, productId: 13, variantSku: "KT04", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 14, sku: "KT05", name: "CỐP 3 PHÂN (NEO)", group: productGroups[2], unit: "Cái", imageUrl: "https://picsum.photos/id/425/200/200",
        variants: [ { id: 16, productId: 14, variantSku: "KT05", thresholds: { 1: { min: 5, max: 30 } } } ]
    },
    {
        id: 15, sku: "KT06", name: "TỦ VUÔNG HAFELE", group: productGroups[2], unit: "Cái", imageUrl: "https://picsum.photos/id/426/200/200",
        variants: [ { id: 17, productId: 15, variantSku: "KT06", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    // Group 4: BỘ KHOÁ CỬA KÍNH
    {
        id: 16, sku: "BKCK01", name: "CHÂN KÍNH VUÔNG", group: productGroups[3], unit: "Bộ", imageUrl: "https://picsum.photos/id/431/200/200",
        variants: [ { id: 18, productId: 16, variantSku: "BKCK01", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 17, sku: "BKCK02", name: "CHÂN KÍNH DÀI LOAN CỬA LÙA", group: productGroups[3], unit: "Bộ", imageUrl: "https://picsum.photos/id/432/200/200",
        variants: [ { id: 19, productId: 17, variantSku: "BKCK02", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    // Group 5: CỬA CUỐN
    {
        id: 18, sku: "CC01", name: "HỘP ĐIỀU KHIỂN", group: productGroups[4], unit: "Bộ", imageUrl: "https://picsum.photos/id/441/200/200",
        variants: [ { id: 20, productId: 18, variantSku: "CC01", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 19, sku: "CC02", name: "REMOTE 433 (sao chép)", group: productGroups[4], unit: "Cái", imageUrl: "https://picsum.photos/id/442/200/200",
        variants: [ { id: 21, productId: 19, variantSku: "CC02-DEN", color: "Đen", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    // Group 6: RUỘT KHOÁ
    {
        id: 20, sku: "RK01", name: "7 PHÂN 2 ĐẦU CHÌA (tim lớn)", group: productGroups[5], unit: "Cái", imageUrl: "https://picsum.photos/id/451/200/200",
        variants: [ { id: 22, productId: 20, variantSku: "RK01", thresholds: { 1: { min: 5, max: 15 } } } ]
    },
    {
        id: 21, sku: "RK02", name: "7 PHÂN 2 ĐẦU CHÌA (tim nhỏ)", group: productGroups[5], unit: "Cái", imageUrl: "https://picsum.photos/id/452/200/200",
        variants: [ { id: 23, productId: 21, variantSku: "RK02", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 22, sku: "RK03", name: "6 PHÂN 2 ĐẦU CHÌA (tim lớn)", group: productGroups[5], unit: "Cái", imageUrl: "https://picsum.photos/id/453/200/200",
        variants: [ { id: 24, productId: 22, variantSku: "RK03", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    // Group 7: REMOTE OTO (có mạch)
    {
        id: 23, sku: "ROCM01", name: "AIKEY vỏ cam (không chip)", group: productGroups[6], unit: "Cái", imageUrl: "https://picsum.photos/id/461/200/200",
        variants: [ { id: 25, productId: 23, variantSku: "ROCM01", thresholds: { 1: { min: 5, max: 20 } } } ]
    },
    {
        id: 24, sku: "ROCM02", name: "AIKEY vỏ xanh (có chip)", group: productGroups[6], unit: "Cái", imageUrl: "https://picsum.photos/id/462/200/200",
        variants: [ { id: 26, productId: 24, variantSku: "ROCM02", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 25, sku: "ROCM03", name: "SANTAFE 2019 (chip 47.433)", group: productGroups[6], unit: "Cái", imageUrl: "https://picsum.photos/id/463/200/200",
        variants: [ { id: 27, productId: 25, variantSku: "ROCM03", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    {
        id: 26, sku: "ROCM04", name: "FORD (chip 49.433)", group: productGroups[6], unit: "Cái", imageUrl: "https://picsum.photos/id/464/200/200",
        variants: [ { id: 28, productId: 26, variantSku: "ROCM04", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    {
        id: 27, sku: "ROCM05", name: "KIA SMART (4 nút viền đỏ mã bo VVDI)", group: productGroups[6], unit: "Cái", imageUrl: "https://picsum.photos/id/465/200/200",
        variants: [ { id: 29, productId: 27, variantSku: "ROCM05", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    // Group 8: VỎ REMOTE OTO
    {
        id: 28, sku: "VRO01", name: "TOYOTA VENZA", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/471/200/200",
        variants: [ { id: 30, productId: 28, variantSku: "VRO01", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 29, sku: "VRO02", name: "TOYOTA VIOS", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/472/200/200",
        variants: [ { id: 31, productId: 29, variantSku: "VRO02", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    {
        id: 30, sku: "VRO03", name: "TOYOTA INNOVA (4 nút)", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/473/200/200",
        variants: [ { id: 32, productId: 30, variantSku: "VRO03", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 31, sku: "VRO04", name: "CAMRY (4 nút)", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/474/200/200",
        variants: [ { id: 33, productId: 31, variantSku: "VRO04", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 32, sku: "VRO05", name: "CAMRY (1 nút)", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/475/200/200",
        variants: [ { id: 34, productId: 32, variantSku: "VRO05", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    {
        id: 33, sku: "VRO06", name: "LEXES (4 nút)", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/476/200/200",
        variants: [ { id: 35, productId: 33, variantSku: "VRO06", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
    {
        id: 34, sku: "VRO07", name: "LEXUS (3 nút)", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/477/200/200",
        variants: [ { id: 36, productId: 34, variantSku: "VRO07", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    {
        id: 35, sku: "VRO08", name: "FORD", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/478/200/200",
        variants: [ { id: 37, productId: 35, variantSku: "VRO08", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    {
        id: 36, sku: "VRO09", name: "SUBARU", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/479/200/200",
        variants: [ { id: 38, productId: 36, variantSku: "VRO09", thresholds: { 1: { min: 1, max: 5 } } } ]
    },
    {
        id: 37, sku: "VRO10", name: "CHEVROLET", group: productGroups[7], unit: "Cái", imageUrl: "https://picsum.photos/id/480/200/200",
        variants: [ { id: 39, productId: 37, variantSku: "VRO10", thresholds: { 1: { min: 2, max: 10 } } } ]
    },
];

let inventoryBalances: InventoryBalance[] = [
    { warehouseId: 1, variantId: 1, onhandQty: 6 },
    { warehouseId: 1, variantId: 2, onhandQty: 1 },
    { warehouseId: 1, variantId: 3, onhandQty: 2 },
    { warehouseId: 1, variantId: 4, onhandQty: 0 },
    { warehouseId: 1, variantId: 5, onhandQty: 2 },
    { warehouseId: 1, variantId: 6, onhandQty: 1 },
    { warehouseId: 1, variantId: 7, onhandQty: 4 },
    { warehouseId: 1, variantId: 8, onhandQty: 1 },
    { warehouseId: 1, variantId: 9, onhandQty: 2 },
    { warehouseId: 1, variantId: 10, onhandQty: 16 },
    { warehouseId: 1, variantId: 11, onhandQty: 3 },
    { warehouseId: 1, variantId: 12, onhandQty: 29 },
    { warehouseId: 1, variantId: 13, onhandQty: 3 },
    { warehouseId: 1, variantId: 14, onhandQty: 2 },
    { warehouseId: 1, variantId: 15, onhandQty: 4 },
    { warehouseId: 1, variantId: 16, onhandQty: 24 },
    { warehouseId: 1, variantId: 17, onhandQty: 3 },
    { warehouseId: 1, variantId: 18, onhandQty: 3 },
    { warehouseId: 1, variantId: 19, onhandQty: 1 },
    { warehouseId: 1, variantId: 20, onhandQty: 3 },
    { warehouseId: 1, variantId: 21, onhandQty: 3 },
    { warehouseId: 1, variantId: 22, onhandQty: 10 },
    { warehouseId: 1, variantId: 23, onhandQty: 2 },
    { warehouseId: 1, variantId: 24, onhandQty: 2 },
    { warehouseId: 1, variantId: 25, onhandQty: 14 },
    { warehouseId: 1, variantId: 26, onhandQty: 3 },
    { warehouseId: 1, variantId: 27, onhandQty: 1 },
    { warehouseId: 1, variantId: 28, onhandQty: 1 },
    { warehouseId: 1, variantId: 29, onhandQty: 2 },
    { warehouseId: 1, variantId: 30, onhandQty: 4 },
    { warehouseId: 1, variantId: 31, onhandQty: 1 },
    { warehouseId: 1, variantId: 32, onhandQty: 3 },
    { warehouseId: 1, variantId: 33, onhandQty: 3 },
    { warehouseId: 1, variantId: 34, onhandQty: 1 },
    { warehouseId: 1, variantId: 35, onhandQty: 4 },
    { warehouseId: 1, variantId: 36, onhandQty: 1 },
    { warehouseId: 1, variantId: 37, onhandQty: 1 },
    { warehouseId: 1, variantId: 38, onhandQty: 1 },
    { warehouseId: 1, variantId: 39, onhandQty: 3 },
];

let transactions: StockTransaction[] = [];


let auditLogs: AuditLog[] = [
    { id: 1, actor: users[0], action: "CREATE_PRODUCT", entityType: "Product", entityId: 1, after: { name: "Áo Thun Cổ Tròn" }, createdAt: new Date().toISOString() },
    { id: 2, actor: users[1], action: "APPROVE_TRANSACTION", entityType: "StockTransaction", entityId: 1, after: { status: "APPROVED" }, createdAt: new Date().toISOString() },
];


const DB_KEY = 'warehouse_management_db';

type DB = {
    users: User[];
    warehouses: Warehouse[];
    productGroups: ProductGroup[];
    suppliers: Supplier[];
    employees: Employee[];
    products: Product[];
    inventoryBalances: InventoryBalance[];
    transactions: StockTransaction[];
    auditLogs: AuditLog[];
}

class Database {
    public users: User[];
    public warehouses: Warehouse[];
    public productGroups: ProductGroup[];
    public suppliers: Supplier[];
    public employees: Employee[];
    public products: Product[];
    public inventoryBalances: InventoryBalance[];
    public transactions: StockTransaction[];
    public auditLogs: AuditLog[];

    constructor() {
        const savedDb = localStorage.getItem(DB_KEY);
        if (savedDb) {
            const parsedDb: DB = JSON.parse(savedDb);
            this.users = parsedDb.users;
            this.warehouses = parsedDb.warehouses;
            this.productGroups = parsedDb.productGroups;
            this.suppliers = parsedDb.suppliers;
            this.employees = parsedDb.employees;
            this.products = parsedDb.products;
            this.inventoryBalances = parsedDb.inventoryBalances;
            this.transactions = parsedDb.transactions;
            this.auditLogs = parsedDb.auditLogs;
        } else {
            this.users = users;
            this.warehouses = warehouses;
            this.productGroups = productGroups;
            this.suppliers = suppliers;
            this.employees = employees;
            this.products = products;
            this.inventoryBalances = inventoryBalances;
            this.transactions = transactions;
            this.auditLogs = auditLogs;
            this.save();
        }
    }

    save() {
        const data: DB = {
            users: this.users,
            warehouses: this.warehouses,
            productGroups: this.productGroups,
            suppliers: this.suppliers,
            employees: this.employees,
            products: this.products,
            inventoryBalances: this.inventoryBalances,
            transactions: this.transactions,
            auditLogs: this.auditLogs,
        };
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }
}

export const db = new Database();
