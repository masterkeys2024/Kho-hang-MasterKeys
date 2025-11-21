import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  NavLink,
} from 'react-router-dom';

import { supabase } from './lib/supabase';
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

import { Role, User } from './types';

// ========== AUTH CONTEXT ==========

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  hasPermission: (roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const mapRole = (roleText?: string | null): Role => {
  switch ((roleText || '').toLowerCase()) {
    case 'admin':
      return Role.QUAN_LY;
    case 'ke_toan':
      return Role.KE_TOAN;
    case 'ban_hang':
      return Role.NHAN_VIEN_BAN_HANG;
    case 'viewer':
      return Role.VIEWER;
    default:
      return Role.THU_KHO;
  }
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  // Lấy session hiện tại + lắng nghe thay đổi login/logout
  useEffect(() => {
    // Lần đầu lấy session
    supabase.auth.getSession().then(async ({ data }) => {
      const sUser = data.session?.user;
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
        id: sUser.id,
        email: sUser.email ?? '',
        name: prof?.full_name || (sUser.email?.split('@')[0] ?? 'User'),
        role: mapRole(prof?.role),
      };

      setUser(appUser);
      localStorage.setItem('user', JSON.stringify(appUser));
    });

    // Lắng nghe onAuthStateChange
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sUser = session?.user;
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
          id: sUser.id,
          email: sUser.email ?? '',
          name: prof?.full_name || (sUser.email?.split('@')[0] ?? 'User'),
          role: mapRole(prof?.role),
        };

        setUser(appUser);
        localStorage.setItem('user', JSON.stringify(appUser));
      }
    );

    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);

    const sUser = data.user;
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', sUser.id)
      .maybeSingle();

    const appUser: User = {
      id: sUser.id,
      email: sUser.email ?? '',
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
    // Không đổi hash/url ở đây – MainApp sẽ tự hiển thị Login khi user = null
  };

  const hasPermission = useCallback(
    (roles: Role[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      login,
      logout,
      hasPermission,
    }),
    [user, login, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ========== PROTECTED ROUTE ==========

type ProtectedRouteProps = {
  element: JSX.Element;
  roles?: Role[];
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, roles }) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !hasPermission(roles)) {
    return <Navigate to="/" replace />;
  }

  return element;
};

// ========== MAIN LAYOUT ==========

const MainApp: React.FC = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Chưa đăng nhập → chỉ hiển thị Login
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2">
          <button
            className="md:hidden mr-2 px-2 py-1 border rounded"
            onClick={() => setIsSidebarOpen((v) => !v)}
          >
            ☰
          </button>
          <span className="font-bold text-lg text-yellow-600">
            Hệ thống Quản lý Kho Hàng
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <div className="font-medium">{user.name}</div>
            <div className="text-gray-500 text-xs">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r w-60 p-3 flex-shrink-0
            ${isSidebarOpen ? 'block' : 'hidden'} md:block`}
        >
          <nav className="space-y-1 text-sm">
            <SidebarLink to="/" label="Tổng quan" />
            <SidebarLink to="/products" label="Sản phẩm" />
            <SidebarLink to="/product-groups" label="Nhóm sản phẩm" />
            <SidebarLink to="/suppliers" label="Nhà cung cấp" />
            <SidebarLink to="/employees" label="Nhân viên" />
            <SidebarLink to="/warehouses" label="Kho hàng" />
            <SidebarLink to="/transactions" label="Nhập - Xuất - Chuyển kho" />
            <SidebarLink to="/reports" label="Báo cáo" />
            <SidebarLink to="/alerts" label="Cảnh báo" />
            <SidebarLink to="/settings" label="Cài đặt" />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-3 md:p-6">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute
                  element={<Dashboard />}
                  roles={[
                    Role.QUAN_LY,
                    Role.THU_KHO,
                    Role.KE_TOAN,
                    Role.NHAN_VIEN_BAN_HANG,
                    Role.VIEWER,
                  ]}
                />
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute
                  element={<Products />}
                  roles={[
                    Role.QUAN_LY,
                    Role.THU_KHO,
                    Role.KE_TOAN,
                    Role.NHAN_VIEN_BAN_HANG,
                  ]}
                />
              }
            />
            <Route
              path="/product-groups"
              element={
                <ProtectedRoute
                  element={<ProductGroups />}
                  roles={[Role.QUAN_LY, Role.THU_KHO]}
                />
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute
                  element={<Suppliers />}
                  roles={[Role.QUAN_LY, Role.THU_KHO, Role.KE_TOAN]}
                />
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute
                  element={<Employees />}
                  roles={[Role.QUAN_LY]}
                />
              }
            />
            <Route
              path="/warehouses"
              element={
                <ProtectedRoute
                  element={<Warehouses />}
                  roles={[Role.QUAN_LY, Role.THU_KHO]}
                />
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute
                  element={<Transactions />}
                  roles={[
                    Role.QUAN_LY,
                    Role.THU_KHO,
                    Role.KE_TOAN,
                    Role.NHAN_VIEN_BAN_HANG,
                  ]}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute
                  element={<Reports />}
                  roles={[Role.QUAN_LY, Role.KE_TOAN]}
                />
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute
                  element={<Alerts />}
                  roles={[
                    Role.QUAN_LY,
                    Role.THU_KHO,
                    Role.KE_TOAN,
                    Role.NHAN_VIEN_BAN_HANG,
                  ]}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute
                  element={<Settings />}
                  roles={[Role.QUAN_LY]}
                />
              }
            />
            {/* Không cho quay lại /login khi đã đăng nhập */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

type SidebarLinkProps = {
  to: string;
  label: string;
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, label }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) =>
      [
        'flex items-center px-3 py-2 rounded-md',
        isActive
          ? 'bg-yellow-100 text-yellow-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100',
      ].join(' ')
    }
  >
    <span>{label}</span>
  </NavLink>
);

// ========== ROOT APP ==========

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <MainApp />
      </Router>
    </AuthProvider>
  );
};

export default App;
