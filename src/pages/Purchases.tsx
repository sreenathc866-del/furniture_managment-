import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { 
  Search, 
  Plus, 
  ShoppingCart, 
  Building2, 
  Calendar, 
  IndianRupee, 
  FileText, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Printer,
  Package
} from 'lucide-react';
import type { Purchase, PurchaseItem } from '../types';

const getLocalDateTimeString = (d: Date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function Purchases() {
  const { purchases, suppliers, products, addPurchase } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Due'>('All');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // New Purchase Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [supplierBillNo, setSupplierBillNo] = useState('');
  const [purchaseDateTime, setPurchaseDateTime] = useState(getLocalDateTimeString());
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Items in new purchase
  const [purchaseItems, setPurchaseItems] = useState<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    purchasePrice: number;
  }[]>([]);

  // Summary Metrics
  const totalPurchasesCount = purchases.length;
  const totalPurchasesValue = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPendingDue = purchases.reduce((sum, p) => sum + (p.dueAmount || 0), 0);

  // Filter purchases
  const filteredPurchases = purchases.filter(p => {
    const term = searchTerm.toLowerCase();
    const dateStr = new Date(p.date).toLocaleDateString('en-IN').toLowerCase();
    const supplierMatch = (p.supplierName || '').toLowerCase().includes(term);
    const idMatch = (p.id || '').toLowerCase().includes(term);
    const billMatch = (p.supplierInvoiceNumber || '').toLowerCase().includes(term);
    const matchesSearch = supplierMatch || idMatch || billMatch || dateStr.includes(term);

    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  }).sort((a, b) => b.date - a.date);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setSelectedSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setCustomSupplierName('');
    setSupplierBillNo('');
    setPurchaseDateTime(getLocalDateTimeString());
    setPaymentMethod('Bank Transfer');
    setNotes('');
    
    // Default with first product if available
    if (products.length > 0) {
      const first = products[0];
      setPurchaseItems([{
        productId: first.id,
        name: first.name,
        sku: first.sku,
        quantity: 1,
        purchasePrice: first.productPrice || 0
      }]);
      setAmountPaid(first.productPrice || 0);
    } else {
      setPurchaseItems([]);
      setAmountPaid(0);
    }

    setIsAddModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (products.length === 0) {
      alert('Please add products in the Products page first.');
      return;
    }
    const defaultProduct = products[0];
    const newItems = [
      ...purchaseItems,
      {
        productId: defaultProduct.id,
        name: defaultProduct.name,
        sku: defaultProduct.sku,
        quantity: 1,
        purchasePrice: defaultProduct.productPrice || 0
      }
    ];
    setPurchaseItems(newItems);

    // Auto-update amount paid if it previously matched total
    const currentTotal = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    if (amountPaid === currentTotal || amountPaid === '') {
      const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
      setAmountPaid(newTotal);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = purchaseItems.filter((_, i) => i !== index);
    setPurchaseItems(updated);
    const newTotal = updated.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    if (Number(amountPaid) > newTotal) {
      setAmountPaid(newTotal);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const updated = [...purchaseItems];
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      name: prod.name,
      sku: prod.sku,
      purchasePrice: prod.productPrice || 0
    };
    setPurchaseItems(updated);

    const newTotal = updated.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    setAmountPaid(newTotal);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...purchaseItems];
    updated[index].quantity = Math.max(1, qty || 1);
    setPurchaseItems(updated);

    const newTotal = updated.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    setAmountPaid(newTotal);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...purchaseItems];
    updated[index].purchasePrice = Math.max(0, price || 0);
    setPurchaseItems(updated);

    const newTotal = updated.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    setAmountPaid(newTotal);
  };

  const totalCalculated = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
  const paidVal = amountPaid === '' ? 0 : Number(amountPaid);
  const dueVal = Math.max(0, totalCalculated - paidVal);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (purchaseItems.length === 0) {
      alert('Please add at least one item to purchase.');
      return;
    }

    let finalSupplierName = '';
    let finalSupplierId = '';

    if (selectedSupplierId === 'CUSTOM' || !selectedSupplierId) {
      finalSupplierName = customSupplierName.trim() || 'Direct Supplier';
      finalSupplierId = '';
    } else {
      const supp = suppliers.find(s => s.id === selectedSupplierId);
      finalSupplierName = supp ? `${supp.companyName} (${supp.name})` : 'Supplier';
      finalSupplierId = selectedSupplierId;
    }

    const timestamp = purchaseDateTime ? new Date(purchaseDateTime).getTime() : Date.now();
    const finalStatus: 'Paid' | 'Partial' | 'Due' = dueVal === 0 ? 'Paid' : (paidVal > 0 ? 'Partial' : 'Due');

    setIsSubmitting(true);
    try {
      const itemsToSave: PurchaseItem[] = purchaseItems.map(item => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        total: item.quantity * item.purchasePrice
      }));

      const newId = await addPurchase({
        supplierId: finalSupplierId,
        supplierName: finalSupplierName,
        supplierInvoiceNumber: supplierBillNo.trim(),
        items: itemsToSave,
        total: totalCalculated,
        paidAmount: paidVal,
        dueAmount: dueVal,
        paymentMethod: paymentMethod,
        status: finalStatus,
        date: isNaN(timestamp) ? Date.now() : timestamp,
        notes: notes.trim()
      });

      alert(`Purchase recorded successfully! ID: ${newId}. Inventory stock has been updated.`);
      setIsAddModalOpen(false);
      
      // Auto select the newly created purchase if available
      const created: Purchase = {
        id: newId,
        supplierId: finalSupplierId,
        supplierName: finalSupplierName,
        supplierInvoiceNumber: supplierBillNo.trim(),
        items: itemsToSave,
        total: totalCalculated,
        paidAmount: paidVal,
        dueAmount: dueVal,
        paymentMethod: paymentMethod,
        status: finalStatus,
        date: isNaN(timestamp) ? Date.now() : timestamp,
        notes: notes.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setSelectedPurchase(created);
    } catch (err) {
      console.error('Error saving purchase:', err);
      alert('Failed to save purchase. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases & Inward Stock</h1>
          <p className="text-sm text-gray-500">Record supplier purchases, manage inbound stock receipts, and track supplier payables.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm"
        >
          <Plus size={18} className="mr-1.5" />
          Record New Purchase
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Purchases</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalPurchasesCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Inward Value</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalPurchasesValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Payables (Due)</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">₹{totalPendingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Main Master-Detail Layout */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-18rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Left Column: Purchases List */}
        <div className="w-full md:w-2/5 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search purchase #, supplier, bill #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-1">
              {(['All', 'Paid', 'Partial', 'Due'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredPurchases.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                <ShoppingCart size={40} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">No purchases found</p>
                <p className="text-xs text-gray-400 mt-1">Click "Record New Purchase" above to add your first stock receipt.</p>
              </div>
            ) : (
              filteredPurchases.map((purchase) => {
                const isSelected = selectedPurchase?.id === purchase.id;
                return (
                  <div
                    key={purchase.id}
                    onClick={() => setSelectedPurchase(purchase)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-blue-50/50 ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-900 text-sm">{purchase.id}</span>
                      <span className="text-sm font-bold text-emerald-600">
                        ₹{purchase.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 flex items-center font-medium">
                      <Building2 size={14} className="mr-1 text-gray-400" />
                      <span className="truncate">{purchase.supplierName}</span>
                    </div>

                    {purchase.supplierInvoiceNumber && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Ref: {purchase.supplierInvoiceNumber}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-100">
                      <span className="text-xs text-gray-400 flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {new Date(purchase.date).toLocaleDateString('en-IN')} at {new Date(purchase.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          purchase.status === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : purchase.status === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Details View */}
        <div className="w-full md:w-3/5 flex flex-col overflow-hidden bg-gray-50/50">
          {selectedPurchase ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Detail Header */}
              <div className="p-6 bg-white border-b border-gray-200 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-gray-900">{selectedPurchase.id}</h2>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        selectedPurchase.status === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : selectedPurchase.status === 'Partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedPurchase.status}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <div className="flex items-center font-medium text-gray-800">
                      <Building2 size={16} className="mr-2 text-blue-500" />
                      {selectedPurchase.supplierName}
                    </div>
                    {selectedPurchase.supplierInvoiceNumber && (
                      <div className="text-xs text-gray-500">
                        Supplier Bill / Ref #: <span className="font-semibold">{selectedPurchase.supplierInvoiceNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar size={14} className="mr-1.5 text-gray-400" />
                      {new Date(selectedPurchase.date).toLocaleString('en-IN')}
                    </div>
                    {selectedPurchase.paymentMethod && (
                      <div className="text-xs text-gray-500">
                        Payment Method: <span className="font-medium text-gray-700">{selectedPurchase.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Printer size={14} className="mr-1.5" />
                  Print Voucher
                </button>
              </div>

              {/* Items Purchased List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <Package size={16} className="mr-1.5 text-gray-500" />
                    Inward Items ({selectedPurchase.items.length})
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Item Details</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Cost Price</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-gray-700">
                        {selectedPurchase.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{item.name}</p>
                              {item.sku && <p className="text-xs text-gray-400 font-mono">SKU: {item.sku}</p>}
                            </td>
                            <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">₹{item.purchasePrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              ₹{(item.quantity * item.purchasePrice).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Financial Breakdown</h3>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Total Purchase Amount</span>
                    <span className="font-bold text-gray-900">₹{selectedPurchase.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Amount Paid</span>
                    <span>₹{selectedPurchase.paidAmount.toFixed(2)}</span>
                  </div>
                  {selectedPurchase.dueAmount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600 font-semibold border-t pt-2">
                      <span>Balance Due to Supplier</span>
                      <span>₹{selectedPurchase.dueAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedPurchase.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 border border-gray-100">
                      <span className="font-semibold block mb-0.5">Notes:</span>
                      {selectedPurchase.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <FileText size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-600">No Purchase Selected</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Choose a purchase entry from the left list to view invoice breakdown, inward stock quantities, and supplier payments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Record Purchase Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" onClick={() => !isSubmitting && setIsAddModalOpen(false)} />

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmitPurchase}>
                <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Record Inward Stock / Purchase</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Purchased items will automatically be added to inventory stock.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* Supplier & Invoice Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Supplier *</label>
                      <select
                        value={selectedSupplierId}
                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.companyName} ({s.name})
                          </option>
                        ))}
                        <option value="CUSTOM">+ Other / Unregistered Supplier</option>
                      </select>
                      {selectedSupplierId === 'CUSTOM' && (
                        <input
                          type="text"
                          placeholder="Enter Supplier Name"
                          value={customSupplierName}
                          onChange={(e) => setCustomSupplierName(e.target.value)}
                          className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Supplier Bill / Invoice #</label>
                      <input
                        type="text"
                        placeholder="e.g. INV-SUP-9821"
                        value={supplierBillNo}
                        onChange={(e) => setSupplierBillNo(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Purchase Date & Time */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-700 uppercase">Purchase Date & Time *</label>
                      <button
                        type="button"
                        onClick={() => setPurchaseDateTime(getLocalDateTimeString())}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Set Current Time
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      value={purchaseDateTime}
                      onChange={(e) => setPurchaseDateTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Purchased Items Table */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-gray-700 uppercase">Items to Restock *</label>
                      <button
                        type="button"
                        onClick={handleAddItemRow}
                        className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded font-medium transition-colors flex items-center"
                      >
                        <Plus size={14} className="mr-1" /> Add Product
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden space-y-2 p-2 bg-gray-50">
                      {purchaseItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-gray-200 flex flex-col md:flex-row items-center gap-3">
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-1">Product</label>
                            <select
                              value={item.productId}
                              onChange={(e) => handleProductChange(idx, e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) • In stock: {p.stockQuantity}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-24">
                            <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div className="w-28">
                            <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-1">Cost Price (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.purchasePrice}
                              onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div className="w-28 text-right">
                            <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-1">Subtotal</label>
                            <span className="text-xs font-bold text-gray-900 block py-1.5">
                              ₹{(item.quantity * item.purchasePrice).toFixed(2)}
                            </span>
                          </div>

                          <div className="pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              disabled={purchaseItems.length === 1}
                              className="text-gray-400 hover:text-red-600 disabled:opacity-20 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-700">Total Purchase Value:</span>
                      <span className="text-lg font-black text-blue-600">₹{totalCalculated.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Paid (₹)</label>
                        <input
                          type="number"
                          min="0"
                          max={totalCalculated}
                          value={amountPaid === '' ? '' : amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                          <option value="UPI">UPI / GPay / PhonePe</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Credit">Credit (Pay Later)</option>
                        </select>
                      </div>
                    </div>

                    {dueVal > 0 && (
                      <div className="flex justify-between items-center text-sm font-semibold text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                        <span>Balance Due to Supplier:</span>
                        <span>₹{dueVal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Remarks (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Batch received in good condition, bill copy attached."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || purchaseItems.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Recording Purchase...' : 'Confirm & Inward Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
