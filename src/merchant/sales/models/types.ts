export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitPurchasePrice?: number;
  totalPrice: number;
}

export interface Sale {
  saleId: string;
  customerId?: string;
  saleType: 'CASH' | 'CREDIT';
  items: SaleItem[];
  subtotal: number;
  total: number;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}
