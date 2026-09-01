
export const getMerchantSession = () => localStorage.getItem('merchantSession');
export const setMerchantSession = () => localStorage.setItem('merchantSession', 'active');
export const clearMerchantSession = () => localStorage.removeItem('merchantSession');

export const getCustomerSession = () => localStorage.getItem('customerSession');
export const setCustomerSession = (id: string) => localStorage.setItem('customerSession', id);
export const clearCustomerSession = () => localStorage.removeItem('customerSession');
