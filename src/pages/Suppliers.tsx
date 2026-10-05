import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Building2, Phone, MapPin, Receipt, Plus, Mail } from 'lucide-react';
import type { Supplier } from '../types';

export default function Suppliers() {
  const { suppliers, addSupplier } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Add Supplier Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: ''
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.companyName || !newSupplier.phone) {
      alert("Name, Company, and Phone are required.");
      return;
    }
    await addSupplier(newSupplier);
    setNewSupplier({ name: '', companyName: '', phone: '', email: '', address: '' });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 flex h-[calc(100vh-8rem)]">
      {/* Left panel: Supplier List */}
      <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Suppliers</h2>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search Company, Name, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No suppliers found. Click + to add one.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredSuppliers.map(supplier => (
                <li 
                  key={supplier.id} 
                  onClick={() => setSelectedSupplier(supplier)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSupplier?.id === supplier.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="font-bold text-gray-900">{supplier.companyName}</div>
                  <div className="text-sm text-gray-700">{supplier.name}</div>
                  <div className="text-xs text-gray-500 flex items-center mt-1">
                    <Phone size={12} className="mr-1" /> {supplier.phone}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right panel: Supplier Details */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden ml-6">
        {selectedSupplier ? (
          <>
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Building2 className="mr-2 text-indigo-500" /> {selectedSupplier.companyName}
                </h2>
                <div className="text-lg text-gray-700 mt-1">{selectedSupplier.name} (Contact Person)</div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center"><Phone size={16} className="mr-2 text-gray-400" /> {selectedSupplier.phone}</div>
                  {selectedSupplier.email && (
                    <div className="flex items-center"><Mail size={16} className="mr-2 text-gray-400" /> {selectedSupplier.email}</div>
                  )}
                  {selectedSupplier.address && (
                    <div className="flex items-center col-span-2"><MapPin size={16} className="mr-2 text-gray-400 flex-shrink-0" /> {selectedSupplier.address}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Outstanding Balance</div>
                <div className={`text-2xl font-black ${selectedSupplier.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{selectedSupplier.balanceAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center text-gray-400 flex-col">
              <Receipt size={48} className="mb-4 opacity-20" />
              <p>Purchase history logic will be implemented here soon.</p>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Building2 size={64} className="mb-4 opacity-20" />
            <p className="text-lg">Select a supplier to view details</p>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsAddModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 border-b pb-2">
                  Add New Supplier
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input 
                      type="text" 
                      value={newSupplier.companyName}
                      onChange={(e) => setNewSupplier({...newSupplier, companyName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name *</label>
                    <input 
                      type="text" 
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input 
                      type="text" 
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Optional)</label>
                    <input 
                      type="email" 
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address (Optional)</label>
                    <textarea 
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddSupplier}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Supplier
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
