
import React from 'react';
import { CustomerHomeScreen } from '../../customer_portal/home/screens/CustomerHomeScreen';
import { clearCustomerSession, getCustomerSession } from '../../shared/storage/session';

export function CustomerNavigator() {
  const customerId = getCustomerSession();
  
  const handleLogout = () => {
    clearCustomerSession();
    window.location.reload();
  };

  if (!customerId) return null;

  return (
    <CustomerHomeScreen customerId={customerId} onLogout={handleLogout} />
  );
}
