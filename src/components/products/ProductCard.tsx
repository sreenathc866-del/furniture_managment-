import React from 'react';
import type { Product } from '../../types';
import { Edit, Trash2 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gray-100 relative">
        {product.imageUrls && product.imageUrls.length > 0 ? (
          <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          {product.category}
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
            <p className="text-xs text-gray-500">{product.id} • SKU: {product.sku}</p>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 font-medium" title="Last Price">LP: ₹{product.productPrice}</span>
            <span className="text-xl font-bold text-gray-900" title="Telling Price">TP: ₹{product.finalSellingPrice}</span>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stockQuantity <= product.minStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              Stock: {product.stockQuantity}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2">
          <button 
            onClick={() => onEdit(product)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={() => onDelete(product.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
