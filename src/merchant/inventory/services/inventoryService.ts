import { mockProducts } from '../../../data/mock/merchant/mockData';
import { Product, StockMovement } from '../models/types';

const sync = (type: string, payload: unknown) =>
  window.dispatchEvent(new CustomEvent('convex-command', { detail: { type, payload } }));

export const getProducts = (): Product[] => {
  const local = localStorage.getItem('merchant_products');
  if (local) return JSON.parse(local);
  
  const mapped: Product[] = mockProducts.map(p => ({
    productId: p.id,
    name: p.name,
    category: p.category,
    purchasePrice: p.purchasePrice,
    salePrice: p.salePrice,
    quantity: p.quantity,
    lowStockLimit: p.lowStockThreshold,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  localStorage.setItem('merchant_products', JSON.stringify(mapped));
  return mapped;
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem('merchant_products', JSON.stringify(products));
  window.dispatchEvent(new Event('merchant_data_updated'));
};

export const canDeleteProduct = (productId: string): boolean => {
  // Check sales
  const localSales = localStorage.getItem('merchant_sales');
  if (localSales) {
    const sales = JSON.parse(localSales);
    for (const sale of sales) {
      if (sale.items && sale.items.some((i: any) => i.productId === productId)) {
        return false;
      }
    }
  }

  // Check purchases
  const localPurchases = localStorage.getItem('merchant_purchases');
  if (localPurchases) {
    const purchases = JSON.parse(localPurchases);
    for (const purchase of purchases) {
      if (purchase.items && purchase.items.some((i: any) => i.productId === productId)) {
        return false;
      }
    }
  }

  // Check stock movements (except initial stock-in)
  const localMovements = localStorage.getItem('merchant_stock_movements');
  if (localMovements) {
    const allMovements = JSON.parse(localMovements);
    const pMovements = allMovements[productId] || [];
    if (pMovements.length > 1) { // 1 might be the initial addProduct movement
      return false;
    }
  }

  return true;
};

export const deleteOrDisableProduct = (productId: string) => {
  const products = getProducts();
  const idx = products.findIndex(p => p.productId === productId);
  if (idx < 0) return;

  if (canDeleteProduct(productId)) {
    // Hard delete
    products.splice(idx, 1);
  } else {
    // Soft disable
    products[idx].status = 'inactive';
  }
  saveProducts(products);
  if (!productId.startsWith('p_')) sync('product.remove', { productId });
};

export const getStockMovements = (productId: string): StockMovement[] => {
  const local = localStorage.getItem('merchant_stock_movements');
  const allMovements: Record<string, StockMovement[]> = local ? JSON.parse(local) : {};
  return allMovements[productId] || [];
};

export const addStockMovement = (productId: string, type: 'STOCK_IN' | 'STOCK_OUT' | 'MANUAL_ADJUSTMENT', quantity: number, note: string = '') => {
  const products = getProducts();
  const productIndex = products.findIndex(p => p.productId === productId);
  if (productIndex < 0) return;
  const product = products[productIndex];
  
  const quantityBefore = product.quantity;
  let quantityAfter = quantityBefore;
  
  if (type === 'STOCK_IN') {
    quantityAfter += quantity;
  } else if (type === 'STOCK_OUT') {
    quantityAfter -= quantity;
  } else {
    quantityAfter += quantity; // Allows passing negative for adjustment
  }
  
  products[productIndex].quantity = quantityAfter;
  products[productIndex].updatedAt = new Date().toISOString();
  saveProducts(products);

  if (!productId.startsWith('p_') && note !== 'عملية بيع' && note !== 'إلغاء عملية بيع') {
    const changed = products[productIndex];
    sync('product.update', {
      productId,
      name: changed.name,
      stock: changed.quantity,
      salePrice: changed.salePrice,
      purchasePrice: changed.purchasePrice,
    });
  }

  const newMovement: StockMovement = {
    stockMovementId: 'sm_' + Date.now().toString(),
    productId,
    type,
    quantity,
    quantityBefore,
    quantityAfter,
    createdAt: new Date().toISOString(),
    note
  };

  const local = localStorage.getItem('merchant_stock_movements');
  const allMovements: Record<string, StockMovement[]> = local ? JSON.parse(local) : {};
  if (!allMovements[productId]) allMovements[productId] = [];
  allMovements[productId] = [newMovement, ...allMovements[productId]];
  localStorage.setItem('merchant_stock_movements', JSON.stringify(allMovements));
};

export const addProduct = (product: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>) => {
  const products = getProducts();
  const newProduct: Product = {
    ...product,
    productId: 'p_' + Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveProducts([newProduct, ...products]);

  sync('product.create', {
    name: newProduct.name,
    category: newProduct.category || 'عام',
    sku: newProduct.barcode || `ITEM-${Date.now()}`,
    stock: newProduct.quantity,
    salePrice: newProduct.salePrice,
    purchasePrice: newProduct.purchasePrice,
    lowStockAt: newProduct.lowStockLimit,
  });

  if (newProduct.quantity > 0) {
    const local = localStorage.getItem('merchant_stock_movements');
    const allMovements: Record<string, StockMovement[]> = local ? JSON.parse(local) : {};
    allMovements[newProduct.productId] = [{
      stockMovementId: 'sm_' + Date.now().toString(),
      productId: newProduct.productId,
      type: 'STOCK_IN',
      quantity: newProduct.quantity,
      quantityBefore: 0,
      quantityAfter: newProduct.quantity,
      createdAt: new Date().toISOString(),
      note: 'رصيد افتتاحي'
    }];
    localStorage.setItem('merchant_stock_movements', JSON.stringify(allMovements));
  }
  return newProduct;
};

export const updateProduct = (productId: string, data: Partial<Omit<Product, 'productId' | 'createdAt' | 'updatedAt' | 'quantity'>>) => {
  const products = getProducts();
  const idx = products.findIndex(p => p.productId === productId);
  if (idx < 0) return;
  products[idx] = {
    ...products[idx],
    ...data,
    updatedAt: new Date().toISOString()
  };
  saveProducts(products);
  if (!productId.startsWith('p_')) {
    const changed = products[idx];
    sync('product.update', {
      productId,
      name: changed.name,
      stock: changed.quantity,
      salePrice: changed.salePrice,
      purchasePrice: changed.purchasePrice,
    });
  }
};

export const getLowStockProducts = (): Product[] => {
  return getProducts().filter(p => p.quantity <= p.lowStockLimit);
};
