import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  Truck, CheckCircle, Clock, User, Phone, MapPin, IndianRupee, Plus, 
  Calendar, Search, Filter, Check, X, ShoppingBag, RefreshCw, 
  Package, AlertCircle, MessageCircle, ExternalLink
} from 'lucide-react';
import type { Invoice, DeliveryDriver } from '../types';
import { Link } from 'react-router-dom';

type FilterTab = 'all' | 'pending' | 'partial' | 'scheduled' | 'delivered' | 'store_pickup';

export default function Deliveries() {
  const { invoices, drivers, customers, addDriver, updateInvoice } = useData();
  const [activeMainTab, setActiveMainTab] = useState<'orders' | 'drivers'>('orders');
  const [statusFilter, setStatusFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming' | 'overdue'>('all');

  // Drivers state
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', vehicleNumber: '' });
  
  // Assign driver modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState<number | ''>('');

  // Date Scheduler Modal
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateModalInvoice, setDateModalInvoice] = useState<Invoice | null>(null);
  const [targetDeliveryDate, setTargetDeliveryDate] = useState('');

  // Helper to compute comprehensive delivery info for any invoice
  const getDeliveryInfo = (inv: Invoice) => {
    const items = inv.items || [];
    const totalItemsCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    
    let deliveredCount = 0;
    items.forEach(item => {
      if (item.delivered === true) {
        deliveredCount += Number(item.quantity) || 1;
      } else if (item.delivered === false) {
        // explicitly pending
      } else {
        // legacy or undefined item.delivered:
        if (inv.deliveryStatus === 'Delivered') {
          deliveredCount += Number(item.quantity) || 1;
        } else if (inv.deliveryDate) {
          // Scheduled delivery date with no delivered flag => pending
        } else if (inv.deliveryStatus === 'Pending') {
          // explicitly pending
        } else {
          // If no delivery date was given and no pending status, taken at billing time
          deliveredCount += Number(item.quantity) || 1;
        }
      }
    });

    const pendingCount = Math.max(0, totalItemsCount - deliveredCount);
    
    let effectiveStatus: 'Delivered' | 'Partial' | 'Pending';
    if (inv.deliveryStatus === 'Delivered' || (deliveredCount === totalItemsCount && totalItemsCount > 0)) {
      effectiveStatus = 'Delivered';
    } else if (inv.deliveryStatus === 'Partial' || (deliveredCount > 0 && pendingCount > 0)) {
      effectiveStatus = 'Partial';
    } else {
      effectiveStatus = 'Pending';
    }

    return {
      effectiveStatus,
      totalItemsCount,
      deliveredCount,
      pendingCount,
      isFullyDelivered: effectiveStatus === 'Delivered',
      isFullyPending: effectiveStatus === 'Pending',
      isPartial: effectiveStatus === 'Partial',
      isStorePickup: effectiveStatus === 'Delivered' && !inv.deliveryDate,
      hasScheduledDate: Boolean(inv.deliveryDate),
    };
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let pendingCount = 0;
    let partialCount = 0;
    let scheduledCount = 0;
    let deliveredCount = 0;
    let storePickupCount = 0;

    invoices.forEach(inv => {
      const info = getDeliveryInfo(inv);
      if (info.isFullyDelivered) {
        deliveredCount++;
        if (!inv.deliveryDate) storePickupCount++;
      } else if (info.isPartial) {
        partialCount++;
      } else {
        pendingCount++;
      }

      if (inv.deliveryDate) {
        scheduledCount++;
      }
    });

    return {
      total: invoices.length,
      pending: pendingCount,
      partial: partialCount,
      scheduled: scheduledCount,
      delivered: deliveredCount,
      storePickup: storePickupCount,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const tomorrowStart = todayStart + 86400000;
    const dayAfterTomorrowStart = tomorrowStart + 86400000;

    return invoices.filter(inv => {
      const info = getDeliveryInfo(inv);
      const customer = customers.find(c => c.id === inv.customerId);
      const customerPhone = customer?.phone || (inv.customerId && !inv.customerId.startsWith('CUS-') ? inv.customerId : '');
      const customerName = inv.customerName || customer?.name || '';

      // Main Status Tab Filter
      if (statusFilter === 'pending' && info.effectiveStatus !== 'Pending') return false;
      if (statusFilter === 'partial' && info.effectiveStatus !== 'Partial') return false;
      if (statusFilter === 'scheduled' && !inv.deliveryDate) return false;
      if (statusFilter === 'delivered' && info.effectiveStatus !== 'Delivered') return false;
      if (statusFilter === 'store_pickup' && !info.isStorePickup) return false;

      // Date Range Filter
      if (dateFilter !== 'all') {
        if (!inv.deliveryDate) return false;
        if (dateFilter === 'today' && (inv.deliveryDate < todayStart || inv.deliveryDate >= tomorrowStart)) return false;
        if (dateFilter === 'tomorrow' && (inv.deliveryDate < tomorrowStart || inv.deliveryDate >= dayAfterTomorrowStart)) return false;
        if (dateFilter === 'upcoming' && inv.deliveryDate < todayStart) return false;
        if (dateFilter === 'overdue' && (inv.deliveryDate >= todayStart || info.isFullyDelivered)) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = inv.id.toLowerCase().includes(q);
        const matchesName = customerName.toLowerCase().includes(q);
        const matchesPhone = customerPhone.toLowerCase().includes(q);
        const matchesAddress = (customer?.address || '').toLowerCase().includes(q);
        const matchesProducts = (inv.items || []).some(item => 
          item.name.toLowerCase().includes(q) || (item.sku && item.sku.toLowerCase().includes(q))
        );

        if (!matchesId && !matchesName && !matchesPhone && !matchesAddress && !matchesProducts) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort logic: Upcoming delivery dates first, then newest invoice
      if (a.deliveryDate && b.deliveryDate) {
        return a.deliveryDate - b.deliveryDate;
      }
      if (a.deliveryDate && !b.deliveryDate) return -1;
      if (!a.deliveryDate && b.deliveryDate) return 1;
      return (b.date || 0) - (a.date || 0);
    });
  }, [invoices, statusFilter, dateFilter, searchQuery, customers]);

  // Actions: Toggle individual product delivery
  const handleToggleItemDelivery = async (invoice: Invoice, itemIndex: number) => {
    const items = [...(invoice.items || [])];
    const targetItem = items[itemIndex];
    if (!targetItem) return;

    const currentDelivered = targetItem.delivered !== undefined
      ? targetItem.delivered
      : (invoice.deliveryStatus === 'Delivered' || (!invoice.deliveryDate && !invoice.deliveryStatus));

    const newDelivered = !currentDelivered;
    items[itemIndex] = {
      ...targetItem,
      delivered: newDelivered,
    };

    const allDelivered = items.every(i => i.delivered === true);
    const someDelivered = items.some(i => i.delivered === true);
    const newDeliveryStatus: 'Delivered' | 'Partial' | 'Pending' = allDelivered
      ? 'Delivered'
      : someDelivered
      ? 'Partial'
      : 'Pending';

    await updateInvoice(invoice.id, {
      items,
      deliveryStatus: newDeliveryStatus,
    });
  };

  // Actions: Toggle entire order delivery status
  const handleToggleOrderDelivery = async (invoice: Invoice) => {
    const currentInfo = getDeliveryInfo(invoice);
    const willBeDelivered = !currentInfo.isFullyDelivered;
    const newStatus: 'Delivered' | 'Pending' = willBeDelivered ? 'Delivered' : 'Pending';
    
    const updatedItems = (invoice.items || []).map(item => ({
      ...item,
      delivered: willBeDelivered,
    }));

    await updateInvoice(invoice.id, {
      deliveryStatus: newStatus,
      items: updatedItems,
    });
  };

  // Open Date Scheduler Modal
  const openDateModal = (invoice: Invoice) => {
    setDateModalInvoice(invoice);
    if (invoice.deliveryDate) {
      const d = new Date(invoice.deliveryDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      setTargetDeliveryDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    } else {
      setTargetDeliveryDate('');
    }
    setDateModalOpen(true);
  };

  // Save Delivery Date
  const handleSaveDeliveryDate = async () => {
    if (!dateModalInvoice) return;
    
    let newTimestamp: number | null = null;
    if (targetDeliveryDate) {
      const [y, m, d] = targetDeliveryDate.split('-').map(Number);
      newTimestamp = new Date(y, m - 1, d, 12, 0, 0).getTime();
    }

    const updates: Partial<Invoice> = {
      deliveryDate: newTimestamp,
    };

    // If setting a future date and order is currently marked fully delivered, ask or switch to Pending
    if (newTimestamp && dateModalInvoice.deliveryStatus === 'Delivered') {
      const confirmPending = window.confirm(
        'You scheduled a delivery date for this invoice. Would you like to set the status to "Pending Delivery"?'
      );
      if (confirmPending) {
        updates.deliveryStatus = 'Pending';
        updates.items = (dateModalInvoice.items || []).map(i => ({ ...i, delivered: false }));
      }
    } else if (newTimestamp && !dateModalInvoice.deliveryStatus) {
      updates.deliveryStatus = 'Pending';
    }

    await updateInvoice(dateModalInvoice.id, updates);
    setDateModalOpen(false);
    setDateModalInvoice(null);
  };

  // Drivers Handlers
  const handleAddDriver = async () => {
    if (!newDriver.name || !newDriver.phone || !newDriver.vehicleNumber) {
      alert('Please fill all driver fields');
      return;
    }
    await addDriver(newDriver);
    setNewDriver({ name: '', phone: '', vehicleNumber: '' });
    setIsAddDriverModalOpen(false);
  };

  const openAssignModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSelectedDriverId(invoice.driverId || '');
    setDeliveryCharge(invoice.driverCharge !== undefined ? invoice.driverCharge : '');
    setAssignModalOpen(true);
  };

  const handleAssignDriver = async () => {
    if (selectedInvoice && selectedDriverId) {
      await updateInvoice(selectedInvoice.id, {
        driverId: selectedDriverId,
        driverCharge: deliveryCharge === '' ? 0 : Number(deliveryCharge)
      });
      setAssignModalOpen(false);
    } else {
      alert('Please select a driver');
    }
  };

  // Driver stats helper
  const getDriverStats = (driverId: string) => {
    const driverInvoices = invoices.filter(i => i.driverId === driverId && i.deliveryStatus === 'Delivered');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1).getTime();

    let dailyEarnings = 0, monthlyEarnings = 0, yearlyEarnings = 0;
    let dailyOrders = 0, monthlyOrders = 0, yearlyOrders = 0;

    driverInvoices.forEach(inv => {
      const charge = inv.driverCharge || 0;
      const date = inv.deliveryDate || inv.date; 

      if (date >= today.getTime()) {
        dailyEarnings += charge;
        dailyOrders++;
      }
      if (date >= firstDayOfMonth) {
        monthlyEarnings += charge;
        monthlyOrders++;
      }
      if (date >= firstDayOfYear) {
        yearlyEarnings += charge;
        yearlyOrders++;
      }
    });

    return {
      dailyOrders, monthlyOrders, yearlyOrders,
      dailyEarnings, monthlyEarnings, yearlyEarnings,
      totalOrders: driverInvoices.length,
      totalEarnings: driverInvoices.reduce((sum, inv) => sum + (inv.driverCharge || 0), 0)
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Delivery Management</h1>
              <p className="text-sm text-gray-500">Track all products, scheduled deliveries, store pickups, and drivers</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
          <button 
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${
              activeMainTab === 'orders' 
                ? 'bg-white text-blue-700 shadow-sm font-bold' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveMainTab('orders')}
          >
            Delivery Orders
            {summaryMetrics.pending > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full font-bold">
                {summaryMetrics.pending}
              </span>
            )}
          </button>
          <button 
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${
              activeMainTab === 'drivers' 
                ? 'bg-white text-blue-700 shadow-sm font-bold' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveMainTab('drivers')}
          >
            Drivers & Payouts ({drivers.length})
          </button>
        </div>
      </div>

      {activeMainTab === 'orders' && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div 
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'all' 
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Orders</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{summaryMetrics.total}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Total sales billed</div>
            </div>

            <div 
              onClick={() => setStatusFilter('pending')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'pending' 
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-amber-700 uppercase tracking-wider">
                <span>Pending</span>
                <Clock size={14} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">{summaryMetrics.pending}</div>
              <div className="text-[11px] text-amber-700/70 mt-0.5">Awaiting delivery</div>
            </div>

            <div 
              onClick={() => setStatusFilter('partial')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'partial' 
                  ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-purple-700 uppercase tracking-wider">
                <span>Partially</span>
                <Package size={14} className="text-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-600 mt-1">{summaryMetrics.partial}</div>
              <div className="text-[11px] text-purple-700/70 mt-0.5">Some items taken</div>
            </div>

            <div 
              onClick={() => setStatusFilter('scheduled')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'scheduled' 
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                <span>Scheduled</span>
                <Calendar size={14} className="text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-indigo-600 mt-1">{summaryMetrics.scheduled}</div>
              <div className="text-[11px] text-indigo-700/70 mt-0.5">With delivery date</div>
            </div>

            <div 
              onClick={() => setStatusFilter('delivered')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'delivered' 
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                <span>Delivered</span>
                <CheckCircle size={14} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{summaryMetrics.delivered}</div>
              <div className="text-[11px] text-emerald-700/70 mt-0.5">100% completed</div>
            </div>

            <div 
              onClick={() => setStatusFilter('store_pickup')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'store_pickup' 
                  ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <span>Store Taken</span>
                <ShoppingBag size={14} className="text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-700 mt-1">{summaryMetrics.storePickup}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Taken at billing time</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by invoice ID, customer name, phone, or product name..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Date filter dropdown */}
            <div className="flex items-center space-x-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Schedule:</div>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="all">All Dates</option>
                <option value="today">Scheduled for Today</option>
                <option value="tomorrow">Scheduled for Tomorrow</option>
                <option value="upcoming">Upcoming Future Dates</option>
                <option value="overdue">Overdue Pending</option>
              </select>
            </div>
          </div>

          {/* Delivery Orders List */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Invoice & Customer
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Products In Order (Click to update status)
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Delivery Schedule
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Overall Status
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="max-w-sm mx-auto">
                          <Package size={44} className="mx-auto text-gray-300 mb-3" />
                          <h3 className="text-base font-bold text-gray-800">No Orders Found</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                              ? 'No orders match your filter criteria. Try clearing search or changing the filter.'
                              : 'No sales invoices created yet. Orders will appear here automatically upon checkout.'}
                          </p>
                          {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
                            <button
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setDateFilter('all');
                              }}
                              className="mt-3 inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                            >
                              <RefreshCw size={12} className="mr-1.5" /> Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => {
                      const info = getDeliveryInfo(inv);
                      const customer = customers.find(c => c.id === inv.customerId);
                      const customerPhone = customer?.phone || (inv.customerId && !inv.customerId.startsWith('CUS-') ? inv.customerId : '');
                      const customerName = inv.customerName || customer?.name || 'Walk-in Customer';
                      const assignedDriver = drivers.find(d => d.id === inv.driverId);

                      // Scheduled date relative indicator
                      let dateBadge = null;
                      if (inv.deliveryDate) {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const diffDays = Math.round((inv.deliveryDate - today.getTime()) / 86400000);
                        if (diffDays === 0) {
                          dateBadge = <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Today</span>;
                        } else if (diffDays === 1) {
                          dateBadge = <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Tomorrow</span>;
                        } else if (diffDays < 0 && !info.isFullyDelivered) {
                          dateBadge = <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Overdue</span>;
                        }
                      }

                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                          {/* Invoice & Customer */}
                          <td className="px-5 py-4 align-top whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-gray-900 text-sm">{inv.id}</span>
                              <Link 
                                to={`/sales`} 
                                title="View in Sales" 
                                className="text-gray-400 hover:text-blue-600 p-0.5"
                              >
                                <ExternalLink size={13} />
                              </Link>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-sm font-bold text-blue-600 mt-1">
                              ₹{inv.total.toFixed(2)}
                            </div>

                            <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                              <div className="text-xs font-semibold text-gray-800 flex items-center">
                                <User size={13} className="mr-1 text-gray-400 flex-shrink-0" />
                                <span className="truncate max-w-[140px]">{customerName}</span>
                              </div>
                              {customerPhone && (
                                <div className="text-[11px] text-gray-600 flex items-center">
                                  <Phone size={11} className="mr-1 text-gray-400 flex-shrink-0" />
                                  <span>{customerPhone}</span>
                                  <a 
                                    href={`https://wa.me/91${customerPhone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    title="WhatsApp Customer"
                                    className="ml-1 text-emerald-600 hover:text-emerald-700"
                                  >
                                    <MessageCircle size={12} />
                                  </a>
                                </div>
                              )}
                              {customer?.address && (
                                <div className="text-[11px] text-gray-500 flex items-start max-w-[160px] truncate" title={customer.address}>
                                  <MapPin size={11} className="mr-1 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <span className="truncate">{customer.address}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Products List (Every item visible with its own Delivered/Pending toggle) */}
                          <td className="px-5 py-4 align-top">
                            <div className="space-y-2 min-w-[260px] max-w-md">
                              <div className="flex items-center justify-between text-xs pb-1 border-b border-gray-100">
                                <span className="font-bold text-gray-700">
                                  {inv.items.length} {inv.items.length === 1 ? 'Product' : 'Products'} ({info.totalItemsCount} units)
                                </span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  info.isFullyDelivered 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : info.isPartial 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {info.deliveredCount} of {info.totalItemsCount} delivered
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {inv.items.map((item, idx) => {
                                  const isItemDelivered = item.delivered !== undefined
                                    ? item.delivered
                                    : (inv.deliveryStatus === 'Delivered' || (!inv.deliveryDate && !inv.deliveryStatus));

                                  return (
                                    <div 
                                      key={idx}
                                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-white hover:border-blue-300 transition-all text-xs"
                                    >
                                      <div className="flex-1 pr-2 min-w-0">
                                        <div className="font-semibold text-gray-900 truncate" title={item.name}>
                                          {item.name}
                                        </div>
                                        <div className="text-[11px] text-gray-500 flex items-center space-x-1.5 mt-0.5">
                                          <span className="font-bold text-gray-700">Qty: {item.quantity}</span>
                                          {item.sku && <span>• {item.sku}</span>}
                                          <span>• ₹{(item.actualSellingPrice || item.productPrice || 0) * item.quantity}</span>
                                        </div>
                                      </div>

                                      {/* Interactive 1-click button for this specific product */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleItemDelivery(inv, idx)}
                                        title={isItemDelivered ? "Click to mark as Pending delivery" : "Click to mark as Delivered"}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 transition-all shadow-xs cursor-pointer ${
                                          isItemDelivered 
                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300' 
                                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                        }`}
                                      >
                                        {isItemDelivered ? (
                                          <>
                                            <CheckCircle size={13} className="text-emerald-600" />
                                            <span>Delivered</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock size={13} className="text-amber-600" />
                                            <span>Pending</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>

                          {/* Delivery Schedule */}
                          <td className="px-5 py-4 align-top whitespace-nowrap">
                            {inv.deliveryDate ? (
                              <div>
                                <div className="flex items-center text-sm font-bold text-indigo-700">
                                  <Calendar size={15} className="mr-1.5 text-indigo-500" />
                                  <span>{new Date(inv.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  {dateBadge}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                  Scheduled Delivery Date
                                </div>
                                <button
                                  onClick={() => openDateModal(inv)}
                                  className="mt-2 inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded border border-indigo-200 transition-colors"
                                >
                                  Change Date
                                </button>
                              </div>
                            ) : (
                              <div>
                                {info.isStorePickup ? (
                                  <div className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                    <ShoppingBag size={12} className="mr-1 text-slate-500" />
                                    Taken at Store
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                    <AlertCircle size={12} className="mr-1 text-amber-500" />
                                    No Date Set
                                  </div>
                                )}
                                <div className="text-[11px] text-gray-400 mt-1">
                                  {info.isStorePickup ? 'Customer took at billing time' : 'Home delivery requested'}
                                </div>
                                <button
                                  onClick={() => openDateModal(inv)}
                                  className="mt-2 inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                                >
                                  + Schedule Delivery
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Driver Assignment */}
                          <td className="px-5 py-4 align-top whitespace-nowrap">
                            {assignedDriver ? (
                              <div className="space-y-1">
                                <div className="text-sm font-bold text-gray-900 flex items-center">
                                  <Truck size={14} className="mr-1.5 text-blue-600" />
                                  <span>{assignedDriver.name}</span>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {assignedDriver.vehicleNumber}
                                </div>
                                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                                  Payout: ₹{inv.driverCharge || 0}
                                </div>
                                <div>
                                  <button
                                    onClick={() => openAssignModal(inv)}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline mt-1"
                                  >
                                    Change Driver
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-xs text-gray-400 italic block mb-2">No driver assigned</span>
                                <button
                                  onClick={() => openAssignModal(inv)}
                                  className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                                >
                                  Assign Driver
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Overall Delivery Status Badge */}
                          <td className="px-5 py-4 align-top whitespace-nowrap">
                            <div className="space-y-1.5">
                              <span className={`px-2.5 py-1 inline-flex text-xs font-black rounded-full items-center shadow-xs ${
                                info.isFullyDelivered 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : info.isPartial 
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {info.isFullyDelivered ? (
                                  <>
                                    <CheckCircle size={13} className="mr-1 text-emerald-600" />
                                    Delivered
                                  </>
                                ) : info.isPartial ? (
                                  <>
                                    <Package size={13} className="mr-1 text-purple-600" />
                                    Partially Delivered
                                  </>
                                ) : (
                                  <>
                                    <Clock size={13} className="mr-1 text-amber-600" />
                                    Pending Delivery
                                  </>
                                )}
                              </span>

                              <div className="text-[11px] text-gray-500 font-medium">
                                {info.isFullyDelivered
                                  ? 'All items handed over'
                                  : `${info.pendingCount} unit(s) pending`}
                              </div>
                            </div>
                          </td>

                          {/* Quick Actions (1-Click Mark Order Delivered / Mark Pending) */}
                          <td className="px-5 py-4 align-top text-right whitespace-nowrap space-y-2">
                            <div>
                              <button
                                onClick={() => handleToggleOrderDelivery(inv)}
                                className={`w-full inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                  info.isFullyDelivered
                                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                                }`}
                              >
                                {info.isFullyDelivered ? (
                                  <>
                                    <RefreshCw size={12} className="mr-1.5" /> Mark as Pending
                                  </>
                                ) : (
                                  <>
                                    <Check size={14} className="mr-1.5 stroke-[3]" /> Mark All Delivered
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex justify-end space-x-1.5">
                              <button
                                onClick={() => openDateModal(inv)}
                                title="Update Delivery Date"
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200"
                              >
                                <Calendar size={14} />
                              </button>
                              <button
                                onClick={() => openAssignModal(inv)}
                                title="Assign Driver"
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200"
                              >
                                <Truck size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Drivers Tab */}
      {activeMainTab === 'drivers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Registered Delivery Drivers</h2>
              <p className="text-sm text-gray-500">Track driver details, vehicle information, and commission / delivery earnings</p>
            </div>
            <button 
              onClick={() => setIsAddDriverModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center hover:bg-blue-700 transition-colors shadow-sm text-sm"
            >
              <Plus size={18} className="mr-1.5" /> Add New Driver
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map(driver => {
              const stats = getDriverStats(driver.id);
              return (
                <div key={driver.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mr-3.5">
                        <Truck size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{driver.name}</h3>
                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                          <Phone size={12} className="mr-1" /> {driver.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Vehicle Plate</div>
                    <div className="text-sm font-mono font-bold bg-gray-100 text-gray-800 inline-block px-2.5 py-1 rounded-md border border-gray-200">
                      {driver.vehicleNumber}
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Earnings & Completed Deliveries</div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Today:</span>
                      <span className="font-bold text-gray-900">₹{stats.dailyEarnings} <span className="text-gray-400 font-normal">({stats.dailyOrders} ord)</span></span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">This Month:</span>
                      <span className="font-bold text-gray-900">₹{stats.monthlyEarnings} <span className="text-gray-400 font-normal">({stats.monthlyOrders} ord)</span></span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">This Year:</span>
                      <span className="font-bold text-gray-900">₹{stats.yearlyEarnings} <span className="text-gray-400 font-normal">({stats.yearlyOrders} ord)</span></span>
                    </div>
                    
                    <div className="pt-2.5 mt-2 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-gray-900 font-bold text-xs">Lifetime Earnings:</span>
                      <span className="text-emerald-600 font-black text-base flex items-center">
                        <IndianRupee size={15} className="mr-0.5" />
                        {stats.totalEarnings}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {drivers.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <Truck size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-bold text-gray-900">No Drivers Found</h3>
                <p className="mt-1 text-xs text-gray-500">Add delivery drivers to start assigning orders and tracking driver earnings.</p>
                <button
                  onClick={() => setIsAddDriverModalOpen(true)}
                  className="mt-4 inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700"
                >
                  <Plus size={14} className="mr-1" /> Add First Driver
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Date Scheduler Modal */}
      {dateModalOpen && dateModalInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setDateModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-200">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-indigo-600" size={20} />
                    <h3 className="text-lg font-black text-gray-900">Schedule Delivery Date</h3>
                  </div>
                  <button onClick={() => setDateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                  <div>Invoice: <strong className="text-gray-900">{dateModalInvoice.id}</strong></div>
                  <div>Customer: <strong className="text-gray-900">{dateModalInvoice.customerName || 'Walk-in'}</strong></div>
                  <div>Items: <strong className="text-gray-900">{dateModalInvoice.items.length} product(s)</strong></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Delivery Date
                    </label>
                    <input 
                      type="date" 
                      value={targetDeliveryDate} 
                      onChange={e => setTargetDeliveryDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Quick Presets:</div>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          const pad = (n: number) => String(n).padStart(2, '0');
                          setTargetDeliveryDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                        }}
                        className="py-1 px-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.now() + 86400000);
                          const pad = (n: number) => String(n).padStart(2, '0');
                          setTargetDeliveryDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                        }}
                        className="py-1 px-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.now() + 3 * 86400000);
                          const pad = (n: number) => String(n).padStart(2, '0');
                          setTargetDeliveryDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                        }}
                        className="py-1 px-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
                      >
                        In 3 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.now() + 7 * 86400000);
                          const pad = (n: number) => String(n).padStart(2, '0');
                          setTargetDeliveryDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                        }}
                        className="py-1 px-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
                      >
                        In 7 Days
                      </button>
                    </div>
                  </div>

                  {dateModalInvoice.deliveryDate && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setTargetDeliveryDate('')}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold underline"
                      >
                        Clear Delivery Date (Set as Taken at Store / No Scheduled Date)
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={handleSaveDeliveryDate} 
                  className="inline-flex justify-center rounded-lg border border-transparent px-4 py-2 bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  Save Date
                </button>
                <button 
                  type="button" 
                  onClick={() => setDateModalOpen(false)} 
                  className="inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {isAddDriverModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsAddDriverModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-200">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Truck className="text-blue-600" size={20} />
                    <h3 className="text-lg font-black text-gray-900">Add New Driver</h3>
                  </div>
                  <button onClick={() => setIsAddDriverModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Driver Name *</label>
                    <input 
                      type="text" 
                      value={newDriver.name} 
                      onChange={e => setNewDriver({...newDriver, name: e.target.value})} 
                      placeholder="e.g. Suresh Kumar"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone Number *</label>
                    <input 
                      type="text" 
                      value={newDriver.phone} 
                      onChange={e => setNewDriver({...newDriver, phone: e.target.value})} 
                      placeholder="e.g. 9876543210"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Vehicle Plate Number *</label>
                    <input 
                      type="text" 
                      value={newDriver.vehicleNumber} 
                      onChange={e => setNewDriver({...newDriver, vehicleNumber: e.target.value.toUpperCase()})} 
                      placeholder="e.g. KL 08 AB 1234"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono" 
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={handleAddDriver} 
                  className="inline-flex justify-center rounded-lg border border-transparent px-4 py-2 bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  Save Driver
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddDriverModalOpen(false)} 
                  className="inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {assignModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-min-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setAssignModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-200">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Truck className="text-blue-600" size={20} />
                    <h3 className="text-lg font-black text-gray-900">Assign Driver</h3>
                  </div>
                  <button onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                  <div>Invoice: <strong className="text-gray-900">{selectedInvoice.id}</strong></div>
                  <div>Customer: <strong className="text-gray-900">{selectedInvoice.customerName || 'Walk-in'}</strong></div>
                  <div>Total: <strong className="text-gray-900">₹{selectedInvoice.total.toFixed(2)}</strong></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Select Driver *</label>
                    <select 
                      value={selectedDriverId}
                      onChange={e => setSelectedDriverId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">-- Choose a driver --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.vehicleNumber})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Delivery Charge given to Driver (₹)</label>
                    <input 
                      type="number" 
                      value={deliveryCharge} 
                      onChange={e => setDeliveryCharge(e.target.value === '' ? '' : Number(e.target.value))} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={handleAssignDriver} 
                  className="inline-flex justify-center rounded-lg border border-transparent px-4 py-2 bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  Save Assignment
                </button>
                <button 
                  type="button" 
                  onClick={() => setAssignModalOpen(false)} 
                  className="inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
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
