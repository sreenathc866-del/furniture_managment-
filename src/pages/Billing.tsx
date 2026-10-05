import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, ShoppingCart, IndianRupee, Printer, AlertTriangle } from 'lucide-react';
import type { Product, InvoiceItem } from '../types';

export default function Billing() {
  const { products, customers, addInvoice, addCustomer, updateCustomer } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  // Checkout modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Customer & Delivery states
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      alert('Product is out of stock!');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          alert('Cannot exceed available stock!');
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.actualSellingPrice }
            : item
        );
      }

      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        productPrice: product.productPrice,
        actualSellingPrice: product.finalSellingPrice,
        discount: 0,
        tax: 0,
        total: product.finalSellingPrice
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        const newQty = Math.max(1, item.quantity + delta);
        if (product && newQty > product.stockQuantity) {
          alert('Cannot exceed available stock!');
          return item;
        }
        return { ...item, quantity: newQty, total: newQty * item.actualSellingPrice };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateActualPrice = (productId: string, newPrice: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, actualSellingPrice: newPrice, total: item.quantity * newPrice };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal - discount + tax;
  
  // Calculate total Last Price to warn if overall discount drops price below limits
  const totalLP = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
  const isBelowOverallLP = grandTotal < totalLP;

  // Handle phone search
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerPhone(val);
    const existing = customers.find(c => c.phone === val);
    if (existing) {
      setCustomerName(existing.name);
      setSelectedCustomerId(existing.id);
    } else {
      setSelectedCustomerId(null);
    }
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setIsCheckoutModalOpen(true);
  };

  const confirmCheckout = async () => {

    // Ensure customer details are entered
    if (!customerPhone || !customerName) {
      alert("Please enter Customer Name and Phone Number");
      return;
    }
    
    // Clean up the phone number to check digits
    const digitsOnly = customerPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      alert("Please enter a valid phone number with at least 10 digits");
      return;
    }

    setIsProcessing(true);

    // Calculate total profit
    const profit = cart.reduce((sum, item) => {
      const itemProfit = (item.actualSellingPrice - item.productPrice) * item.quantity;
      return sum + itemProfit;
    }, 0) - discount; // overall discount cuts into profit

    try {
      let finalCustomerId = selectedCustomerId;

      if (!finalCustomerId) {
        // Create new customer
        finalCustomerId = await addCustomer({
          name: customerName,
          phone: customerPhone,
          whatsapp: customerPhone, // Default whatsapp to phone
          address: '',
        });
      }

      const invoicePayload: any = {
        customerId: finalCustomerId,
        customerName: customerName,
        items: cart,
        subtotal,
        discount,
        tax,
        total: grandTotal,
        paidAmount: grandTotal, // Assuming fully paid 
        dueAmount: 0,
        paymentMethods: ['Cash'], // Default to cash
        status: 'Paid',
        profit,
      };

      if (deliveryDate) {
        invoicePayload.deliveryDate = new Date(deliveryDate).getTime();
        invoicePayload.deliveryStatus = 'Pending';
      }

      const invoiceId = await addInvoice(invoicePayload);

      // Update customer stats
      if (finalCustomerId) {
        const customer = customers.find(c => c.id === finalCustomerId);
        if (customer) {
          await updateCustomer(finalCustomerId, {
            totalPurchases: (customer.totalPurchases || 0) + 1,
            paidAmount: (customer.paidAmount || 0) + grandTotal
          });
        } else {
          // It was a newly added customer, we don't have them in the snapshot yet, so we just update directly based on 0
          await updateCustomer(finalCustomerId, {
            totalPurchases: 1,
            paidAmount: grandTotal
          });
        }
      }

      alert(`Checkout successful! Invoice ${invoiceId} saved.`);

      // Clear cart
      setCart([]);
      setDiscount(0);
      setTax(0);
      setSearchTerm('');
      setCustomerPhone('');
      setCustomerName('');
      setSelectedCustomerId(null);
      setDeliveryDate('');
      setIsCheckoutModalOpen(false);
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert("Failed to checkout. Please check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] space-x-6">
      {/* Product Selection Area */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Scan barcode or search by name/SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`cursor-pointer rounded-lg border p-3 hover:border-blue-500 hover:shadow-md transition-all ${product.stockQuantity <= 0 ? 'opacity-50 border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="h-24 bg-gray-100 rounded-md mb-2 overflow-hidden">
                  {product.imageUrls?.[0] ? (
                    <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h3>
                <p className="text-xs text-gray-500">{product.sku}</p>
                <div className="mt-2 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-blue-600" title="Telling Price">TP: ₹{product.finalSellingPrice}</span>
                    <span className="text-xs text-gray-500 font-medium" title="Last Price">LP: ₹{product.productPrice}</span>
                  </div>
                  <span className={`text-xs px-2 rounded-full ${product.stockQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stockQuantity} in stock
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="w-[400px] bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <ShoppingCart className="mr-2" size={20} />
            Current Invoice
          </h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            {cart.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex flex-col border border-gray-100 rounded-lg p-3 bg-white shadow-sm relative">
                <button onClick={() => removeFromCart(item.productId)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-200">×</button>
                <div className="font-semibold text-gray-900 text-sm truncate pr-4">{item.name}</div>
                <div className="flex justify-between mt-2 items-center">
                  <div className="flex items-center border rounded">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="px-2 py-1 text-gray-600 hover:bg-gray-100">-</button>
                    <span className="px-3 py-1 text-sm font-medium border-x">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="px-2 py-1 text-gray-600 hover:bg-gray-100">+</button>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={item.actualSellingPrice === 0 ? '' : item.actualSellingPrice}
                        onChange={(e) => updateActualPrice(item.productId, Number(e.target.value))}
                        className="w-20 text-right text-sm border-b border-gray-300 focus:outline-none focus:border-blue-500 font-bold"
                      />
                    </div>
                    {item.actualSellingPrice < item.productPrice && (
                      <span className="text-[10px] text-red-500 flex items-center mt-1"><AlertTriangle size={10} className="mr-1" /> Below Last Price: ₹{(item.productPrice - item.actualSellingPrice) * item.quantity}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout Button */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Overall Discount</span>
              <div className="flex items-center">
                <span className="mr-1">₹</span>
                <input type="number" value={discount === 0 ? '' : discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Tax (GST)</span>
              <div className="flex items-center">
                <span className="mr-1">₹</span>
                <input type="number" value={tax === 0 ? '' : tax} onChange={(e) => setTax(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="pt-2 border-t flex flex-col">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className={`text-xl font-black ${isBelowOverallLP ? 'text-red-600' : 'text-blue-600'}`}>₹{grandTotal.toFixed(2)}</span>
              </div>
              {isBelowOverallLP && (
                <div className="text-xs text-red-500 font-medium flex justify-end mt-1 items-center">
                  <AlertTriangle size={12} className="mr-1" /> 
                  Warning: Total is below combined Last Prices (₹{totalLP.toFixed(2)})
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleCheckoutClick}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Printer size={20} className="mr-2" /> Complete Checkout
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => !isProcessing && setIsCheckoutModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 border-b pb-2">
                  Complete Checkout
                </h3>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Total Amount Due:</span>
                  </div>
                  <div className="text-3xl font-black text-blue-600 mb-4">
                    ₹{grandTotal.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input 
                      type="text" 
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      placeholder="Enter phone to search..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (selectedCustomerId && !customers.find(c => c.id === selectedCustomerId)?.name.includes(e.target.value)) {
                          setSelectedCustomerId(null);
                        }
                      }}
                      placeholder="Customer Name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {selectedCustomerId && (
                    <div className="text-xs text-green-700 font-semibold bg-green-50 p-2 rounded flex items-center">
                      <span className="mr-1">✓</span> Existing Customer Selected
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Delivery Date (Optional)</label>
                    <input 
                      type="date" 
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={isProcessing || !customerPhone || !customerName}
                  onClick={confirmCheckout}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Confirm & Save Bill'}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsCheckoutModalOpen(false)}
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
