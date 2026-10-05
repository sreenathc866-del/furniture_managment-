import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, FileText, ArrowLeftRight, User, Phone, Calendar, AlertTriangle } from 'lucide-react';
import type { Invoice } from '../types';

export default function Sales() {
  const { invoices, updateInvoice } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<'Paid' | 'Partial' | 'Due' | 'Returned' | 'Exchanged'>('Paid');
  const [editReason, setEditReason] = useState('');

  // Advanced search: search by Invoice ID, Customer Name, or Customer ID (which is often a phone number if we set it up that way, or we can look up the customer record, but invoices store customerName and customerId)
  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    const dateStr = new Date(inv.date).toLocaleDateString('en-IN').toLowerCase();
    return (
      inv.id.toLowerCase().includes(term) ||
      inv.customerName.toLowerCase().includes(term) ||
      inv.customerId.toLowerCase().includes(term) ||
      dateStr.includes(term)
    );
  }).sort((a, b) => b.date - a.date); // Newest first

  const handleReturnExchange = (invoice: Invoice) => {
    // Format date for datetime-local input
    const d = new Date(invoice.date);
    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    setEditDate(dateStr);
    setEditStatus(invoice.status || 'Paid');
    setEditReason(invoice.returnReason || '');
    setIsEditModalOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedInvoice) return;
    try {
      await updateInvoice(selectedInvoice.id, {
        date: new Date(editDate).getTime(),
        status: editStatus,
        returnReason: editReason
      });
      setIsEditModalOpen(false);
      
      // Update selected invoice in view
      setSelectedInvoice({
        ...selectedInvoice,
        date: new Date(editDate).getTime(),
        status: editStatus,
        returnReason: editReason
      });
      alert('Invoice updated successfully!');
    } catch (error) {
      alert('Failed to update invoice.');
    }
  };

  return (
    <div className="space-y-6 flex h-[calc(100vh-8rem)]">
      {/* Left panel: Invoice List */}
      <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Sales History</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search Bill #, Name, Phone, Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No sales found matching your search.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredInvoices.map(invoice => (
                <li 
                  key={invoice.id} 
                  onClick={() => setSelectedInvoice(invoice)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedInvoice?.id === invoice.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-900">{invoice.id}</span>
                    <span className="text-sm font-bold text-green-600">₹{invoice.total.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <User size={14} className="mr-1" /> {invoice.customerName}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center">
                    <Calendar size={12} className="mr-1" /> 
                    {new Date(invoice.date).toLocaleDateString('en-IN')} at {new Date(invoice.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right panel: Invoice Details */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden ml-6">
        {selectedInvoice ? (
          <>
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invoice {selectedInvoice.id}</h2>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div className="flex items-center"><User size={16} className="mr-2 text-gray-400" /> {selectedInvoice.customerName}</div>
                  <div className="flex items-center"><Phone size={16} className="mr-2 text-gray-400" /> {selectedInvoice.customerId}</div>
                  <div className="flex items-center"><Calendar size={16} className="mr-2 text-gray-400" /> Date: {new Date(selectedInvoice.date).toLocaleString('en-IN')}</div>
                  {selectedInvoice.deliveryDate && (
                    <div className="flex items-center text-indigo-600 font-medium">
                      <Calendar size={16} className="mr-2 text-indigo-400" /> Delivery Scheduled: {new Date(selectedInvoice.deliveryDate).toLocaleDateString('en-IN')}
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                      selectedInvoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      selectedInvoice.status === 'Returned' ? 'bg-red-100 text-red-800' :
                      selectedInvoice.status === 'Exchanged' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                  {selectedInvoice.returnReason && (
                    <div className="flex items-start text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">
                      <AlertTriangle size={16} className="mr-2 mt-0.5" /> 
                      <span className="italic">Note: {selectedInvoice.returnReason}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => handleReturnExchange(selectedInvoice)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none"
                >
                  <ArrowLeftRight size={16} className="mr-2" />
                  Return / Exchange
                </button>
                <button 
                  onClick={() => window.print()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none justify-center"
                >
                  <FileText size={16} className="mr-2" />
                  Print Receipt
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Items Purchased</h3>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-gray-500 text-xs">SKU: {item.sku}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.quantity}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{item.actualSellingPrice.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Discount</span>
                    <span>- ₹{selectedInvoice.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span>
                    <span>+ ₹{selectedInvoice.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-3">
                    <span>Grand Total</span>
                    <span>₹{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <FileText size={64} className="mb-4 opacity-20" />
            <p className="text-lg">Select an invoice to view details</p>
          </div>
        )}
      </div>

      {/* Edit / Return Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsEditModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 border-b pb-2">
                  Edit Invoice / Log Return
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select 
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Due">Due</option>
                      <option value="Returned">Returned</option>
                      <option value="Exchanged">Exchanged</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes (Damaged, Exchanged, etc.)</label>
                    <textarea 
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={3}
                      placeholder="e.g. Product was damaged, exchanged for a new one."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
