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
    if ((c.name || '').toLowerCase().includes(searchLower) || (c.phone || '').includes(searchLower)) {
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
    <div className="flex flex-col md:flex-row md:space-x-6 h-[calc(100vh-8.5rem)] md:h-[calc(100vh-8rem)]">
      {/* Left panel: Customer List */}
      <div className={`w-full md:w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden ${selectedCustomer ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3.5 sm:p-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4">Customers</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search Name, Phone, or Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No customers found.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredCustomers.map(customer => (
                <li 
                  key={customer.id} 
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-3.5 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedCustomer?.id === customer.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">{customer.name || 'Unnamed Customer'}</div>
                  <div className="text-xs sm:text-sm text-gray-600 flex items-center mt-1">
                    <Phone size={13} className="mr-1 text-gray-400" /> {customer.phone || 'No phone'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right panel: Customer Details & Purchase History */}
      <div className={`w-full md:flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden md:ml-0 ${!selectedCustomer ? 'hidden md:flex' : 'flex'}`}>
        {selectedCustomer ? (
          <>
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start gap-3">
              <div>
                <div className="flex items-center">
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="md:hidden inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 mr-2 py-1 px-2 rounded bg-blue-50"
                  >
                    ← Back
                  </button>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                    <User className="mr-2 text-blue-500" size={22} /> {selectedCustomer.name || 'Unnamed Customer'}
                  </h2>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center"><Phone size={15} className="mr-2 text-gray-400" /> {selectedCustomer.phone || 'No phone'}</div>
                  <div className="flex items-center"><Receipt size={15} className="mr-2 text-gray-400" /> Total Purchases: {selectedCustomer.totalPurchases || customerInvoices.length}</div>
                </div>
              </div>
              <div className="sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className="text-xs sm:text-sm text-gray-500 mb-0.5">Lifetime Spent</div>
                <div className="text-xl sm:text-2xl font-black text-green-600">₹{selectedCustomer.paidAmount.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 border-b pb-2">Purchase History</h3>
              {customerInvoices.length === 0 ? (
                <div className="text-gray-500 text-center py-8 text-sm">No purchases found for this customer.</div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {customerInvoices.map((inv) => (
                    <div key={inv.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white shadow-xs hover:shadow transition-shadow">
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm sm:text-base">{inv.id}</span>
                          <span className="text-[11px] sm:text-xs text-gray-500 flex items-center mt-0.5">
                            <Calendar size={12} className="mr-1" />
                            {new Date(inv.date).toLocaleDateString('en-IN')} at {new Date(inv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-base sm:text-lg font-bold text-blue-600">
                          ₹{inv.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-2.5 sm:p-3">
                        <ul className="space-y-1">
                          {inv.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between text-xs sm:text-sm text-gray-700">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-medium">₹{item.total.toFixed(2)}</span>
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
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <User size={56} className="mb-4 opacity-20" />
            <p className="text-base sm:text-lg">Select a customer to view their details and history</p>
          </div>
        )}
      </div>
    </div>
  );
}
