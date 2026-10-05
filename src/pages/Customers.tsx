import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, User, Phone, MapPin, Receipt, Calendar } from 'lucide-react';
import type { Customer, Invoice } from '../types';

export default function Customers() {
  const { customers, invoices } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    
    // Check basic details
    if (c.name.toLowerCase().includes(searchLower) || c.phone.includes(searchLower)) {
      return true;
    }
    
    // Check if they have an invoice matching the search date (e.g. "10/04/2026")
    const custInvoices = invoices.filter(inv => inv.customerId === c.id);
    return custInvoices.some(inv => {
      const dateStr = new Date(inv.date).toLocaleDateString('en-IN');
      return dateStr.includes(searchLower);
    });
  });

  // Get invoices for the selected customer
  const customerInvoices = selectedCustomer 
    ? invoices.filter(inv => inv.customerId === selectedCustomer.id).sort((a, b) => b.date - a.date)
    : [];

  return (
    <div className="space-y-6 flex h-[calc(100vh-8rem)]">
      {/* Left panel: Customer List */}
      <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Customers</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search Name, Phone, or Date (DD/MM/YYYY)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No customers found.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredCustomers.map(customer => (
                <li 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedCustomer?.id === customer.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="font-semibold text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-600 flex items-center mt-1">
                    <Phone size={14} className="mr-1" /> {customer.phone}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right panel: Customer Details & Purchase History */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden ml-6">
        {selectedCustomer ? (
          <>
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <User className="mr-2 text-blue-500" /> {selectedCustomer.name}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center"><Phone size={16} className="mr-2 text-gray-400" /> {selectedCustomer.phone}</div>
                  <div className="flex items-center"><Receipt size={16} className="mr-2 text-gray-400" /> Total Purchases: {selectedCustomer.totalPurchases || customerInvoices.length}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Lifetime Spent</div>
                <div className="text-2xl font-black text-green-600">₹{selectedCustomer.paidAmount.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Purchase History</h3>
              {customerInvoices.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No purchases found for this customer.</div>
              ) : (
                <div className="space-y-4">
                  {customerInvoices.map((inv) => (
                    <div key={inv.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{inv.id}</span>
                          <span className="text-xs text-gray-500 flex items-center mt-1">
                            <Calendar size={12} className="mr-1" />
                            {new Date(inv.date).toLocaleDateString('en-IN')} at {new Date(inv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          ₹{inv.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <ul className="space-y-1">
                          {inv.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between text-sm text-gray-700">
                              <span>{item.quantity}x {item.name}</span>
                              <span>₹{item.total.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <User size={64} className="mb-4 opacity-20" />
            <p className="text-lg">Select a customer to view their details and history</p>
          </div>
        )}
      </div>
    </div>
  );
}
