import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ProductCard } from '../components/products/ProductCard';
import { Plus, Search } from 'lucide-react';
import type { Product } from '../types';

import { AddProductModal } from '../components/products/AddProductModal';

export default function Products() {
  const { products, deleteProduct, addProduct, updateProduct } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Manage your store's inventory and pricing.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(undefined);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none w-full sm:w-auto"
        >
          <Plus size={18} className="mr-1.5" />
          Add Product
        </button>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-xs border border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search products by name, SKU, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onEdit={handleEdit} 
            onDelete={() => handleDelete(product.id)} 
          />
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No products found matching your search.
          </div>
        )}
      </div>

      <AddProductModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(undefined);
        }}
        onSave={async (p) => {
          if (editingProduct) {
            await updateProduct(editingProduct.id, p);
          } else {
            await addProduct(p);
          }
        }}
        editingProduct={editingProduct}
      />
    </div>
  );
}
