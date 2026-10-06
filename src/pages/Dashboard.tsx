import React from 'react';
import { IndianRupee, Package, AlertTriangle, ReceiptText, Clock, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { products, customers, invoices } = useData();

  const lowStockProducts = products.filter(p => p.stockQuantity <= p.minStock);

  // Calculate Today's Sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysInvoices = invoices.filter(inv => inv.date >= today.getTime());
  const todaysSales = todaysInvoices.reduce((sum, inv) => sum + inv.total, 0);
  
  // Get recent sales (last 5)
  const recentSales = [...invoices].sort((a, b) => b.date - a.date).slice(0, 5);

  const pendingPayments = invoices.reduce((sum, inv) => sum + (inv.dueAmount || 0), 0);
  
  const pendingBalanceInvoices = invoices.filter(inv => inv.dueAmount > 0 && inv.balanceDueDate);
  pendingBalanceInvoices.sort((a, b) => (a.balanceDueDate || 0) - (b.balanceDueDate || 0));

  const stats = [
    { label: "Today's Sales", value: `₹${todaysSales.toFixed(2)}`, icon: <IndianRupee size={24} className="text-emerald-600" />, bg: 'bg-emerald-50' },
    { label: 'Total Products', value: products.length.toString(), icon: <Package size={24} className="text-blue-600" />, bg: 'bg-blue-50' },
    { label: 'Low Stock', value: lowStockProducts.length.toString(), icon: <AlertTriangle size={24} className="text-amber-600" />, bg: 'bg-amber-50' },
    { label: "Today's Bills", value: invoices.length.toString(), icon: <ReceiptText size={24} className="text-indigo-600" />, bg: 'bg-indigo-50' },
    { label: 'Pending Payments', value: `₹${pendingPayments.toFixed(2)}`, icon: <Clock size={24} className="text-rose-600" />, bg: 'bg-rose-50' },
    { label: 'Customers', value: customers.length.toString(), icon: <Users size={24} className="text-violet-600" />, bg: 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your store's performance.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${stat.bg}`}>
                  {stat.icon}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.label}</dt>
                    <dd>
                      <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg border border-gray-100 p-5">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Sales</h2>
          {recentSales.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              No recent sales found. Complete an invoice in the Billing tab!
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map(invoice => (
                <div key={invoice.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{invoice.id}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(invoice.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {invoice.items.length} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">₹{invoice.total.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg border border-gray-100 p-5">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Low Stock Products</h2>
          {lowStockProducts.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              All products have sufficient stock.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-600">{product.stockQuantity} left</div>
                    <div className="text-xs text-gray-500">Min: {product.minStock}</div>
                  </div>
                </div>
              ))}
              {lowStockProducts.length > 5 && (
                <Link to="/products" className="block text-center text-sm text-blue-600 hover:underline pt-2">
                  View all low stock products
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white shadow rounded-lg border border-gray-100 p-5">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Clock size={20} className="mr-2 text-rose-600" />
            Pending Balance Alerts
          </h2>
          {pendingBalanceInvoices.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No pending balance alerts.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingBalanceInvoices.map(invoice => {
                const isOverdue = new Date().getTime() > (invoice.balanceDueDate || 0);
                return (
                  <div key={invoice.id} className={`p-4 border rounded-md ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">{invoice.customerName}</div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${isOverdue ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                        {isOverdue ? 'Overdue' : 'Upcoming'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">Invoice: <Link to="/sales" className="text-blue-600 hover:underline">{invoice.id}</Link></div>
                    <div className="text-sm font-medium text-gray-900 mb-2">Due Amount: ₹{invoice.dueAmount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <Clock size={12} className="mr-1" />
                      Promised Date: {new Date(invoice.balanceDueDate!).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
