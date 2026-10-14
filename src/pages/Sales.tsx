import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { 
  Search, 
  FileText, 
  ArrowLeftRight, 
  User, 
  Phone, 
  Calendar, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  ArrowUpCircle, 
  X, 
  CheckCircle,
  RotateCcw,
  RefreshCw,
  Package,
  Plus,
  Truck,
  Clock
} from 'lucide-react';
import type { Invoice, InvoiceItem } from '../types';

const QUICK_DELETE_REASONS = [
  'Customer cancelled order',
  'Duplicate / Billing error',
  'Wrong item or price entered',
  'Items returned by customer',
  'Payment not received / failed',
  'Order created for testing'
];

const QUICK_RETURN_REASONS = [
  'Customer changed mind',
  'Defective / Damaged unit',
  'Color / Size did not fit room',
  'Delivered wrong model',
  'Customer requested refund'
];

const QUICK_EXCHANGE_REASONS = [
  'Customer upgraded to larger model',
  'Exchanged for different color / finish',
  'Defective piece replaced with fresh unit',
  'Exchanged for alternative furniture'
];

const toLocalDateTimeInputString = (timestamp: number) => {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Sales() {
  const { invoices, customers, products, updateInvoice, deleteInvoice, processReturn, processExchange, addCustomer, updateCustomer } = useData();
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
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modal State
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Return & Exchange Modal State
  const [isReturnExchangeOpen, setIsReturnExchangeOpen] = useState(false);
  const [returnExchangeMode, setReturnExchangeMode] = useState<'return' | 'exchange'>('return');
  
  // Return sub-state
  const [returnItemsSelection, setReturnItemsSelection] = useState<{ [key: string]: boolean }>({});
  const [returnQuantities, setReturnQuantities] = useState<{ [key: string]: number }>({});
  const [returnReasonText, setReturnReasonText] = useState('');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [isProcessingReturnAction, setIsProcessingReturnAction] = useState(false);

  // Exchange sub-state
  const [exchangeOldItemIdx, setExchangeOldItemIdx] = useState<number>(0);
  const [exchangeOldQty, setExchangeOldQty] = useState<number>(1);
  const [exchangeNewProductId, setExchangeNewProductId] = useState<string>('');
  const [exchangeNewQty, setExchangeNewQty] = useState<number>(1);
  const [exchangeReasonText, setExchangeReasonText] = useState('');
  const [exchangeDiffPaymentMethod, setExchangeDiffPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [isProcessingExchangeAction, setIsProcessingExchangeAction] = useState(false);
  const [exchangeError, setExchangeError] = useState('');

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
    const d = new Date(invoice.date);
    const isLegacyMidnight = d.getHours() === 5 && d.getMinutes() === 30 && d.getSeconds() === 0;
    if (isLegacyMidnight) {
      const now = new Date();
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      setEditDate(toLocalDateTimeInputString(d.getTime()));
    } else {
      setEditDate(toLocalDateTimeInputString(invoice.date));
    }
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
      setEditDeliveryStatus(invoice.deliveryStatus || 'Delivered');
    }

    setEditReason(invoice.returnReason || '');
    setEditItems(JSON.parse(JSON.stringify(invoice.items || [])));
    setIsEditModalOpen(true);
  };

  const handleProductChangeInEdit = (idx: number, newProductId: string) => {
    const newProd = products.find(p => p.id === newProductId);
    if (!newProd) return;
    setEditItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          productId: newProd.id,
          name: newProd.name,
          sku: newProd.sku,
          productPrice: newProd.productPrice,
          actualSellingPrice: newProd.finalSellingPrice,
          total: item.quantity * newProd.finalSellingPrice
        };
      }
      return item;
    }));
  };

  const handleQuantityChangeInEdit = (idx: number, newQty: number) => {
    const safeQty = Math.max(1, newQty);
    setEditItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          quantity: safeQty,
          total: safeQty * item.actualSellingPrice
        };
      }
      return item;
    }));
  };

  const handlePriceChangeInEdit = (idx: number, newPrice: number) => {
    const safePrice = Math.max(0, newPrice);
    setEditItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          actualSellingPrice: safePrice,
          total: item.quantity * safePrice
        };
      }
      return item;
    }));
  };

  const handleRemoveItemInEdit = (idx: number) => {
    if (editItems.length <= 1) {
      alert('An invoice must have at least one product.');
      return;
    }
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddProductInEdit = () => {
    if (products.length === 0) return;
    const prod = products[0];
    setEditItems(prev => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: 1,
        productPrice: prod.productPrice,
        actualSellingPrice: prod.finalSellingPrice,
        discount: 0,
        tax: 0,
        total: prod.finalSellingPrice
      }
    ]);
  };

  const saveEdit = async () => {
    if (!selectedInvoice) return;
    if (editItems.length === 0) {
      alert('An invoice must contain at least one product.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Calculate new financials based on edited items
      const newSubtotal = editItems.reduce((sum, it) => sum + (it.total || 0), 0);
      const discount = selectedInvoice.discount || 0;
      const tax = selectedInvoice.tax || 0;
      const calculatedTotal = Math.max(0, newSubtotal - discount + tax);
      const parsedPaid = editPaidAmount === '' ? calculatedTotal : Number(editPaidAmount);
      const newDue = Math.max(0, calculatedTotal - parsedPaid);

      // 2. Automatically adjust inventory stock counts for changed/added/removed products
      const stockDeltaMap = new Map<string, number>();

      // Restore original items stock (+qty)
      selectedInvoice.items?.forEach(item => {
        const pId = item.productId;
        stockDeltaMap.set(pId, (stockDeltaMap.get(pId) || 0) + item.quantity);
      });

      // Deduct new items from stock (-qty)
      editItems.forEach(item => {
        const pId = item.productId;
        stockDeltaMap.set(pId, (stockDeltaMap.get(pId) || 0) - item.quantity);
      });

      // Commit stock updates
      const stockUpdates = [];
      for (const [pId, delta] of stockDeltaMap.entries()) {
        if (delta !== 0) {
          const prod = products.find(p => p.id === pId || (p.sku && p.sku === pId));
          if (prod) {
            const currentStock = Number(prod.stockQuantity) || 0;
            const updatedStock = Math.max(0, currentStock + delta);
            stockUpdates.push(updateProduct(prod.id, { stockQuantity: updatedStock }));
          }
        }
      }
      await Promise.all(stockUpdates);

      // 3. Customer updates if changed
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

      let newTimestamp = selectedInvoice.date;
      if (editDate) {
        const [datePart, timePart] = editDate.split('T');
        if (datePart && timePart) {
          const [y, m, d] = datePart.split('-').map(Number);
          const [hh, mm] = timePart.split(':').map(Number);
          newTimestamp = new Date(y, m - 1, d, hh, mm, 0).getTime();
        } else if (datePart) {
          const [y, m, d] = datePart.split('-').map(Number);
          const now = new Date();
          newTimestamp = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime();
        }
      }
      const newProfit = editItems.reduce((sum, item) => {
        return sum + ((item.actualSellingPrice - (item.productPrice || 0)) * item.quantity);
      }, 0) - discount;

      const updates: any = {
        date: newTimestamp,
        customerName: trimmedName || selectedInvoice.customerName || 'Walk-in Customer',
        customerId: finalCustId || '',
        status: editStatus,
        items: editItems,
        subtotal: newSubtotal,
        total: calculatedTotal,
        paidAmount: parsedPaid,
        dueAmount: newDue,
        profit: newProfit,
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
      } else {
        updates.deliveryDate = null;
      }
      updates.deliveryStatus = editDeliveryStatus;

      await updateInvoice(selectedInvoice.id, updates);
      setIsEditModalOpen(false);

      setSelectedInvoice({
        ...selectedInvoice,
        ...updates
      });
      alert(`Invoice ${selectedInvoice.id} updated successfully!\nProducts and inventory stock counts were automatically synchronized.`);
    } catch (error) {
      console.error(error);
      alert('Failed to update invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteReason('');
    setDeleteError('');
  };

  const confirmDeleteExecution = async () => {
    if (!invoiceToDelete) return;
    if (!deleteReason.trim()) {
      setDeleteError('Please provide a reason for deleting this invoice.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteInvoice(invoiceToDelete.id, deleteReason.trim(), true);
      alert(`Invoice ${invoiceToDelete.id} deleted successfully!\nInventory stock count was automatically increased, and this record is saved in Settings > Deleted Items.`);
      if (selectedInvoice?.id === invoiceToDelete.id) {
        setSelectedInvoice(null);
      }
      setInvoiceToDelete(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setDeleteError('Failed to delete invoice. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenReturnExchange = (invoice: Invoice, initialMode: 'return' | 'exchange' = 'return', itemIdx: number = 0) => {
    setSelectedInvoice(invoice);
    setReturnExchangeMode(initialMode);
    
    // Initialize return selections
    const initialSelect: { [key: string]: boolean } = {};
    const initialQty: { [key: string]: number } = {};
    invoice.items?.forEach((it, idx) => {
      const key = `${it.productId || it.sku}_${idx}`;
      initialSelect[key] = idx === itemIdx;
      initialQty[key] = 1;
    });
    setReturnItemsSelection(initialSelect);
    setReturnQuantities(initialQty);
    setReturnReasonText('');
    setRefundPaymentMethod('Cash');

    // Initialize exchange
    setExchangeOldItemIdx(itemIdx);
    setExchangeOldQty(1);
    const firstOtherProduct = products.find(p => p.id !== invoice.items[itemIdx]?.productId);
    setExchangeNewProductId(firstOtherProduct?.id || products[0]?.id || '');
    setExchangeNewQty(1);
    setExchangeReasonText('');
    setExchangeDiffPaymentMethod('Cash');
    setExchangeError('');

    setIsReturnExchangeOpen(true);
  };

  const handleExecuteReturn = async () => {
    if (!selectedInvoice) return;

    const itemsToReturnList: { productId: string; sku: string; name: string; quantity: number; refundPrice: number }[] = [];
    selectedInvoice.items?.forEach((it, idx) => {
      const key = `${it.productId || it.sku}_${idx}`;
      if (returnItemsSelection[key]) {
        const qty = returnQuantities[key] || 1;
        if (qty > 0) {
          itemsToReturnList.push({
            productId: it.productId,
            sku: it.sku,
            name: it.name,
            quantity: Math.min(qty, it.quantity),
            refundPrice: it.actualSellingPrice
          });
        }
      }
    });

    if (itemsToReturnList.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }

    if (!returnReasonText.trim()) {
      alert('Please provide a reason for the return.');
      return;
    }

    const totalRefund = itemsToReturnList.reduce((sum, it) => sum + (it.quantity * it.refundPrice), 0);
    const totalRestoredCount = itemsToReturnList.reduce((sum, it) => sum + it.quantity, 0);

    setIsProcessingReturnAction(true);
    try {
      await processReturn(
        selectedInvoice.id,
        itemsToReturnList,
        totalRefund,
        returnReasonText.trim(),
        refundPaymentMethod
      );
      alert(`Return processed successfully!\n\n• Refund Amount: ₹${totalRefund.toFixed(2)}\n• Inventory Stock Restored: +${totalRestoredCount} units\n• Status updated to Returned.`);
      setIsReturnExchangeOpen(false);
      
      const updatedInv = invoices.find(inv => inv.id === selectedInvoice.id);
      if (updatedInv) setSelectedInvoice(updatedInv);
    } catch (e: any) {
      console.error(e);
      alert('Failed to process return: ' + (e?.message || 'Unknown error'));
    } finally {
      setIsProcessingReturnAction(false);
    }
  };

  const handleExecuteExchange = async () => {
    if (!selectedInvoice) return;

    const oldItem = selectedInvoice.items[exchangeOldItemIdx];
    if (!oldItem) {
      alert('Please select the item to return for exchange.');
      return;
    }

    const newProduct = products.find(p => p.id === exchangeNewProductId);
    if (!newProduct) {
      alert('Please select the replacement product.');
      return;
    }

    if (newProduct.stockQuantity < exchangeNewQty) {
      setExchangeError(`Insufficient stock! ${newProduct.name} only has ${newProduct.stockQuantity} in stock.`);
      return;
    }

    if (!exchangeReasonText.trim()) {
      setExchangeError('Please provide a reason for this exchange.');
      return;
    }

    const oldTotal = oldItem.actualSellingPrice * exchangeOldQty;
    const newTotal = newProduct.finalSellingPrice * exchangeNewQty;
    const priceDiff = newTotal - oldTotal;

    setIsProcessingExchangeAction(true);
    setExchangeError('');
    try {
      await processExchange(
        selectedInvoice.id,
        {
          productId: oldItem.productId,
          sku: oldItem.sku,
          name: oldItem.name,
          quantity: exchangeOldQty,
          unitPrice: oldItem.actualSellingPrice
        },
        {
          productId: newProduct.id,
          sku: newProduct.sku,
          name: newProduct.name,
          quantity: exchangeNewQty,
          unitPrice: newProduct.finalSellingPrice
        },
        priceDiff,
        exchangeReasonText.trim(),
        exchangeDiffPaymentMethod
      );

      const diffMsg = priceDiff > 0 
        ? `Customer paid difference: ₹${priceDiff.toFixed(2)}`
        : priceDiff < 0 
        ? `Refunded difference to customer: ₹${Math.abs(priceDiff).toFixed(2)}` 
        : `Even exchange: ₹0.00`;

      alert(`Exchange processed successfully!\n\n• ${oldItem.name} ➔ ${newProduct.name}\n• ${diffMsg}\n• Inventory counts updated automatically (+${exchangeOldQty} / -${exchangeNewQty})`);
      setIsReturnExchangeOpen(false);

      const updatedInv = invoices.find(inv => inv.id === selectedInvoice.id);
      if (updatedInv) setSelectedInvoice(updatedInv);
    } catch (e: any) {
      console.error(e);
      setExchangeError('Failed to process exchange: ' + (e?.message || 'Unknown error'));
    } finally {
      setIsProcessingExchangeAction(false);
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
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar size={16} className="mr-2 text-gray-400" />
                      <span>
                        Date: <strong className="text-gray-900">{new Date(selectedInvoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong> at <strong className="text-gray-900">{new Date(selectedInvoice.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const now = Date.now();
                        await updateInvoice(selectedInvoice.id, { date: now });
                        setSelectedInvoice({ ...selectedInvoice, date: now });
                      }}
                      className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                      title="Update this invoice's timestamp to the current local time"
                    >
                      <Clock size={12} className="mr-1 text-blue-600" /> Set to Current Time
                    </button>
                  </div>
                  {selectedInvoice.deliveryDate && (
                    <div className="flex items-center text-indigo-600 font-medium">
                      <Calendar size={16} className="mr-2 text-indigo-400" /> Delivery Scheduled: {new Date(selectedInvoice.deliveryDate).toLocaleDateString('en-IN')}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      selectedInvoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      selectedInvoice.status === 'Returned' ? 'bg-red-100 text-red-800' :
                      selectedInvoice.status === 'Exchanged' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Payment: {selectedInvoice.status}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const isDelivered = (selectedInvoice.deliveryStatus === 'Delivered' || (!selectedInvoice.deliveryDate && !selectedInvoice.deliveryStatus));
                        const nextStatus: 'Delivered' | 'Pending' = isDelivered ? 'Pending' : 'Delivered';
                        const nextItems = (selectedInvoice.items || []).map(i => ({ ...i, delivered: !isDelivered }));
                        await updateInvoice(selectedInvoice.id, { deliveryStatus: nextStatus, items: nextItems });
                        setSelectedInvoice({ ...selectedInvoice, deliveryStatus: nextStatus, items: nextItems });
                      }}
                      title="Click to toggle delivery status"
                      className={`px-2 py-0.5 rounded text-xs font-bold flex items-center cursor-pointer transition-colors shadow-xs ${
                        (selectedInvoice.deliveryStatus === 'Delivered' || (!selectedInvoice.deliveryDate && !selectedInvoice.deliveryStatus))
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                          : selectedInvoice.deliveryStatus === 'Partial'
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                      }`}
                    >
                      <Truck size={12} className="mr-1" />
                      Delivery: {(selectedInvoice.deliveryStatus === 'Delivered' || (!selectedInvoice.deliveryDate && !selectedInvoice.deliveryStatus)) ? 'Delivered' : selectedInvoice.deliveryStatus === 'Partial' ? 'Partially Delivered' : 'Pending'} 
                      <span className="text-[10px] opacity-70 ml-1.5 font-normal">(Click to toggle)</span>
                    </button>
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
                  onClick={() => handleOpenReturnExchange(selectedInvoice, 'return')}
                  className="inline-flex items-center justify-center px-4 py-2 border border-amber-300 shadow-sm text-sm font-medium rounded-md text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <ArrowLeftRight size={16} className="mr-1.5 text-amber-600" />
                  Return / Exchange
                </button>
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
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                const currentDelivered = item.delivered !== undefined
                                  ? item.delivered
                                  : (selectedInvoice.deliveryStatus === 'Delivered' || (!selectedInvoice.deliveryDate && !selectedInvoice.deliveryStatus));
                                const updatedItems = [...selectedInvoice.items];
                                updatedItems[idx] = { ...item, delivered: !currentDelivered };
                                const allDelivered = updatedItems.every(i => i.delivered === true);
                                const someDelivered = updatedItems.some(i => i.delivered === true);
                                const newDeliveryStatus: 'Delivered' | 'Partial' | 'Pending' = allDelivered
                                  ? 'Delivered'
                                  : someDelivered
                                  ? 'Partial'
                                  : 'Pending';
                                await updateInvoice(selectedInvoice.id, { items: updatedItems, deliveryStatus: newDeliveryStatus });
                                setSelectedInvoice({ ...selectedInvoice, items: updatedItems, deliveryStatus: newDeliveryStatus });
                              }}
                              title="Click to toggle item delivery status"
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                (item.delivered !== undefined ? item.delivered : (selectedInvoice.deliveryStatus === 'Delivered' || (!selectedInvoice.deliveryDate && !selectedInvoice.deliveryStatus)))
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                            >
                              {(item.delivered !== undefined ? item.delivered : (selectedInvoice.deliveryStatus === 'Delivered' || (!selectedInvoice.deliveryDate && !selectedInvoice.deliveryStatus)))
                                ? '✓ Delivered'
                                : '🕒 Pending'}
                            </button>
                          </div>
                          <div className="text-gray-500 text-xs">SKU: {item.sku}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.quantity}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{item.actualSellingPrice.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">₹{item.total.toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReturnExchange(selectedInvoice, 'return', idx)}
                            className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                            title="Return this item"
                          >
                            <RotateCcw size={12} className="mr-1" /> Return
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReturnExchange(selectedInvoice, 'exchange', idx)}
                            className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            title="Exchange this item"
                          >
                            <RefreshCw size={12} className="mr-1" /> Exchange
                          </button>
                        </td>
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

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-5 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Edit Invoice ({selectedInvoice.id})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Change products, adjust quantities, update customer details, and payment balance.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
                  {/* Products Section - Change Product / Add / Adjust */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <div className="flex items-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                        <Package size={15} className="mr-1.5 text-blue-600" />
                        Invoice Products (Change Product / Quantity)
                      </div>
                      <button
                        type="button"
                        onClick={handleAddProductInEdit}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors"
                      >
                        <Plus size={13} className="mr-1" />
                        Add Product
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {editItems.map((item, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-md p-2.5 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                                Select / Change Product #{idx + 1}
                              </label>
                              <select
                                value={item.productId}
                                onChange={(e) => handleProductChangeInEdit(idx, e.target.value)}
                                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (SKU: {p.sku}) — ₹{p.finalSellingPrice.toFixed(2)} [Stock: {p.stockQuantity}]
                                  </option>
                                ))}
                              </select>
                            </div>
                            {editItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemInEdit(idx)}
                                className="text-gray-400 hover:text-red-600 p-1 mt-3 rounded transition-colors"
                                title="Remove product from invoice"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                            <div>
                              <label className="block text-[10px] text-gray-500 uppercase">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChangeInEdit(idx, Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 uppercase">Unit Price (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={item.actualSellingPrice}
                                onChange={(e) => handlePriceChangeInEdit(idx, Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] text-gray-500 uppercase">Item Total</span>
                              <span className="text-xs font-bold text-gray-900 block mt-1">
                                ₹{(item.quantity * item.actualSellingPrice).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live Subtotal info in product section */}
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200">
                      <span className="text-gray-500 font-medium">
                        Products Total Subtotal:
                      </span>
                      <span className="font-bold text-gray-900">
                        ₹{editItems.reduce((s, it) => s + (it.quantity * it.actualSellingPrice), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

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
                  {(() => {
                    const currentSubtotal = editItems.reduce((s, it) => s + (it.quantity * it.actualSellingPrice), 0);
                    const currentTotal = Math.max(0, currentSubtotal - (selectedInvoice.discount || 0) + (selectedInvoice.tax || 0));
                    const currentPaid = editPaidAmount === '' ? 0 : Number(editPaidAmount);
                    const currentDue = Math.max(0, currentTotal - currentPaid);

                    return (
                      <>
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
                              Amount Paid (₹) / Total: ₹{currentTotal.toFixed(2)}
                            </label>
                            <input 
                              type="number"
                              min="0"
                              max={currentTotal}
                              value={editPaidAmount === '' ? '' : editPaidAmount}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                setEditPaidAmount(val);
                                const paidNum = val === '' ? 0 : Number(val);
                                const due = currentTotal - paidNum;
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
                        {currentDue > 0 && (
                          <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                            <div className="flex justify-between items-center mb-2 text-orange-800 text-xs font-bold">
                              <span>Balance Due:</span>
                              <span>₹{currentDue.toFixed(2)}</span>
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
                      </>
                    );
                  })()}

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

      {/* Delete Invoice Modal with Reason & Stock Restored breakdown */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-100">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Invoice</h3>
                  <p className="text-xs text-red-700 font-medium">{invoiceToDelete.id} • {invoiceToDelete.customerName || 'Walk-in Customer'}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setInvoiceToDelete(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block">Total Amount</span>
                  <span className="text-base font-bold text-gray-900">₹{invoiceToDelete.total.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Date of Sale</span>
                  <span className="font-semibold text-gray-800">{new Date(invoiceToDelete.date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {/* Automatic Stock Count Increase Notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <ArrowUpCircle size={16} className="mr-1.5 text-emerald-600 flex-shrink-0" />
                  Inventory Count Restored Automatically
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Upon deleting, the stock counts for the following items will <strong>automatically increase</strong> back into warehouse inventory:
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {invoiceToDelete.items && invoiceToDelete.items.length > 0 ? (
                    invoiceToDelete.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-white/90 px-3 py-1.5 rounded border border-emerald-100">
                        <span className="font-medium text-gray-800 truncate mr-2">
                          {item.name} {item.sku ? `(${item.sku})` : ''}
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          +{item.quantity} stock
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 italic">No specific items listed in this invoice.</div>
                  )}
                </div>
              </div>

              {/* Reason for Deletion */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Reason for Deletion <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500">Pick a quick reason or write details below:</p>
                
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_DELETE_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setDeleteReason(r);
                        if (deleteError) setDeleteError('');
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        deleteReason === r 
                          ? 'bg-red-600 text-white border-red-600 font-semibold' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => {
                    setDeleteReason(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  placeholder="Describe why this invoice is being deleted (required)..."
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {deleteError && (
                  <p className="text-xs text-red-600 font-semibold flex items-center">
                    <AlertTriangle size={13} className="mr-1" /> {deleteError}
                  </p>
                )}
              </div>

              {/* Archive Info */}
              <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                🔒 <strong>Audit Trail:</strong> This deleted record will be safely accessible anytime in <strong>Settings &gt; Deleted Items</strong> along with this description and timestamp.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex justify-end space-x-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || !deleteReason.trim()}
                onClick={confirmDeleteExecution}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Deleting & Updating Stock...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-1.5" />
                    Confirm Delete & Increase Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return & Exchange Modal */}
      {isReturnExchangeOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-amber-200">
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <ArrowLeftRight size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {returnExchangeMode === 'return' ? 'Process Product Return & Refund' : 'Process Product Exchange'}
                  </h3>
                  <p className="text-xs text-amber-800 font-medium">
                    Invoice #{selectedInvoice.id} • {selectedInvoice.customerName || 'Walk-in Customer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnExchangeOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/70 px-6 pt-3">
              <button
                type="button"
                onClick={() => setReturnExchangeMode('return')}
                className={`pb-3 px-4 text-sm font-bold flex items-center border-b-2 transition-colors ${
                  returnExchangeMode === 'return'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <RotateCcw size={16} className="mr-1.5" />
                Return Items (Refund &amp; Stock Restore)
              </button>
              <button
                type="button"
                onClick={() => setReturnExchangeMode('exchange')}
                className={`pb-3 px-4 text-sm font-bold flex items-center border-b-2 transition-colors ${
                  returnExchangeMode === 'exchange'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <RefreshCw size={16} className="mr-1.5" />
                Exchange Items (Swap &amp; Price Adjustment)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* RETURN MODE */}
              {returnExchangeMode === 'return' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Select Item(s) to Return:
                    </label>
                    <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {selectedInvoice.items?.map((item, idx) => {
                        const key = `${item.productId || item.sku}_${idx}`;
                        const isSelected = !!returnItemsSelection[key];
                        const qty = returnQuantities[key] || 1;
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                              isSelected ? 'bg-white border-amber-300 shadow-xs' : 'bg-white/50 border-gray-200 opacity-70'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id={`chk_${key}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  setReturnItemsSelection(prev => ({ ...prev, [key]: e.target.checked }));
                                }}
                                className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                              />
                              <label htmlFor={`chk_${key}`} className="cursor-pointer">
                                <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500">
                                  SKU: {item.sku} • Sold Price: ₹{item.actualSellingPrice.toFixed(2)}
                                </div>
                              </label>
                            </div>

                            {isSelected && (
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-xs text-gray-500">Return Qty:</span>
                                  <select
                                    value={qty}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setReturnQuantities(prev => ({ ...prev, [key]: val }));
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                                  >
                                    {Array.from({ length: item.quantity }, (_, i) => i + 1).map(n => (
                                      <option key={n} value={n}>{n} of {item.quantity}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-400">Refund</div>
                                  <div className="text-sm font-bold text-amber-700">
                                    ₹{(item.actualSellingPrice * qty).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return Summary & Stock Count Restored Banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      <ArrowUpCircle size={16} className="mr-1.5 text-emerald-600 flex-shrink-0" />
                      Inventory Count Automatically Restored:
                    </div>
                    <div className="text-xs text-emerald-800 space-y-1">
                      {selectedInvoice.items?.filter((it, idx) => returnItemsSelection[`${it.productId || it.sku}_${idx}`]).length === 0 ? (
                        <p className="text-gray-500 italic">Select an item above to view stock increase.</p>
                      ) : (
                        selectedInvoice.items?.map((it, idx) => {
                          const key = `${it.productId || it.sku}_${idx}`;
                          if (!returnItemsSelection[key]) return null;
                          const q = returnQuantities[key] || 1;
                          return (
                            <div key={key} className="flex justify-between items-center bg-white/80 px-2.5 py-1 rounded border border-emerald-100">
                              <span className="font-medium">{it.name}</span>
                              <span className="font-bold text-emerald-700">+{q} units returned to warehouse</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Refund Payment Details */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Total Amount to Refund Customer:
                      </label>
                      <div className="text-xl font-bold text-amber-700">
                        ₹{selectedInvoice.items?.reduce((sum, it, idx) => {
                          const key = `${it.productId || it.sku}_${idx}`;
                          if (!returnItemsSelection[key]) return sum;
                          const q = returnQuantities[key] || 1;
                          return sum + (it.actualSellingPrice * q);
                        }, 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Refund Method:
                      </label>
                      <select
                        value={refundPaymentMethod}
                        onChange={(e) => setRefundPaymentMethod(e.target.value as any)}
                        className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="Cash">Cash Refund</option>
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="Card">Bank / Card</option>
                      </select>
                    </div>
                  </div>

                  {/* Reason for Return */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Reason for Return <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_RETURN_REASONS.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReturnReasonText(r)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            returnReasonText === r
                              ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={returnReasonText}
                      onChange={(e) => setReturnReasonText(e.target.value)}
                      placeholder="Enter detailed reason for the return..."
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* EXCHANGE MODE */}
              {returnExchangeMode === 'exchange' && (
                <div className="space-y-4">
                  {/* Select Old Item to Give Back */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center text-xs font-bold text-amber-900 uppercase tracking-wider">
                      <RotateCcw size={14} className="mr-1 text-amber-700" />
                      1. Item Returned by Customer:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Item from this bill:</label>
                        <select
                          value={exchangeOldItemIdx}
                          onChange={(e) => setExchangeOldItemIdx(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium"
                        >
                          {selectedInvoice.items?.map((it, idx) => (
                            <option key={idx} value={idx}>
                              {it.name} (Sold @ ₹{it.actualSellingPrice.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Quantity Returned:</label>
                        <select
                          value={exchangeOldQty}
                          onChange={(e) => setExchangeOldQty(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium"
                        >
                          {Array.from(
                            { length: selectedInvoice.items[exchangeOldItemIdx]?.quantity || 1 },
                            (_, i) => i + 1
                          ).map(n => (
                            <option key={n} value={n}>{n} unit(s)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="text-xs text-emerald-700 font-medium">
                      ✓ Stock for this returned item will automatically increase by +{exchangeOldQty} in inventory.
                    </div>
                  </div>

                  {/* Select New Replacement Item */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center text-xs font-bold text-blue-900 uppercase tracking-wider">
                      <RefreshCw size={14} className="mr-1 text-blue-700" />
                      2. New Replacement Item Given to Customer:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Select from Catalog:</label>
                        <select
                          value={exchangeNewProductId}
                          onChange={(e) => setExchangeNewProductId(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — ₹{p.finalSellingPrice.toFixed(2)} (Stock: {p.stockQuantity})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Quantity Taken:</label>
                        <input
                          type="number"
                          min={1}
                          value={exchangeNewQty}
                          onChange={(e) => setExchangeNewQty(Math.max(1, Number(e.target.value)))}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-blue-700 font-medium">
                      ✓ Stock for new replacement item will automatically decrease by -{exchangeNewQty} from inventory.
                    </div>
                  </div>

                  {/* Price Difference Breakdown */}
                  {(() => {
                    const oldItem = selectedInvoice.items[exchangeOldItemIdx];
                    const newProd = products.find(p => p.id === exchangeNewProductId);
                    const oldVal = (oldItem?.actualSellingPrice || 0) * exchangeOldQty;
                    const newVal = (newProd?.finalSellingPrice || 0) * exchangeNewQty;
                    const diff = newVal - oldVal;

                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Price Settlement Calculation:
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs border-b border-gray-200 pb-2">
                          <div>
                            <span className="text-gray-500 block">Old Item Credit</span>
                            <span className="font-semibold text-gray-800">₹{oldVal.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">New Item Price</span>
                            <span className="font-semibold text-gray-800">₹{newVal.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Net Difference</span>
                            <span className={`text-sm font-bold ${
                              diff > 0 ? 'text-amber-700' : diff < 0 ? 'text-blue-700' : 'text-gray-700'
                            }`}>
                              {diff > 0 ? `+ ₹${diff.toFixed(2)}` : diff < 0 ? `- ₹${Math.abs(diff).toFixed(2)}` : '₹0.00'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 flex justify-between items-center">
                          <div className="text-xs font-semibold text-gray-800">
                            {diff > 0 ? (
                              <span className="text-amber-700">👉 Customer pays additional ₹{diff.toFixed(2)}</span>
                            ) : diff < 0 ? (
                              <span className="text-blue-700">👉 Store refunds ₹{Math.abs(diff).toFixed(2)} to Customer</span>
                            ) : (
                              <span className="text-green-700">👉 Even exchange (No price difference)</span>
                            )}
                          </div>
                          {diff !== 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Settled via:</span>
                              <select
                                value={exchangeDiffPaymentMethod}
                                onChange={(e) => setExchangeDiffPaymentMethod(e.target.value as any)}
                                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                              >
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Reason for Exchange */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Reason for Exchange <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_EXCHANGE_REASONS.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setExchangeReasonText(r)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            exchangeReasonText === r
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={exchangeReasonText}
                      onChange={(e) => {
                        setExchangeReasonText(e.target.value);
                        if (exchangeError) setExchangeError('');
                      }}
                      placeholder="Explain reason for exchange..."
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {exchangeError && (
                      <p className="text-xs text-red-600 font-semibold flex items-center">
                        <AlertTriangle size={13} className="mr-1" /> {exchangeError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                disabled={isProcessingReturnAction || isProcessingExchangeAction}
                onClick={() => setIsReturnExchangeOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              {returnExchangeMode === 'return' ? (
                <button
                  type="button"
                  disabled={isProcessingReturnAction}
                  onClick={handleExecuteReturn}
                  className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isProcessingReturnAction ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Processing Return...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} className="mr-1.5" />
                      Confirm Return &amp; Restore Stock
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingExchangeAction}
                  onClick={handleExecuteExchange}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isProcessingExchangeAction ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Processing Exchange...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} className="mr-1.5" />
                      Confirm Exchange &amp; Update Stock
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
