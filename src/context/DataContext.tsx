import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, runTransaction, getDocs, orderBy, limit, setDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Product, Customer, Invoice, Supplier, DeliveryDriver } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  suppliers: Supplier[];
  drivers: DeliveryDriver[];
  loading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'date'>) => Promise<string>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  addCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'paidAmount' | 'dueAmount'>) => Promise<string>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  addSupplier: (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balanceAmount'>) => Promise<string>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  addDriver: (driverData: Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDriver: (id: string, updates: Partial<DeliveryDriver>) => Promise<void>;
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

    setLoading(false);

    return () => {
      unsubscribeProducts();
      unsubscribeCustomers();
      unsubscribeInvoices();
      unsubscribeSuppliers();
      unsubscribeDrivers();
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

  const deleteProduct = async (customId: string) => {
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

  const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'date'>) => {
    const customId = await generateInvoiceId();
    const newInvoice = {
      ...invoiceData,
      id: customId,
      date: Date.now()
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

  const value = {
    products,
    customers,
    invoices,
    suppliers,
    drivers,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addInvoice,
    updateInvoice,
    addCustomer,
    updateCustomer,
    addSupplier,
    updateSupplier,
    addDriver,
    updateDriver
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
