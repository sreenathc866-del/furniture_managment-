import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, FileText, ArrowLeftRight, User, Phone, Calendar, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import type { Invoice } from '../types';

const toLocalDateTimeInputString = (timestamp: number) => {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Sales() {
  const { invoices, customers, updateInvoice, deleteInvoice, addCustomer, updateCustomer } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'Paid' | 'Partial' | 'Due' | 'Returned' | 'Exchanged'>('Paid');
  const [editPaidAmount, setEditPaidAmount] = useState<number | ''>('');
  const [editBalanceDueDate, setEditBalanceDueDate] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryStatus, setEditDeliveryStatus] = useState<'Pending' | 'Delivered'>('Pending');
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Advanced search: search by Invoice ID, Customer Name, Customer ID, or Phone
  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    const dateStr = new Date(inv.date).toLocaleDateString('en-IN').toLowerCase();
    const custName = (inv.customerName || '').toLowerCase();
    const custId = (inv.customerId || '').toLowerCase();
    const matchedCustomer = customers.find(c => c.id === inv.customerId);
    const custPhone = (matchedCustomer?.phone || '').toLowerCase();
    return (
      (inv.id || '').toLowerCase().includes(term) ||
      custName.includes(term) ||
      custId.includes(term) ||
      custPhone.includes(term) ||
      dateStr.includes(term)
    );
  }).sort((a, b) => b.date - a.date); // Newest first

  const handleEditInvoice = (invoice: Invoice) => {
    setEditDate(toLocalDateTimeInputString(invoice.date));
    setEditCustomerName(invoice.customerName || '');
    const matchedCust = customers.find(c => c.id === invoice.customerId);
    setEditCustomerPhone(matchedCust?.phone || (invoice.customerId && !invoice.customerId.startsWith('CUS-') ? invoice.customerId : ''));
    setEditStatus(invoice.status || 'Paid');
    setEditPaidAmount(invoice.paidAmount !== undefined ? invoice.paidAmount : invoice.total);
    
    if (invoice.balanceDueDate) {
      const d = new Date(invoice.balanceDueDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      setEditBalanceDueDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    } else {
      setEditBalanceDueDate('');
    }

    if (invoice.deliveryDate) {
      const d = new Date(invoice.deliveryDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      setEditDeliveryDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setEditDeliveryStatus(invoice.deliveryStatus || 'Pending');
    } else {
      setEditDeliveryDate('');
      setEditDeliveryStatus('Pending');
    }

    setEditReason(invoice.returnReason || '');
    setIsEditModalOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedInvoice) return;
    setIsSaving(true);
    try {
      const newTimestamp = editDate ? new Date(editDate).getTime() : selectedInvoice.date;
      const parsedPaid = editPaidAmount === '' ? 0 : Number(editPaidAmount);
      const newDue = Math.max(0, selectedInvoice.total - parsedPaid);

      let finalCustId = selectedInvoice.customerId;
      const trimmedName = editCustomerName.trim();
      const trimmedPhone = editCustomerPhone.trim();

      if (trimmedName || trimmedPhone) {
        if (finalCustId) {
          const cust = customers.find(c => c.id === finalCustId);
          if (cust) {
            await updateCustomer(finalCustId, {
              name: trimmedName || cust.name,
              phone: trimmedPhone || cust.phone,
              whatsapp: trimmedPhone || cust.whatsapp
            });
          }
        } else if (trimmedPhone) {
          const existing = customers.find(c => c.phone === trimmedPhone);
          if (existing) {
            finalCustId = existing.id;
          } else {
            finalCustId = await addCustomer({
              name: trimmedName || `Customer (${trimmedPhone})`,
              phone: trimmedPhone,
              whatsapp: trimmedPhone,
              address: ''
            });
          }
        }
      }

      const updates: any = {
        date: newTimestamp,
        customerName: trimmedName || selectedInvoice.customerName || 'Walk-in Customer',
        customerId: finalCustId || '',
        status: editStatus,
        paidAmount: parsedPaid,
        dueAmount: newDue,
        returnReason: editReason.trim()
      };

      if (newDue > 0 && editBalanceDueDate) {
        const [by, bm, bd] = editBalanceDueDate.split('-').map(Number);
        updates.balanceDueDate = new Date(by, bm - 1, bd, 23, 59, 59).getTime();
      } else {
        updates.balanceDueDate = null;
      }

      if (editDeliveryDate) {
        const [dy, dm, dd] = editDeliveryDate.split('-').map(Number);
        updates.deliveryDate = new Date(dy, dm - 1, dd, 12, 0, 0).getTime();
        updates.deliveryStatus = editDeliveryStatus;
      } else {
        updates.deliveryDate = null;
      }

      await updateInvoice(selectedInvoice.id, updates);
      setIsEditModalOpen(false);

      setSelectedInvoice({
        ...selectedInvoice,
        ...updates
      });
      alert('Invoice updated successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to update invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Invoice ${invoice.id}?\n\n` +
      `• Customer: ${invoice.customerName || 'Walk-in'}\n` +
      `• Total Amount: ₹${invoice.total.toFixed(2)}\n\n` +
      `This will return all sold items back into inventory stock.`
    );
    if (!confirmDelete) return;

    try {
      await deleteInvoice(invoice.id, true);
      alert(`Invoice ${invoice.id} deleted successfully and inventory stock restored.`);
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(null);
      }
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Failed to delete invoice.');
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
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-green-600">₹{invoice.total.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInvoice(invoice);
                        }}
                        title="Delete Invoice"
                        className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <User size={14} className="mr-1" /> {invoice.customerName || 'Walk-in Customer'}
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
            <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invoice {selectedInvoice.id}</h2>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div className="flex items-center"><User size={16} className="mr-2 text-gray-400" /> {selectedInvoice.customerName || 'Walk-in Customer'}</div>
                  <div className="flex items-center"><Phone size={16} className="mr-2 text-gray-400" /> {customers.find(c => c.id === selectedInvoice.customerId)?.phone || (selectedInvoice.customerId ? selectedInvoice.customerId : 'No Phone Provided')}</div>
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
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => handleEditInvoice(selectedInvoice)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Edit size={16} className="mr-1.5" />
                  Edit Invoice
                </button>
                <button 
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <FileText size={16} className="mr-1.5" />
                  Print Receipt
                </button>
                <button 
                  onClick={() => handleDeleteInvoice(selectedInvoice)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={16} className="mr-1.5" />
                  Delete Invoice
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

      {/* Edit Invoice Modal */}
      {isEditModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => !isSaving && setIsEditModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-5 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Edit Invoice ({selectedInvoice.id})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Update invoice details, customer information, status, and payment balance.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                  {/* Customer Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Customer Name</label>
                      <input 
                        type="text" 
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        placeholder="Customer Name"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Customer Phone</label>
                      <input 
                        type="text" 
                        value={editCustomerPhone}
                        onChange={(e) => setEditCustomerPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-700 uppercase">Invoice Date & Time *</label>
                      <button
                        type="button"
                        onClick={() => setEditDate(toLocalDateTimeInputString(Date.now()))}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Set to Current Time
                      </button>
                    </div>
                    <input 
                      type="datetime-local" 
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Status & Payment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
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
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Amount Paid (₹) / Total: ₹{selectedInvoice.total.toFixed(2)}
                      </label>
                      <input 
                        type="number"
                        min="0"
                        max={selectedInvoice.total}
                        value={editPaidAmount === '' ? '' : editPaidAmount}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setEditPaidAmount(val);
                          const paidNum = val === '' ? 0 : Number(val);
                          const due = selectedInvoice.total - paidNum;
                          if (due <= 0 && editStatus !== 'Returned' && editStatus !== 'Exchanged') {
                            setEditStatus('Paid');
                          } else if (due > 0 && paidNum > 0 && editStatus !== 'Returned' && editStatus !== 'Exchanged') {
                            setEditStatus('Partial');
                          } else if (due > 0 && paidNum === 0 && editStatus !== 'Returned' && editStatus !== 'Exchanged') {
                            setEditStatus('Due');
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Balance Due warning & Promised Date */}
                  {selectedInvoice.total - (Number(editPaidAmount) || 0) > 0 && (
                    <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                      <div className="flex justify-between items-center mb-2 text-orange-800 text-xs font-bold">
                        <span>Balance Due:</span>
                        <span>₹{(selectedInvoice.total - (Number(editPaidAmount) || 0)).toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-orange-800 mb-1">Balance Promised Date</label>
                        <input 
                          type="date" 
                          value={editBalanceDueDate}
                          onChange={(e) => setEditBalanceDueDate(e.target.value)}
                          className="w-full border border-orange-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Delivery Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Scheduled Delivery Date (Optional)</label>
                      <input 
                        type="date" 
                        value={editDeliveryDate}
                        onChange={(e) => setEditDeliveryDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Delivery Status</label>
                      <select 
                        value={editDeliveryStatus}
                        onChange={(e) => setEditDeliveryStatus(e.target.value as any)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Notes / Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reason / Notes</label>
                    <textarea 
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. Return reason, exchange details, or special notes..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsEditModalOpen(false);
                    handleDeleteInvoice(selectedInvoice);
                  }}
                  className="inline-flex items-center text-red-600 hover:text-red-800 text-sm font-semibold transition-colors order-2 sm:order-1"
                >
                  <Trash2 size={16} className="mr-1.5" />
                  Delete This Invoice
                </button>
                <div className="flex space-x-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={saveEdit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-bold shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
