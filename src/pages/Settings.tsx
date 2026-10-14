import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { 
  Trash2, 
  Archive, 
  Search, 
  ArrowUpCircle, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  Eye, 
  Building2, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Filter,
  Layers,
  IndianRupee
} from 'lucide-react';
import type { DeletedRecord } from '../types';

export default function Settings() {
  const { deletedRecords, permanentlyDeleteRecord } = useData();

  // Active Tab: 'trash' | 'store' | 'print'
  const [activeTab, setActiveTab] = useState<'trash' | 'store' | 'print'>('trash');

  // Search & Filter state for Trash
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'product'>('all');
  const [selectedRecord, setSelectedRecord] = useState<DeletedRecord | null>(null);

  // Store Profile State (persisted to localStorage)
  const [storeName, setStoreName] = useState(() => localStorage.getItem('kf_store_name') || 'Kairali Furniture');
  const [storePhone, setStorePhone] = useState(() => localStorage.getItem('kf_store_phone') || '+91 9446682285');
  const [storeAddress, setStoreAddress] = useState(() => localStorage.getItem('kf_store_address') || 'Main Road, Kerala, India');
  const [storeGstin, setStoreGstin] = useState(() => localStorage.getItem('kf_store_gstin') || '32AAAAA0000A1Z5');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Print Preferences (persisted to localStorage)
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(() => localStorage.getItem('kf_invoice_footer') || 'Thank you for shopping with Kairali Furniture! Goods once sold can be exchanged within 7 days with original invoice.');
  const [showTaxBreakup, setShowTaxBreakup] = useState(() => localStorage.getItem('kf_show_tax') !== 'false');

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('kf_store_name', storeName);
    localStorage.setItem('kf_store_phone', storePhone);
    localStorage.setItem('kf_store_address', storeAddress);
    localStorage.setItem('kf_store_gstin', storeGstin);
    setSaveSuccessMessage('Store profile updated successfully!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  const handleSavePrintPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('kf_invoice_footer', invoiceFooterNote);
    localStorage.setItem('kf_show_tax', String(showTaxBreakup));
    setSaveSuccessMessage('Print preferences updated successfully!');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  const handlePermanentDelete = async (record: DeletedRecord) => {
    const confirm = window.confirm(
      `Permanently purge record "${record.title}"?\n\nThis cannot be undone. (Inventory stock already restored will remain in stock).`
    );
    if (!confirm) return;

    try {
      await permanentlyDeleteRecord(record.id);
      if (selectedRecord?.id === record.id) {
        setSelectedRecord(null);
      }
      alert('Record permanently removed.');
    } catch (e) {
      console.error(e);
      alert('Failed to delete record.');
    }
  };

  // Filter deleted records
  const filteredRecords = deletedRecords.filter((rec) => {
    if (typeFilter !== 'all' && rec.type !== typeFilter) return false;
    const term = searchTerm.toLowerCase();
    const titleMatch = (rec.title || '').toLowerCase().includes(term);
    const origIdMatch = (rec.originalId || '').toLowerCase().includes(term);
    const reasonMatch = (rec.reason || '').toLowerCase().includes(term);
    const custMatch = (rec.customerName || '').toLowerCase().includes(term);
    return titleMatch || origIdMatch || reasonMatch || custMatch;
  });

  // Calculate statistics
  const totalDeletedInvoices = deletedRecords.filter(r => r.type === 'invoice').length;
  const totalRestoredStockUnits = deletedRecords
    .filter(r => r.stockRestored && r.items)
    .reduce((sum, r) => sum + (r.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0), 0);
  const totalDeletedValue = deletedRecords
    .filter(r => r.type === 'invoice')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & System Archives</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review deleted invoices with reasons &amp; stock restoration logs, manage store profile, and print preferences.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('trash')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'trash'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Archive size={18} className="mr-2" />
            Deleted Records &amp; Reasons
            {deletedRecords.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {deletedRecords.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('store')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'store'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 size={18} className="mr-2" />
            Store Information
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'print'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Receipt size={18} className="mr-2" />
            Receipt / Bill Preferences
          </button>
        </nav>
      </div>

      {/* Tab 1: Deleted Records Archive */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex items-center">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg mr-4">
                <Trash2 size={24} />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Deleted Invoices</span>
                <span className="text-2xl font-bold text-gray-900">{totalDeletedInvoices} records</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex items-center">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg mr-4">
                <ArrowUpCircle size={24} />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Inventory Stock Restored</span>
                <span className="text-2xl font-bold text-emerald-700">+{totalRestoredStockUnits} units</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex items-center">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
                <IndianRupee size={24} />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Total Deleted Value</span>
                <span className="text-2xl font-bold text-gray-900">₹{totalDeletedValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search deleted records by Bill #, Customer, Reason, or Product..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <div className="flex items-center text-xs font-medium text-gray-500">
                <Filter size={14} className="mr-1.5" /> Filter:
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types ({deletedRecords.length})</option>
                <option value="invoice">Invoices Only ({totalDeletedInvoices})</option>
                <option value="product">Products Only ({deletedRecords.length - totalDeletedInvoices})</option>
              </select>
            </div>
          </div>

          {/* Records Table / List */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-4">
                  <Archive size={30} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">No Deleted Records Found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  When you delete an invoice or item, it will be automatically archived here along with the explanation/reason for deletion and proof of stock count restoration.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Date Deleted</th>
                      <th className="px-6 py-3">Type &amp; Reference</th>
                      <th className="px-6 py-3">Customer / Title</th>
                      <th className="px-6 py-3">Reason for Deletion</th>
                      <th className="px-6 py-3">Stock Impact</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {filteredRecords.map((rec) => {
                      const totalQtyRestored = rec.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
                      return (
                        <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            <div className="flex items-center">
                              <Clock size={13} className="mr-1.5 text-gray-400" />
                              {new Date(rec.deletedAt).toLocaleDateString('en-IN')}{' '}
                              <span className="text-gray-400 ml-1">
                                {new Date(rec.deletedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                              rec.type === 'invoice' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {rec.type === 'invoice' ? 'Invoice' : 'Product'}
                            </span>
                            <span className="font-semibold text-gray-900">{rec.originalId}</span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{rec.customerName || rec.title}</div>
                            {rec.customerId && (
                              <div className="text-xs text-gray-400">{rec.customerId}</div>
                            )}
                          </td>

                          <td className="px-6 py-4 max-w-xs">
                            <div className="inline-block bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-medium leading-relaxed">
                              {rec.reason || 'No description provided'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {rec.stockRestored && totalQtyRestored > 0 ? (
                              <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <ArrowUpCircle size={13} className="mr-1 text-emerald-600" />
                                +{totalQtyRestored} stock returned
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                            {rec.amount !== undefined ? `₹${rec.amount.toFixed(2)}` : '—'}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(rec)}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md font-semibold transition-colors"
                            >
                              <Eye size={14} className="mr-1" />
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(rec)}
                              title="Permanently remove from archive"
                              className="inline-flex items-center text-gray-400 hover:text-red-600 p-1.5 rounded-md transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Store Information */}
      {activeTab === 'store' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Store Information</h2>
          <p className="text-sm text-gray-500 mb-6">
            This information appears on customer sales receipts and invoice printouts.
          </p>

          {saveSuccessMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center">
              <CheckCircle2 size={16} className="mr-2" /> {saveSuccessMessage}
            </div>
          )}

          <form onSubmit={handleSaveStoreProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store / Business Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone / WhatsApp</label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
              <textarea
                rows={3}
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN / Tax ID (Optional)</label>
              <input
                type="text"
                value={storeGstin}
                onChange={(e) => setStoreGstin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
              >
                Save Store Information
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Receipt Preferences */}
      {activeTab === 'print' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Receipt &amp; Print Preferences</h2>
          <p className="text-sm text-gray-500 mb-6">
            Configure default receipt terms, return policies, and print options.
          </p>

          {saveSuccessMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center">
              <CheckCircle2 size={16} className="mr-2" /> {saveSuccessMessage}
            </div>
          )}

          <form onSubmit={handleSavePrintPreferences} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Footer / Return Policy</label>
              <textarea
                rows={3}
                value={invoiceFooterNote}
                onChange={(e) => setInvoiceFooterNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400 mt-1 block">Printed at the bottom of customer receipts.</span>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showTaxBreakup"
                checked={showTaxBreakup}
                onChange={(e) => setShowTaxBreakup(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="showTaxBreakup" className="ml-2 text-sm font-medium text-gray-800">
                Show detailed Subtotal &amp; Tax rows on printout
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
              >
                Save Print Preferences
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deleted Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Deleted {selectedRecord.type === 'invoice' ? 'Invoice Record' : 'Product'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    ID: {selectedRecord.originalId} • Deleted on{' '}
                    {new Date(selectedRecord.deletedAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Reason for Deletion Highlight */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center">
                  <AlertTriangle size={14} className="mr-1.5 text-amber-600" />
                  Reason Given for Deletion:
                </div>
                <div className="text-sm font-semibold text-amber-950">
                  "{selectedRecord.reason || 'No description provided'}"
                </div>
              </div>

              {/* Stock count restoration proof */}
              {selectedRecord.stockRestored && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start">
                  <ArrowUpCircle size={18} className="text-emerald-600 mr-2.5 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-emerald-800">
                    <span className="font-bold block">Inventory Count Restored Automatically</span>
                    <span>
                      The stock counts for items sold in this bill were automatically added back into active inventory at the time of deletion.
                    </span>
                  </div>
                </div>
              )}

              {/* Invoice Information */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block">Customer Name</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {selectedRecord.customerName || selectedRecord.data?.customerName || 'Walk-in Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Customer Phone / ID</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {selectedRecord.customerId || selectedRecord.data?.customerId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Original Sale Date</span>
                  <span className="font-semibold text-gray-800">
                    {selectedRecord.data?.date ? new Date(selectedRecord.data.date).toLocaleString('en-IN') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Original Total Amount</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {selectedRecord.amount !== undefined ? `₹${selectedRecord.amount.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Items in Invoice */}
              {selectedRecord.items && selectedRecord.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Items in This Deleted Invoice
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-100 text-gray-600 font-semibold text-left">
                        <tr>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2 text-center">Qty Restored</th>
                          <th className="px-3 py-2 text-right">Selling Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedRecord.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-[10px] text-gray-400">SKU: {item.sku}</div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                +{item.quantity}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              ₹{item.actualSellingPrice?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900">
                              ₹{item.total?.toFixed(2) || '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Snapshot */}
              {selectedRecord.data && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>₹{selectedRecord.data.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  {selectedRecord.data.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount:</span>
                      <span>- ₹{selectedRecord.data.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedRecord.data.tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax:</span>
                      <span>+ ₹{selectedRecord.data.tax?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                    <span>Total:</span>
                    <span>₹{selectedRecord.data.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handlePermanentDelete(selectedRecord)}
                className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center"
              >
                <Trash2 size={14} className="mr-1" /> Permanently Purge This Record
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
