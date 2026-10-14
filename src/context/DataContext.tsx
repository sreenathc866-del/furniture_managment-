import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, runTransaction, getDocs, orderBy, limit, setDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Product, Customer, Invoice, Supplier, DeliveryDriver, Purchase, DeletedRecord } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  suppliers: Supplier[];
  drivers: DeliveryDriver[];
  purchases: Purchase[];
  deletedRecords: DeletedRecord[];
  loading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string, reason?: string) => Promise<void>;
  addInvoice: (invoiceData: Omit<Invoice, 'id'> & { date?: number }) => Promise<string>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string, reason?: string, restoreStock?: boolean) => Promise<void>;
  permanentlyDeleteRecord: (id: string) => Promise<void>;
  processReturn: (
    invoiceId: string,
    returnedItemsList: { productId: string; sku: string; name: string; quantity: number; refundPrice: number }[],
    totalRefundAmount: number,
    reason: string,
    refundMethod: string
  ) => Promise<void>;
  processExchange: (
    invoiceId: string,
    oldItem: { productId: string; sku: string; name: string; quantity: number; unitPrice: number },
    newItem: { productId: string; sku: string; name: string; quantity: number; unitPrice: number },
    priceDifference: number,
    reason: string,
    paymentMethod: string
  ) => Promise<void>;
  addCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'paidAmount' | 'dueAmount'>) => Promise<string>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  addSupplier: (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balanceAmount'>) => Promise<string>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  addDriver: (driverData: Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDriver: (id: string, updates: Partial<DeliveryDriver>) => Promise<void>;
  addPurchase: (purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePurchase: (id: string, updates: Partial<Purchase>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    
    const unsubscribeInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    });

    const unsubscribeSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });

    const unsubscribeDrivers = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryDriver)));
    });

    const unsubscribePurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    });

    const unsubscribeDeleted = onSnapshot(collection(db, 'deleted_records'), (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeletedRecord));
      records.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
      setDeletedRecords(records);
    });

    setLoading(false);

    return () => {
      unsubscribeProducts();
      unsubscribeCustomers();
      unsubscribeInvoices();
      unsubscribeSuppliers();
      unsubscribeDrivers();
      unsubscribePurchases();
      unsubscribeDeleted();
    };
  }, [currentUser]);

  const generateProductId = async () => {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy('createdAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    let nextNum = 1;
    if (!querySnapshot.empty) {
      const lastProduct = querySnapshot.docs[0].data() as Product;
      const lastIdMatch = lastProduct.id?.match(/KF-\d{4}-(\d+)/);
      if (lastIdMatch) {
        nextNum = parseInt(lastIdMatch[1], 10) + 1;
      }
    }
    const year = new Date().getFullYear();
    return `KF-${year}-${String(nextNum).padStart(6, '0')}`;
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const customId = await generateProductId();
    const newProduct = {
      ...productData,
      id: customId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Save with the custom ID as the document ID
    await setDoc(doc(db, 'products', customId), newProduct);
  };

  const updateProduct = async (customId: string, productData: Partial<Product>) => {
    // Check if a document with this customId exists directly
    try {
      await updateDoc(doc(db, 'products', customId), {
        ...productData,
        updatedAt: Date.now()
      });
      return;
    } catch(e) {
      // Fallback: maybe it has a random doc id
      const q = query(collection(db, 'products'), where('id', '==', customId));
      const qs = await getDocs(q);
      if (!qs.empty) {
        await updateDoc(doc(db, 'products', qs.docs[0].id), {
          ...productData,
          updatedAt: Date.now()
        });
      }
    }
  };

  const deleteProduct = async (customId: string, reason: string = '') => {
    const product = products.find(p => p.id === customId);
    if (product) {
      const recordId = `DEL-PRD-${Date.now()}`;
      const newRecord: DeletedRecord = {
        id: recordId,
        type: 'product',
        originalId: product.id,
        title: `Product: ${product.name} (${product.sku})`,
        reason: reason?.trim() || 'Product removed from catalog',
        deletedAt: Date.now(),
        amount: product.finalSellingPrice,
        stockRestored: false,
        data: product
      };
      try {
        await setDoc(doc(db, 'deleted_records', recordId), newRecord);
      } catch(e) {
        console.error('Failed to log deleted product:', e);
      }
    }

    try {
      await deleteDoc(doc(db, 'products', customId));
    } catch(e) {}
    
    // Fallback: delete any that match the id field
    const q = query(collection(db, 'products'), where('id', '==', customId));
    const qs = await getDocs(q);
    qs.forEach(async (d) => {
      await deleteDoc(doc(db, 'products', d.id));
    });
  };

  const generateInvoiceId = async () => {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, orderBy('date', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    let nextNum = 1;
    if (!querySnapshot.empty) {
      const lastInvoice = querySnapshot.docs[0].data() as Invoice;
      const lastIdMatch = lastInvoice.id?.match(/INV-\d{4}-(\d+)/);
      if (lastIdMatch) {
        nextNum = parseInt(lastIdMatch[1], 10) + 1;
      }
    }
    const year = new Date().getFullYear();
    return `INV-${year}-${String(nextNum).padStart(5, '0')}`;
  };

  const addInvoice = async (invoiceData: Omit<Invoice, 'id'> & { date?: number }) => {
    const customId = await generateInvoiceId();
    const newInvoice = {
      ...invoiceData,
      id: customId,
      date: invoiceData.date || Date.now()
    };
    
    // Decrement stock for each item sold concurrently
    const stockPromises = invoiceData.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        return updateProduct(product.id, { stockQuantity: product.stockQuantity - item.quantity });
      }
      return Promise.resolve();
    });
    await Promise.all(stockPromises);

    await setDoc(doc(db, 'invoices', customId), newInvoice);
    return customId;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    await updateDoc(doc(db, 'invoices', id), updates);
  };

  const deleteInvoice = async (id: string, reason: string = '', restoreStock: boolean = true) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;

    // Restore stock if requested - increase product stock count automatically
    if (restoreStock && invoice.items && invoice.items.length > 0) {
      const stockPromises = invoice.items.map(item => {
        const product = products.find(p => p.id === item.productId || (item.sku && p.sku === item.sku));
        if (product) {
          const currentStock = Number(product.stockQuantity) || 0;
          const restoreQty = Number(item.quantity) || 0;
          return updateProduct(product.id, {
            stockQuantity: currentStock + restoreQty
          });
        }
        return Promise.resolve();
      });
      await Promise.all(stockPromises);
    }

    // Revert customer statistics if customer is linked
    if (invoice.customerId) {
      const customer = customers.find(c => c.id === invoice.customerId);
      if (customer) {
        await updateCustomer(customer.id, {
          totalPurchases: Math.max(0, (customer.totalPurchases || 1) - 1),
          paidAmount: Math.max(0, (customer.paidAmount || 0) - (invoice.paidAmount || 0)),
          dueAmount: Math.max(0, (customer.dueAmount || 0) - (invoice.dueAmount || 0))
        });
      }
    }

    // Archive record into deleted_records so it is visible in Settings
    const recordId = `DEL-INV-${Date.now()}`;
    const newRecord: DeletedRecord = {
      id: recordId,
      type: 'invoice',
      originalId: invoice.id,
      title: `Invoice ${invoice.id} - ${invoice.customerName || 'Walk-in'}`,
      reason: reason?.trim() || 'No reason provided',
      deletedAt: Date.now(),
      amount: invoice.total,
      customerName: invoice.customerName || 'Walk-in Customer',
      customerId: invoice.customerId || '',
      items: invoice.items || [],
      stockRestored: restoreStock,
      data: invoice
    };

    try {
      await setDoc(doc(db, 'deleted_records', recordId), newRecord);
    } catch (e) {
      console.error('Failed to save to deleted_records:', e);
    }

    await deleteDoc(doc(db, 'invoices', id));
  };

  const permanentlyDeleteRecord = async (id: string) => {
    await deleteDoc(doc(db, 'deleted_records', id));
  };

  const processReturn = async (
    invoiceId: string,
    returnedItemsList: { productId: string; sku: string; name: string; quantity: number; refundPrice: number }[],
    totalRefundAmount: number,
    reason: string,
    refundMethod: string = 'Cash'
  ) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // 1. Increase stock in inventory for each returned item
    const stockPromises = returnedItemsList.map(item => {
      const product = products.find(p => p.id === item.productId || (item.sku && p.sku === item.sku));
      if (product) {
        const currentStock = Number(product.stockQuantity) || 0;
        return updateProduct(product.id, {
          stockQuantity: currentStock + Number(item.quantity)
        });
      }
      return Promise.resolve();
    });
    await Promise.all(stockPromises);

    // 2. Calculate remaining items on the invoice
    const totalOriginalQty = invoice.items.reduce((sum, it) => sum + it.quantity, 0);
    const totalReturnQty = returnedItemsList.reduce((sum, it) => sum + it.quantity, 0);
    const isFullReturn = totalReturnQty >= totalOriginalQty;

    // Update items list
    const updatedItems = invoice.items.map(origItem => {
      const ret = returnedItemsList.find(r => r.productId === origItem.productId || (r.sku && r.sku === origItem.sku));
      if (ret) {
        const remQty = Math.max(0, origItem.quantity - ret.quantity);
        return {
          ...origItem,
          quantity: remQty,
          total: remQty * origItem.actualSellingPrice
        };
      }
      return origItem;
    }).filter(item => isFullReturn ? true : item.quantity > 0);

    const newSubtotal = isFullReturn ? 0 : updatedItems.reduce((s, it) => s + it.total, 0);
    const newTotal = Math.max(0, invoice.total - totalRefundAmount);
    const newPaid = Math.max(0, invoice.paidAmount - totalRefundAmount);
    const newDue = Math.max(0, newTotal - newPaid);

    const returnAudit = {
      productId: returnedItemsList[0]?.productId || '',
      name: returnedItemsList.map(r => `${r.name} (x${r.quantity})`).join(', '),
      sku: returnedItemsList.map(r => r.sku).join(', '),
      quantity: totalReturnQty,
      returnDate: Date.now(),
      refundAmount: totalRefundAmount,
      reason: reason.trim()
    };

    const updates: Partial<Invoice> = {
      status: isFullReturn ? 'Returned' : invoice.status,
      items: isFullReturn ? invoice.items : updatedItems,
      subtotal: isFullReturn ? invoice.subtotal : newSubtotal,
      total: isFullReturn ? invoice.total : newTotal,
      paidAmount: isFullReturn ? Math.max(0, invoice.paidAmount - totalRefundAmount) : newPaid,
      dueAmount: isFullReturn ? 0 : newDue,
      returnReason: `Returned on ${new Date().toLocaleDateString('en-IN')}: ${reason.trim()} (Refunded: ₹${totalRefundAmount.toFixed(2)} via ${refundMethod})`,
      returnedItems: [...(invoice.returnedItems || []), returnAudit]
    };

    await updateInvoice(invoice.id, updates);

    // 3. Update customer stats if customer is linked
    if (invoice.customerId) {
      const customer = customers.find(c => c.id === invoice.customerId);
      if (customer) {
        await updateCustomer(customer.id, {
          paidAmount: Math.max(0, (customer.paidAmount || 0) - totalRefundAmount),
          dueAmount: Math.max(0, (customer.dueAmount || 0) - (invoice.dueAmount - newDue))
        });
      }
    }

    // 4. Also archive to deleted_records so it appears in Settings audit
    const recordId = `RET-${Date.now()}`;
    const newRecord: DeletedRecord = {
      id: recordId,
      type: 'invoice',
      originalId: invoice.id,
      title: `Return: Invoice ${invoice.id} - ${invoice.customerName || 'Walk-in'}`,
      reason: `Return (${reason.trim()}) - Refunded ₹${totalRefundAmount.toFixed(2)} via ${refundMethod}`,
      deletedAt: Date.now(),
      amount: totalRefundAmount,
      customerName: invoice.customerName || 'Walk-in Customer',
      customerId: invoice.customerId || '',
      items: returnedItemsList.map(r => ({
        productId: r.productId,
        name: r.name,
        sku: r.sku,
        quantity: r.quantity,
        productPrice: 0,
        actualSellingPrice: r.refundPrice,
        discount: 0,
        tax: 0,
        total: r.refundPrice * r.quantity
      })),
      stockRestored: true,
      data: {
        ...invoice,
        returnDetails: returnAudit
      }
    };
    try {
      await setDoc(doc(db, 'deleted_records', recordId), newRecord);
    } catch(e) {}
  };

  const processExchange = async (
    invoiceId: string,
    oldItem: { productId: string; sku: string; name: string; quantity: number; unitPrice: number },
    newItem: { productId: string; sku: string; name: string; quantity: number; unitPrice: number },
    priceDifference: number,
    reason: string,
    paymentMethod: string = 'Cash'
  ) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // 1. Restore old item stock (+qty)
    const oldProduct = products.find(p => p.id === oldItem.productId || (oldItem.sku && p.sku === oldItem.sku));
    if (oldProduct) {
      await updateProduct(oldProduct.id, {
        stockQuantity: (Number(oldProduct.stockQuantity) || 0) + Number(oldItem.quantity)
      });
    }

    // 2. Deduct new item stock (-qty)
    const newProduct = products.find(p => p.id === newItem.productId || (newItem.sku && p.sku === newItem.sku));
    if (newProduct) {
      await updateProduct(newProduct.id, {
        stockQuantity: Math.max(0, (Number(newProduct.stockQuantity) || 0) - Number(newItem.quantity))
      });
    }

    // 3. Update items in the invoice: replace old item with new item
    let replaced = false;
    const updatedItems = invoice.items.map(it => {
      if (!replaced && (it.productId === oldItem.productId || (oldItem.sku && it.sku === oldItem.sku))) {
        replaced = true;
        return {
          productId: newItem.productId,
          name: newItem.name,
          sku: newItem.sku,
          quantity: newItem.quantity,
          productPrice: newProduct?.productPrice || 0,
          actualSellingPrice: newItem.unitPrice,
          discount: 0,
          tax: 0,
          total: newItem.quantity * newItem.unitPrice
        };
      }
      return it;
    });

    const newSubtotal = updatedItems.reduce((s, it) => s + it.total, 0);
    const newTotal = Math.max(0, invoice.total + priceDifference);
    const newPaid = priceDifference > 0 ? (invoice.paidAmount + priceDifference) : Math.max(0, invoice.paidAmount + priceDifference);
    const newDue = Math.max(0, newTotal - newPaid);

    const exchangeAudit = {
      oldItemName: `${oldItem.name} (x${oldItem.quantity})`,
      newItemName: `${newItem.name} (x${newItem.quantity})`,
      oldItemId: oldItem.productId,
      newItemId: newItem.productId,
      priceDifference,
      date: Date.now(),
      reason: reason.trim()
    };

    const diffNote = priceDifference > 0 
      ? `Customer paid extra ₹${priceDifference.toFixed(2)} (${paymentMethod})`
      : priceDifference < 0
      ? `Refunded difference ₹${Math.abs(priceDifference).toFixed(2)} to customer (${paymentMethod})`
      : `Even exchange (₹0.00 difference)`;

    const updates: Partial<Invoice> = {
      status: 'Exchanged',
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
      paidAmount: newPaid,
      dueAmount: newDue,
      returnReason: `Exchanged on ${new Date().toLocaleDateString('en-IN')}: ${oldItem.name} ➔ ${newItem.name}. ${diffNote}. Reason: ${reason.trim()}`,
      exchangeDetails: exchangeAudit
    };

    await updateInvoice(invoice.id, updates);

    // 4. Update customer stats if linked
    if (invoice.customerId && priceDifference !== 0) {
      const customer = customers.find(c => c.id === invoice.customerId);
      if (customer) {
        await updateCustomer(customer.id, {
          paidAmount: Math.max(0, (customer.paidAmount || 0) + priceDifference)
        });
      }
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'paidAmount' | 'dueAmount'>) => {
    // We can use phone number as ID, or generate a custom one. Phone is better for lookup.
    // Ensure phone is unique by checking if they exist first, though we'll handle that on the UI side.
    const customId = `CUS-${Date.now().toString().slice(-6)}`;
    const newCustomer: Customer = {
      ...customerData,
      id: customId,
      totalPurchases: 0,
      paidAmount: 0,
      dueAmount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(doc(db, 'customers', customId), newCustomer);
    return customId;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    await updateDoc(doc(db, 'customers', id), {
      ...updates,
      updatedAt: Date.now()
    });
  };

  const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balanceAmount'>) => {
    const timestamp = Date.now();
    const newId = `SUP-${timestamp}`;
    const newSupplier: Supplier = {
      ...supplierData,
      id: newId,
      balanceAmount: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await setDoc(doc(db, 'suppliers', newId), newSupplier);
    return newId;
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    await updateDoc(doc(db, 'suppliers', id), {
      ...updates,
      updatedAt: Date.now()
    });
  };

  const addDriver = async (driverData: Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>) => {
    const timestamp = Date.now();
    const newId = `DRV-${timestamp}`;
    const newDriver: DeliveryDriver = {
      ...driverData,
      id: newId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await setDoc(doc(db, 'drivers', newId), newDriver);
    return newId;
  };

  const updateDriver = async (id: string, updates: Partial<DeliveryDriver>) => {
    await updateDoc(doc(db, 'drivers', id), {
      ...updates,
      updatedAt: Date.now()
    });
  };

  const generatePurchaseId = async () => {
    const purchasesRef = collection(db, 'purchases');
    const q = query(purchasesRef, orderBy('createdAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    let nextNum = 1;
    if (!querySnapshot.empty) {
      const lastPurchase = querySnapshot.docs[0].data() as Purchase;
      const lastIdMatch = lastPurchase.id?.match(/PUR-\d{4}-(\d+)/);
      if (lastIdMatch) {
        nextNum = parseInt(lastIdMatch[1], 10) + 1;
      }
    }
    const year = new Date().getFullYear();
    return `PUR-${year}-${String(nextNum).padStart(5, '0')}`;
  };

  const addPurchase = async (purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) => {
    const customId = await generatePurchaseId();
    const timestamp = Date.now();
    const newPurchase: Purchase = {
      ...purchaseData,
      id: customId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Increment stock for each item purchased
    const stockPromises = purchaseData.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        return updateProduct(product.id, {
          stockQuantity: (product.stockQuantity || 0) + item.quantity,
          productPrice: item.purchasePrice > 0 ? item.purchasePrice : product.productPrice
        });
      }
      return Promise.resolve();
    });
    await Promise.all(stockPromises);

    // If there is an unpaid balance and a supplier is specified, update supplier balance
    if (purchaseData.dueAmount > 0 && purchaseData.supplierId) {
      const supplier = suppliers.find(s => s.id === purchaseData.supplierId);
      if (supplier) {
        await updateSupplier(supplier.id, {
          balanceAmount: (supplier.balanceAmount || 0) + purchaseData.dueAmount
        });
      }
    }

    await setDoc(doc(db, 'purchases', customId), newPurchase);
    return customId;
  };

  const updatePurchase = async (id: string, updates: Partial<Purchase>) => {
    await updateDoc(doc(db, 'purchases', id), {
      ...updates,
      updatedAt: Date.now()
    });
  };

  const value = {
    products,
    customers,
    invoices,
    suppliers,
    drivers,
    purchases,
    deletedRecords,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    permanentlyDeleteRecord,
    processReturn,
    processExchange,
    addCustomer,
    updateCustomer,
    addSupplier,
    updateSupplier,
    addDriver,
    updateDriver,
    addPurchase,
    updatePurchase
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
