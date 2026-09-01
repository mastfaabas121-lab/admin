import { AdminMerchant, MerchantFeatureFlags } from '../models/types';

const STORAGE_KEY = 'super_admin_merchants';

export const defaultFeatures: MerchantFeatureFlags = {
  customerPortalEnabled: true,
  cloudSyncEnabled: true,
  advancedReportsEnabled: true,
  whatsappEnabled: true,
  inventoryEnabled: true,
  suppliersEnabled: true,
  purchasesEnabled: true,
  expensesEnabled: true,
  overdueEnabled: true,
};

const initialData: AdminMerchant[] = [
  {
    id: 'M1001',
    merchantName: 'تاجر للتطوير',
    storeName: 'متجر التطوير',
    phone: '07700000000',
    status: 'ACTIVE',
    createdAt: '2026-08-27T10:00:00Z',
    trialStartedAt: '2026-08-27T10:00:00Z',
    trialEndsAt: '2026-09-03T10:00:00Z',
    subscriptionExpiresAt: '2027-08-27T10:00:00Z',
    lastLogin: '2026-08-27T10:00:00Z',
    linkedDevicesCount: 1,
    lastSync: '2026-08-27T10:00:00Z',
    features: { ...defaultFeatures }
  }
];

export const getAdminMerchants = (): AdminMerchant[] => {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    return JSON.parse(local);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
  return initialData;
};

export const saveAdminMerchants = (merchants: AdminMerchant[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merchants));
};

export const getAdminMerchant = (id: string): AdminMerchant | undefined => {
  return getAdminMerchants().find(m => m.id === id);
};

export const updateAdminMerchant = (id: string, updates: Partial<AdminMerchant>) => {
  const merchants = getAdminMerchants();
  const index = merchants.findIndex(m => m.id === id);
  if (index >= 0) {
    merchants[index] = { ...merchants[index], ...updates };
    saveAdminMerchants(merchants);
  }
};

export const getAdminStats = () => {
  const merchants = getAdminMerchants();
  const total = merchants.length;
  const trial = merchants.filter(m => m.status === 'TRIAL').length;
  const active = merchants.filter(m => m.status === 'ACTIVE').length;
  const expired = merchants.filter(m => m.status === 'EXPIRED').length;
  const suspended = merchants.filter(m => m.status === 'SUSPENDED').length;

  return { total, trial, active, expired, suspended };
};
