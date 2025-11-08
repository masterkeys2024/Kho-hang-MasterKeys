import React, { useState, useContext, createContext, useMemo, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { User, Role, AuthContextType } from './types';
import * as Icons from './components/Icons';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import ProductGroups from './components/ProductGroups';
import Suppliers from './components/Suppliers';
import Employees from './components/Employees';
import Warehouses from './components/Warehouses';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Alerts from './components/Alerts';
import Settings from './components/Settings';
import Login from './components/Login';
import { supabase } from './lib/supabase';
import WarehouseHub from './components/WarehouseHub';
import StockImport from './components/StockImport';
import StockExport from './components/StockExport';
import StockTransfer from './components/StockTransfer';
import Stocktake from './components/Stocktake';
import UserProfile from './components/UserProfile';

// --- AUTH CONTEXT ---
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // Map role từ profiles.role (text) sang enum Role trong app
  const mapRole = (roleText?: string): Role => {
    switch ((roleText || '').toLowerCase()) {
      case 'admin': return Role.QUAN_LY;
      case 'ke_toan': return Role.KE_TOAN;
      case 'ban_hang': return Role.NHAN_VIEN_BAN_HANG;
      case 'viewer': return Role.VIEWER;
      default: return Role.THU_KHO; // staff mặc định
    }
  };

  // Lấy session hiện tại + lắng nghe thay đổi đăng nhập
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const sUser = data.session?.user;
      if (!sUser) {
        setUser(null);
        localStorage.removeItem('user');
        return;
      }
      // lấy profile sau khi đã có session
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', sUser.id)
        .maybeSingle();

      const appUser: User = {
        name: prof?.full_name || (sUser.email?.split('@')[0] ?? 'User'),
        role: mapRole(prof?.role),
      };
      setUser(appUser);
      localStorage.setItem('user', JSON.stringify(appUser));
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sUser = session?.user ?? null;
      if (!sUser) {
        setUser(null);
        localStorage.removeItem('user');
        return;
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', sUser.id)
        .maybeSingle();

      const appUser: User = {
        name: prof?.full_name || (sUser.email?.split('@')[0] ?? 'User'),
        role: mapRole(prof?.role),
      };
      setUser(appUser);
      localStorage.setItem('user', JSON.stringify(appUser));
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // ĐĂNG NHẬP CHUẨN VỚI SUPABASE
  const login = async (email: string, pass: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw new Error(error.message);

    const sUser = data.user;
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', sUser.id)
      .maybeSingle();

    const appUser: User = {
      name: prof?.full_name || (sUser.email?.split('@')[0] ?? 'User'),
      role: mapRole(prof?.role),
    };
    setUser(appUser);
    localStorage.setItem('user', JSON.stringify(appUser));
    return appUser;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasPermission = useCallback((requiredRoles: Role[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }, [user]);

  const value = useMemo(() => ({ user, login, logout, hasPermission }), [user, hasPermission]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};



// --- LAYOUT COMPONENTS ---
const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (isOpen: boolean) => void }> = ({ isOpen, setIsOpen }) => {
    const { hasPermission } = useAuth();
    const location = useLocation();
    const [isWarehouseMenuOpen, setIsWarehouseMenuOpen] = useState(location.pathname.startsWith('/warehouses') || location.pathname.startsWith('/reports'));

    const navItems = [
        { to: "/", icon: <Icons.DashboardIcon />, label: "Bảng điều khiển", roles: Object.values(Role) },
        { 
            label: "Kho hàng", 
            icon: <Icons.WarehouseIcon />, 
            roles: [Role.QUAN_LY, Role.THU_KHO],
            path: '/warehouses',
            children: [
                { to: "/warehouses", label: "Tổng quan", roles: [Role.QUAN_LY, Role.THU_KHO] },
                { to: "/warehouses/import", label: "Nhập kho", roles: [Role.QUAN_LY, Role.THU_KHO] },
                { to: "/warehouses/export", label: "Xuất kho", roles: [Role.QUAN_LY, Role.THU_KHO] },
                { to: "/warehouses/transfer", label: "Chuyển kho", roles: [Role.QUAN_LY, Role.THU_KHO] },
                { to: "/warehouses/stocktake", label: "Kiểm kho", roles: [Role.QUAN_LY, Role.THU_KHO] },
                { to: "/warehouses/list", label: "Danh sách kho", roles: [Role.QUAN_LY] },
                { to: "/reports?tab=stockOnHand", label: "Tổng tồn kho", roles: [Role.QUAN_LY, Role.KE_TOAN, Role.VIEWER] },
                { to: "/reports?tab=stockCard", label: "Thẻ kho", roles: [Role.QUAN_LY, Role.KE_TOAN, Role.VIEWER] },
            ] 
        },
        { to: "/products", icon: <Icons.PackageIcon />, label: "Sản phẩm", roles: Object.values(Role) },
        { to: "/product-groups", icon: <Icons.GroupIcon />, label: "Nhóm sản phẩm", roles: [Role.QUAN_LY] },
        { to: "/suppliers", icon: <Icons.TruckIcon />, label: "Nhà cung cấp", roles: [Role.QUAN_LY] },
        { to: "/employees", icon: <Icons.UsersIcon />, label: "Nhân viên", roles: [Role.QUAN_LY] },
        { to: "/transactions", icon: <Icons.TransactionIcon />, label: "Giao dịch", roles: [Role.QUAN_LY, Role.THU_KHO, Role.KE_TOAN, Role.NHAN_VIEN_BAN_HANG] },
        { to: "/alerts", icon: <Icons.AlertIcon />, label: "Cảnh báo", roles: [Role.QUAN_LY, Role.THU_KHO] },
        { to: "/settings", icon: <Icons.SettingsIcon />, label: "Cài đặt", roles: [Role.QUAN_LY] },
    ];
    
    useEffect(() => {
        setIsWarehouseMenuOpen(location.pathname.startsWith('/warehouses') || location.pathname.startsWith('/reports'));
    }, [location.pathname]);
    
    useEffect(() => {
        // Close sidebar on navigation on mobile
        setIsOpen(false);
    }, [location.pathname, setIsOpen]);

    return (
         <aside className={`fixed inset-y-0 left-0 bg-gray-800 text-white flex-col z-30 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex`}>
            <div className="h-16 flex items-center justify-between px-4">
                <Link to="/" className="flex items-center text-2xl font-bold text-primary-400">
                    <Icons.BoxIcon className="w-8 h-8 mr-2"/>
                    <span>Kho Hàng</span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-gray-300 hover:text-white">
                    <Icons.XIcon className="w-6 h-6" />
                </button>
            </div>
            <nav className="flex-1 px-4 py-4">
                <ul>
                    {navItems.filter(item => hasPermission(item.roles)).map(item => {
                        if ('children' in item && item.children) {
                            const isParentActive = location.pathname.startsWith(item.path!) || location.pathname.startsWith('/reports');
                            return (
                                <li key={item.label}>
                                    <button
                                        onClick={() => setIsWarehouseMenuOpen(prev => !prev)}
                                        className={`flex items-center justify-between w-full px-4 py-3 my-1 rounded-md text-sm font-medium transition-colors text-left ${
                                            isParentActive
                                                ? 'bg-primary-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <span className="mr-3">{item.icon}</span>
                                            {item.label}
                                        </div>
                                        {isWarehouseMenuOpen ? <Icons.ChevronUpIcon className="w-5 h-5" /> : <Icons.ChevronDownIcon className="w-5 h-5" />}
                                    </button>
                                    {isWarehouseMenuOpen && (
                                        <ul className="mt-1 space-y-1">
                                            {item.children.filter(child => hasPermission(child.roles)).map(child => (
                                                <li key={child.to}>
                                                    <NavLink
                                                        to={child.to}
                                                        end={child.to === '/warehouses'}
                                                        className={({ isActive }) =>
                                                            `flex items-center w-full pl-11 pr-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                            isActive
                                                                ? 'bg-gray-700 text-white'
                                                                : 'text-gray-400 hover:bg-gray-600 hover:text-white'
                                                            }`
                                                        }
                                                    >
                                                        {child.label}
                                                    </NavLink>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        }
                        
                        // Type assertion to access 'to' property
                        // FIX: Changed JSX.Element to React.ReactNode to fix "Cannot find namespace 'JSX'" error.
                        const navItem = item as { to: string, icon: React.ReactNode, label: string };
                        return (
                            <li key={navItem.to}>
                                <NavLink
                                    to={navItem.to}
                                    className={({ isActive }) =>
                                        `flex items-center px-4 py-3 my-1 rounded-md text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-primary-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }`
                                    }
                                >
                                    <span className="mr-3">{item.icon}</span>
                                    {item.label}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
};

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [title, setTitle] = useState("Bảng điều khiển");
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = React.useRef<HTMLDivElement>(null);

    // Effect to close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileMenuRef]);
    
    // Effect to close dropdown on navigation
    useEffect(() => {
        setIsProfileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const pathMap: { [key: string]: string } = {
            '/': 'Bảng điều khiển',
            '/profile': 'Thông tin tài khoản',
            '/products': 'Quản lý Sản phẩm',
            '/product-groups': 'Quản lý Nhóm sản phẩm',
            '/suppliers': 'Quản lý Nhà cung cấp',
            '/employees': 'Quản lý Nhân viên',
            '/warehouses': 'Trung tâm Quản lý Kho',
            '/warehouses/import': 'Nhập kho',
            '/warehouses/export': 'Xuất kho',
            '/warehouses/list': 'Danh sách Kho hàng',
            '/warehouses/transfer': 'Chuyển kho',
            '/warehouses/stocktake': 'Kiểm kho',
            '/transactions': 'Quản lý Giao dịch',
            '/reports': 'Báo cáo & Thống kê',
            '/alerts': 'Cảnh báo Tồn kho',
            '/settings': 'Cài đặt Hệ thống'
        };
        setTitle(pathMap[location.pathname] || "Báo cáo & Thống kê");
    }, [location.pathname]);

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center">
                <button onClick={onMenuClick} className="md:hidden mr-4 text-gray-600 hover:text-gray-800">
                    <Icons.MenuIcon className="w-6 h-6"/>
                </button>
                <h1 className="text-lg md:text-xl font-semibold text-gray-800 truncate">{title}</h1>
            </div>
            <div className="flex items-center">
                <div ref={profileMenuRef} className="relative">
                    <button onClick={() => setIsProfileMenuOpen(prev => !prev)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
                         <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <Icons.UserIcon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="hidden md:block text-left">
                            <div className="text-sm font-medium text-gray-800">{user?.name}</div>
                            <div className="text-xs text-gray-500">{user?.role}</div>
                        </div>
                        <Icons.ChevronDownIcon className="w-4 h-4 text-gray-500 hidden md:block" />
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                            <Link to="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                                <Icons.UserIcon className="w-4 h-4 mr-2" />
                                Thông tin tài khoản
                            </Link>
                            <button
                                onClick={logout}
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                                <Icons.LogoutIcon className="w-4 h-4 mr-2" />
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

// --- PROTECTED ROUTE ---
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles: Role[] }> = ({ children, roles }) => {
    const { user, hasPermission } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (!hasPermission(roles)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <h1 className="text-2xl md:text-4xl font-bold text-red-500">Truy cập bị từ chối</h1>
                <p className="mt-4 text-gray-600">Bạn không có quyền truy cập trang này.</p>
                <Link to="/" className="mt-6 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                    Về Bảng điều khiển
                </Link>
            </div>
        )
    }
    return <>{children}</>;
};


// --- MAIN APP ---
export default function App() {
    return (
        <AuthProvider>
            <HashRouter>
                <MainApp />
            </HashRouter>
        </AuthProvider>
    );
}

const MainApp: React.FC = () => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    const warehouseRoles = [Role.QUAN_LY, Role.THU_KHO];
    const adminOnly = [Role.QUAN_LY];

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
             {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
                    <Routes>
                        <Route path="/" element={<ProtectedRoute roles={Object.values(Role)}><Dashboard /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute roles={Object.values(Role)}><UserProfile /></ProtectedRoute>} />
                        <Route path="/products" element={<ProtectedRoute roles={Object.values(Role)}><Products /></ProtectedRoute>} />
                        <Route path="/product-groups" element={<ProtectedRoute roles={adminOnly}><ProductGroups /></ProtectedRoute>} />
                        <Route path="/suppliers" element={<ProtectedRoute roles={adminOnly}><Suppliers /></ProtectedRoute>} />
                        <Route path="/employees" element={<ProtectedRoute roles={adminOnly}><Employees /></ProtectedRoute>} />
                        
                        {/* Warehouse Routes */}
                        <Route path="/warehouses" element={<ProtectedRoute roles={warehouseRoles}><WarehouseHub /></ProtectedRoute>} />
                        <Route path="/warehouses/import" element={<ProtectedRoute roles={warehouseRoles}><StockImport /></ProtectedRoute>} />
                        <Route path="/warehouses/export" element={<ProtectedRoute roles={warehouseRoles}><StockExport /></ProtectedRoute>} />
                        <Route path="/warehouses/list" element={<ProtectedRoute roles={adminOnly}><Warehouses /></ProtectedRoute>} />
                        <Route path="/warehouses/transfer" element={<ProtectedRoute roles={warehouseRoles}><StockTransfer /></ProtectedRoute>} />
                        <Route path="/warehouses/stocktake" element={<ProtectedRoute roles={warehouseRoles}><Stocktake /></ProtectedRoute>} />

                        <Route path="/transactions" element={<ProtectedRoute roles={[Role.QUAN_LY, Role.THU_KHO, Role.KE_TOAN, Role.NHAN_VIEN_BAN_HANG]}><Transactions /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute roles={[Role.QUAN_LY, Role.KE_TOAN, Role.VIEWER]}><Reports /></ProtectedRoute>} />
                        <Route path="/alerts" element={<ProtectedRoute roles={[Role.QUAN_LY, Role.THU_KHO]}><Alerts /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute roles={adminOnly}><Settings /></ProtectedRoute>} />
                        <Route path="/login" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};
