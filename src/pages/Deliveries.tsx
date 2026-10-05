import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Truck, CheckCircle, Clock, User, Phone, MapPin, IndianRupee, Plus, FileText, Calendar } from 'lucide-react';
import type { Invoice, DeliveryDriver } from '../types';

export default function Deliveries() {
  const { invoices, drivers, addDriver, updateInvoice } = useData();
  const [activeTab, setActiveTab] = useState<'orders' | 'drivers'>('orders');
  
  // Drivers state
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', vehicleNumber: '' });
  
  // Assign driver modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState<number | ''>('');

  const deliveryInvoices = invoices.filter(inv => inv.deliveryDate).sort((a, b) => (b.deliveryDate || 0) - (a.deliveryDate || 0));

  const handleAddDriver = async () => {
    if (!newDriver.name || !newDriver.phone || !newDriver.vehicleNumber) {
      alert('Please fill all fields');
      return;
    }
    await addDriver(newDriver);
    setNewDriver({ name: '', phone: '', vehicleNumber: '' });
    setIsAddDriverModalOpen(false);
  };

  const handleUpdateStatus = async (invoiceId: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'Delivered' ? 'Pending' : 'Delivered';
    await updateInvoice(invoiceId, { deliveryStatus: newStatus });
  };

  const openAssignModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSelectedDriverId(invoice.driverId || '');
    setDeliveryCharge(invoice.driverCharge || '');
    setAssignModalOpen(true);
  };

  const handleAssignDriver = async () => {
    if (selectedInvoice && selectedDriverId) {
      await updateInvoice(selectedInvoice.id, {
        driverId: selectedDriverId,
        driverCharge: deliveryCharge === '' ? 0 : deliveryCharge
      });
      setAssignModalOpen(false);
    } else {
      alert("Please select a driver");
    }
  };

  // Helper for driver stats
  const getDriverStats = (driverId: string) => {
    const driverInvoices = invoices.filter(i => i.driverId === driverId && i.deliveryStatus === 'Delivered');
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1).getTime();

    let dailyEarnings = 0, monthlyEarnings = 0, yearlyEarnings = 0;
    let dailyOrders = 0, monthlyOrders = 0, yearlyOrders = 0;

    driverInvoices.forEach(inv => {
      const charge = inv.driverCharge || 0;
      // using the invoice date (or delivery date) for stats
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
          <p className="text-sm text-gray-500">Track scheduled deliveries and manage drivers</p>
        </div>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button 
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('orders')}
          >
            Delivery Orders
          </button>
          <button 
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'drivers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('drivers')}
          >
            Drivers
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer & Delivery Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No scheduled deliveries found. Add a delivery date when checking out.
                  </td>
                </tr>
              ) : (
                deliveryInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{inv.id}</div>
                      <div className="text-sm text-gray-500">{inv.items.length} items • ₹{inv.total.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 flex items-center"><User size={14} className="mr-1 text-gray-400"/> {inv.customerName}</div>
                      <div className="text-sm text-indigo-600 font-semibold flex items-center mt-1">
                        <Calendar size={14} className="mr-1" /> {new Date(inv.deliveryDate!).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inv.driverId ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            <Truck size={14} className="mr-1 text-blue-500" /> 
                            {drivers.find(d => d.id === inv.driverId)?.name || 'Unknown Driver'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Charge: ₹{inv.driverCharge || 0}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        inv.deliveryStatus === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inv.deliveryStatus === 'Delivered' ? 'Delivered' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => openAssignModal(inv)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded"
                      >
                        {inv.driverId ? 'Edit Driver' : 'Assign Driver'}
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(inv.id, inv.deliveryStatus)}
                        className={`${inv.deliveryStatus === 'Delivered' ? 'text-orange-600 hover:text-orange-900 bg-orange-50' : 'text-green-600 hover:text-green-900 bg-green-50'} px-2 py-1 rounded`}
                      >
                        Mark {inv.deliveryStatus === 'Delivered' ? 'Pending' : 'Delivered'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsAddDriverModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} className="mr-2" /> Add Driver
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map(driver => {
              const stats = getDriverStats(driver.id);
              return (
                <div key={driver.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                        <Truck size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone size={14} className="mr-1" /> {driver.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Vehicle</div>
                    <div className="text-sm font-medium bg-gray-100 inline-block px-2 py-1 rounded border border-gray-200">
                      {driver.vehicleNumber}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Earnings & Orders</div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Today:</span>
                      <span className="font-bold">₹{stats.dailyEarnings} <span className="text-gray-400 font-normal">({stats.dailyOrders} ord)</span></span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">This Month:</span>
                      <span className="font-bold">₹{stats.monthlyEarnings} <span className="text-gray-400 font-normal">({stats.monthlyOrders} ord)</span></span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">This Year:</span>
                      <span className="font-bold">₹{stats.yearlyEarnings} <span className="text-gray-400 font-normal">({stats.yearlyOrders} ord)</span></span>
                    </div>
                    
                    <div className="pt-3 mt-3 border-t flex justify-between items-center">
                      <span className="text-gray-900 font-semibold">Total All Time:</span>
                      <span className="text-green-600 font-black text-lg flex items-center">
                        <IndianRupee size={16} className="mr-0.5" />
                        {stats.totalEarnings}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {drivers.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
                <Truck size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Drivers Found</h3>
                <p className="mt-1 text-gray-500">Add delivery drivers to start tracking their orders and payouts.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {isAddDriverModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsAddDriverModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 border-b pb-2">Add New Driver</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                    <input type="text" value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input type="text" value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number (e.g. KL 01 AB 1234) *</label>
                    <input type="text" value={newDriver.vehicleNumber} onChange={e => setNewDriver({...newDriver, vehicleNumber: e.target.value.toUpperCase()})} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 uppercase" />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" onClick={handleAddDriver} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">Save Driver</button>
                <button type="button" onClick={() => setIsAddDriverModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {assignModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setAssignModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 border-b pb-2">Assign Driver</h3>
                <p className="text-sm text-gray-500 mb-4">Assigning driver for Invoice: <span className="font-bold text-gray-900">{selectedInvoice.id}</span></p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Driver *</label>
                    <select 
                      value={selectedDriverId}
                      onChange={e => setSelectedDriverId(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Choose a driver --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.vehicleNumber})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge given to Driver (₹)</label>
                    <input 
                      type="number" 
                      value={deliveryCharge} 
                      onChange={e => setDeliveryCharge(e.target.value === '' ? '' : Number(e.target.value))} 
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" onClick={handleAssignDriver} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">Save Assignment</button>
                <button type="button" onClick={() => setAssignModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
