import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/layout/Layout';

const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Products = React.lazy(() => import('./pages/Products'));
const Billing = React.lazy(() => import('./pages/Billing'));
const Sales = React.lazy(() => import('./pages/Sales'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Suppliers = React.lazy(() => import('./pages/Suppliers'));
const Deliveries = React.lazy(() => import('./pages/Deliveries'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="inventory" element={<div>Inventory Page</div>} />
                <Route path="billing" element={<Billing />} />
                <Route path="customers" element={<Customers />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="purchases" element={<div>Purchases Page</div>} />
                <Route path="sales" element={<Sales />} />
                <Route path="deliveries" element={<Deliveries />} />
                <Route path="reports" element={<div>Reports Page</div>} />
                <Route path="settings" element={<div>Settings Page</div>} />
              </Route>
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
