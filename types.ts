// src/types.ts

// ----------------------
// Phân quyền & vai trò
// ----------------------
export enum Role {
  QUAN_LY = "Quản lý",
  THU_KHO = "Thủ kho",
  KE_TOAN = "Kế toán",
  NHAN_VIEN_BAN_HANG = "Nhân viên bán hàng",
  VIEWER = "Viewer"
}

// ----------------------
// Tài khoản người dùng
// ----------------------
export interface User {
  id: string; // UUID của Supabase (chuỗi)
  name: string;
  email: string;
  role: Role;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>; // async logout với Supabase
  hasPermission: (roles: Role[]) => boolean;
}

// ----------------------
// Danh mục kho, sản phẩm
// ----------------------
export interface Warehouse {
  id: number;
  code: string;
  name: string;
}

export interface ProductGroup {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  group: ProductGroup;
  unit: string;
  imageUrl: string;
  variants: ProductVariant[];
  status?: string;
  createdAt?: string;
  createdBy?: string;
  note?: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  variantSku: string;
  color?: string;
  size?: string;
  spec?: string; // Quy cách
  attributes?: Record<string, string>;
  thresholds: Record<number, { min: number; max: number }>; // warehouseId -> {min, max}
  purchasePrice?: number; // Giá nhập
  sellingPrice?: number; // Giá bán
  totalStock?: number; // Tổng tồn kho
}

export type ProductWithStock = Product & {
  variants: (ProductVariant & { totalStock: number })[];
};

// ----------------------
// Giao dịch tồn kho
// ----------------------
export interface InventoryBalance {
  warehouseId: number;
  variantId: number;
  onhandQty: number;
}

export enum TransactionType {
  IMPORT = "IMPORT",
  EXPORT = "EXPORT",
  TRANSFER = "TRANSFER",
  ADJUST = "ADJUST"
}

export const TransactionTypeVietnamese: Record<TransactionType, string> = {
  [TransactionType.IMPORT]: "Phiếu Nhập",
  [TransactionType.EXPORT]: "Phiếu Xuất",
  [TransactionType.TRANSFER]: "Điều chuyển",
  [TransactionType.ADJUST]: "Kiểm kê"
};

export enum TransactionStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  CANCELLED = "CANCELLED"
}

export const TransactionStatusVietnamese: Record<TransactionStatus, string> = {
  [TransactionStatus.DRAFT]: "Nháp",
  [TransactionStatus.APPROVED]: "Đã duyệt",
  [TransactionStatus.CANCELLED]: "Đã hủy"
};

export interface StockTransactionItem {
  id: number;
  variantId: number;
  qty: number;
  unitCost: number;
  lotNumber?: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
}

export interface Employee {
  id: number;
  code: string;
  name: string;
}

export interface StockTransaction {
  id: number;
  code: string;
  type: TransactionType;
  date: string;
  warehouseFromId?: number;
  warehouseToId?: number;
  supplierId?: number;
  employeeId?: number;
  note?: string;
  status: TransactionStatus;
  items: StockTransactionItem[];
  createdBy: string; // id Supabase (chuỗi)
  approvedBy?: string;
}

// ----------------------
// Cảnh báo, nhật ký, thẻ kho
// ----------------------
export interface Alert {
  warehouse: Warehouse;
  product: Product;
  variant: ProductVariant;
  onhandQty: number;
  threshold: { min: number; max: number };
  type: "MIN" | "MAX";
}

export interface AuditLog {
  id: number;
  actor: User;
  action: string;
  entityType: string;
  entityId: number;
  before?: object;
  after?: object;
  createdAt: string;
}

export interface StockCardEntry {
  date: string;
  transactionCode: string;
  transactionType: TransactionType;
  note: string;
  importQty: number;
  exportQty: number;
  balance: number;
}
