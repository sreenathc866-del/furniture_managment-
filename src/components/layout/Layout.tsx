import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Calculator,
  Users,
  Truck,
  ShoppingCart,
  ReceiptText,
  FileText,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/products', icon: <Package size={20} />, label: 'Products' },
    { to: '/inventory', icon: <Boxes size={20} />, label: 'Inventory' },
    { to: '/billing', icon: <Calculator size={20} />, label: 'Billing / POS' },
    { to: '/customers', icon: <Users size={20} />, label: 'Customers' },
    { to: '/suppliers', icon: <Truck size={20} />, label: 'Suppliers' },
    { to: '/purchases', icon: <ShoppingCart size={20} />, label: 'Purchases' },
    { to: '/sales', icon: <ReceiptText size={20} />, label: 'Sales' },
    { to: '/deliveries', icon: <Truck size={20} />, label: 'Deliveries' },
    { to: '/reports', icon: <FileText size={20} />, label: 'Reports' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const currentNav = navItems.find(item => item.to === location.pathname);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Kairali Furniture</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 flex flex-col md:hidden transform transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800">Kairali Furniture</h1>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="mr-3 text-current">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden flex-shrink-0 z-30 shadow-xs">
          <div className="flex items-center space-x-3 truncate">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 focus:outline-none"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="truncate">
              <span className="text-base font-bold text-gray-900 block truncate leading-tight">
                {currentNav ? currentNav.label : 'Kairali Furniture'}
              </span>
              <span className="text-[11px] text-gray-400 block truncate">Kairali Furniture</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 rounded-lg"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-3.5 sm:p-5 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar for quick access to most used screens */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex items-center justify-around py-1.5 px-2 safe-bottom shadow-lg">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 rounded text-xs font-medium ${
                isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-800'
              }`
            }
          >
            <LayoutDashboard size={19} />
            <span className="text-[10px] mt-0.5">Home</span>
          </NavLink>
          <NavLink
            to="/billing"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 rounded text-xs font-medium ${
                isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-800'
              }`
            }
          >
            <Calculator size={19} />
            <span className="text-[10px] mt-0.5">Billing</span>
          </NavLink>
          <NavLink
            to="/sales"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 rounded text-xs font-medium ${
                isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-800'
              }`
            }
          >
            <ReceiptText size={19} />
            <span className="text-[10px] mt-0.5">Sales</span>
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2 rounded text-xs font-medium ${
                isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-800'
              }`
            }
          >
            <Package size={19} />
            <span className="text-[10px] mt-0.5">Products</span>
          </NavLink>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center py-1 px-2 rounded text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            <Menu size={19} />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
