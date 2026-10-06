export interface Product {
  id: string; // The generated ID like KF-2026-000001
  sku: string;
  name: string;
  category: string;
  description: string;
  productPrice: number;
  finalSellingPrice: number;
  discount: number;
  tax: number;
  stockQuantity: number;
  minStock: number;
  dimensions: string;
  imageUrls: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  totalPurchases: number;
  paidAmount: number;
  dueAmount: number;
  createdAt: number;
  updatedAt: number;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  productPrice: number; // For profit calculation later
  actualSellingPrice: number; // The price it was sold at
  discount: number;
  tax: number;
  total: number; // (actualSellingPrice - discount + tax) * quantity
}

export interface Invoice {
  id: string; // E.g., INV-2026-00001
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number; // Sum of items total before overall discount/tax
  discount: number; // Overall invoice discount
  tax: number; // Overall invoice tax
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethods: string[]; // e.g., 'Cash', 'UPI'
  status: 'Paid' | 'Partial' | 'Due' | 'Returned' | 'Exchanged';
  date: number;
  profit: number; // Total profit for this invoice
  returnReason?: string; // Reason for return/exchange
  deliveryDate?: number; // Scheduled delivery date
  deliveryStatus?: 'Pending' | 'Delivered';
  driverId?: string; // ID of the assigned driver
  driverCharge?: number; // Amount paid to the driver for this delivery
  balanceDueDate?: number; // The date they promised to pay the balance
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email?: string;
  address: string;
  balanceAmount: number; // Positive means we owe them
  createdAt: number;
  updatedAt: number;
}

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  createdAt: number;
  updatedAt: number;
}
