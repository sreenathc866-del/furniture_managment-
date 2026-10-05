import React, { useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import type { Product } from '../../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editingProduct?: Product;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave, editingProduct }) => {
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    productPrice: 0,
    finalSellingPrice: 0,
    discount: 0,
    tax: 0,
    stockQuantity: 0,
    minStock: 5,
    dimensions: ''
  });

  React.useEffect(() => {
    if (editingProduct && isOpen) {
      setFormData({
        name: editingProduct.name,
        sku: editingProduct.sku,
        category: editingProduct.category,
        description: editingProduct.description,
        productPrice: editingProduct.productPrice,
        finalSellingPrice: editingProduct.finalSellingPrice,
        discount: editingProduct.discount,
        tax: editingProduct.tax,
        stockQuantity: editingProduct.stockQuantity,
        minStock: editingProduct.minStock,
        dimensions: editingProduct.dimensions
      });
      setImagePreviews(editingProduct.imageUrls || []);
      setImageFiles([]); // We don't have the original File objects, just URLs
    } else if (isOpen) {
      // Reset on open if not editing
      setFormData({
        name: '',
        sku: '',
        category: '',
        description: '',
        productPrice: 0,
        finalSellingPrice: 0,
        discount: 0,
        tax: 0,
        stockQuantity: 0,
        minStock: 5,
        dimensions: ''
      });
      setImagePreviews([]);
      setImageFiles([]);
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);
      
      const previews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Upload Images to Firebase Storage
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadUrl);
      }

      // 2. Save Product Data
      const finalSku = formData.sku.trim() === '' 
        ? `SKU-${Date.now().toString().slice(-6)}` 
        : formData.sku;

      // Keep existing images if we didn't upload new ones (or we appended to them)
      // Since we just uploaded new ones, we combine them. If removing images, we need more complex logic.
      // For now, if we are editing, we combine the old previews with new uploads.
      const finalImageUrls = [...imagePreviews.filter(url => url.startsWith('http')), ...imageUrls];

      await onSave({
        ...formData,
        sku: finalSku,
        imageUrls: finalImageUrls
      });
      
      onClose();
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert("Failed to save: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numberFields = ['productPrice', 'finalSellingPrice', 'discount', 'tax', 'stockQuantity', 'minStock'];
    
    setFormData(prev => ({
      ...prev,
      [name]: numberFields.includes(name) ? Number(value) : value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-4">
              <h3 className="text-xl leading-6 font-semibold text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select name="category" required value={formData.category} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="">Select Category</option>
                    <option value="Sofas">Sofas</option>
                    <option value="Beds">Beds</option>
                    <option value="Dining">Dining</option>
                    <option value="Wardrobes">Wardrobes</option>
                    <option value="Chairs">Chairs</option>
                    <option value="Tables">Tables</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dimensions (e.g. 72x36x30 in)</label>
                  <input type="text" name="dimensions" value={formData.dimensions} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="bg-gray-50 p-4 rounded-md grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3 border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Price*</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-sm">₹</span></div>
                    <input type="number" min="0" required name="productPrice" value={formData.productPrice === 0 ? '' : formData.productPrice} onChange={handleChange} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 sm:text-sm border-gray-300 rounded-md py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700"> Telling Price *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-sm">₹</span></div>
                    <input type="number" min="0" required name="finalSellingPrice" value={formData.finalSellingPrice === 0 ? '' : formData.finalSellingPrice} onChange={handleChange} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 sm:text-sm border-gray-300 rounded-md py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax (%)</label>
                  <input type="number" min="0" name="tax" value={formData.tax === 0 ? '' : formData.tax} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Stock *</label>
                  <input type="number" min="0" required name="stockQuantity" value={formData.stockQuantity === 0 ? '' : formData.stockQuantity} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Minimum Stock Alert</label>
                  <input type="number" min="0" name="minStock" value={formData.minStock === 0 ? '' : formData.minStock} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                <div className="flex flex-wrap gap-4 mb-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden border border-gray-200">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:text-blue-500 cursor-pointer text-gray-400 transition-colors">
                    <Upload size={24} />
                    <span className="text-xs mt-1">Upload</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>

              <div className="border-t pt-5 flex justify-end space-x-3">
                <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
                  {loading && <Loader size={16} className="animate-spin mr-2" />}
                  {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
