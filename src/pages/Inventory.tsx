import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { PackageSearch, AlertTriangle, ArrowUpCircle, IndianRupee, Save } from 'lucide-react';
import type { Product } from '../types';

export default function Inventory() {
  const { products, updateProduct } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quick Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number | string>('');

  // Statistics
  const totalItemsInStock = products.reduce((sum, p) => sum + (p.stockQuantity > 0 ? p.stockQuantity : 0), 0);
  const totalWarehouseValueLP = products.reduce((sum, p) => sum + ((p.stockQuantity > 0 ? p.stockQuantity : 0) * p.productPrice), 0);
  const totalWarehouseValueTP = products.reduce((sum, p) => sum + ((p.stockQuantity > 0 ? p.stockQuantity : 0) * p.finalSellingPrice), 0);
  const lowStockThreshold = 5;
  const lowStockItems = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= lowStockThreshold);
  const outOfStockItems = products.filter(p => p.stockQuantity <= 0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setTempStock(product.stockQuantity);
  };

  const handleSaveStock = async (productId: string) => {
    const stockToSave = tempStock === '' ? 0 : Number(tempStock);
    if (stockToSave < 0) {
      alert("Stock cannot be negative.");
      return;
    }
    await updateProduct(productId, { stockQuantity: stockToSave });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Audit & Alerts</h1>
        <p className="text-sm text-gray-500">Track total warehouse value, low stock warnings, and quickly adjust counts.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center text-gray-500 mb-2">
            <PackageSearch size={18} className="mr-2" />
            <h3 className="font-semibold text-sm">Total Products</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{products.length} <span className="text-sm font-medium text-gray-500">types</span></p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center text-gray-500 mb-2">
            <PackageSearch size={18} className="mr-2" />
            <h3 className="font-semibold text-sm">Total Items in Stock</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalItemsInStock} <span className="text-sm font-medium text-gray-500">units</span></p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center text-gray-500 mb-2">
            <IndianRupee size={18} className="mr-2 text-blue-500" />
            <h3 className="font-semibold text-sm">Warehouse Value (LP)</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">₹{totalWarehouseValueLP.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-1">Total invested capital</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center text-gray-500 mb-2">
            <ArrowUpCircle size={18} className="mr-2 text-green-500" />
            <h3 className="font-semibold text-sm">Potential Value (TP)</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">₹{totalWarehouseValueTP.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-1">If all stock sold at TP</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center text-gray-500 mb-2">
            <AlertTriangle size={18} className="mr-2 text-orange-500" />
            <h3 className="font-semibold text-sm">Action Needed</h3>
          </div>
          <p className="text-lg font-bold text-gray-900">
            <span className="text-orange-500">{lowStockItems.length}</span> low stock
          </p>
          <p className="text-lg font-bold text-gray-900">
            <span className="text-red-500">{outOfStockItems.length}</span> out of stock
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Quick Stock Adjustment</h2>
          <input
            type="text"
            placeholder="Search products to update stock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name & SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Count</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.stockQuantity <= 0 ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Out of Stock
                      </span>
                    ) : product.stockQuantity <= lowStockThreshold ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        value={tempStock}
                        onChange={(e) => setTempStock(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-24 border-2 border-blue-500 rounded px-2 py-1 text-sm font-bold"
                        autoFocus
                      />
                    ) : (
                      <div className="text-lg font-bold text-gray-900">{product.stockQuantity}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === product.id ? (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSaveStock(product.id)}
                          className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center"
                        >
                          <Save size={14} className="mr-1" /> Save
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEditClick(product)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded font-semibold"
                      >
                        Update Count
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
