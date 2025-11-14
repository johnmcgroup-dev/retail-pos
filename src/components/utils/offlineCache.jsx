export const CACHE_KEYS = {
  PRODUCTS: 'pos_products',
  CUSTOMERS: 'pos_customers',
  INVENTORY: 'pos_inventory',
  SALES: 'pos_sales',
  COMPANIES: 'pos_companies',
  LAST_SYNC: 'pos_last_sync',
  OFFLINE_SALES: 'pos_offline_sales'
};

export const offlineCache = {
  set: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  },

  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      
      if (Date.now() - timestamp > TWENTY_FOUR_HOURS) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  },

  clearAll: () => {
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  updateLastSync: () => {
    try {
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  },

  getLastSync: () => {
    try {
      const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
      return lastSync ? parseInt(lastSync) : null;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  },

  saveOfflineSale: (saleData) => {
    try {
      const offlineSales = offlineCache.getPendingOfflineSales();
      offlineSales.push({
        ...saleData,
        offlineTimestamp: Date.now(),
        synced: false
      });
      localStorage.setItem(CACHE_KEYS.OFFLINE_SALES, JSON.stringify(offlineSales));
    } catch (error) {
      console.error('Error saving offline sale:', error);
    }
  },

  getPendingOfflineSales: () => {
    try {
      const sales = localStorage.getItem(CACHE_KEYS.OFFLINE_SALES);
      return sales ? JSON.parse(sales).filter(s => !s.synced) : [];
    } catch (error) {
      console.error('Error getting offline sales:', error);
      return [];
    }
  },

  markSaleSynced: (offlineTimestamp) => {
    try {
      const offlineSales = JSON.parse(localStorage.getItem(CACHE_KEYS.OFFLINE_SALES) || '[]');
      const updated = offlineSales.map(sale => 
        sale.offlineTimestamp === offlineTimestamp 
          ? { ...sale, synced: true } 
          : sale
      );
      localStorage.setItem(CACHE_KEYS.OFFLINE_SALES, JSON.stringify(updated));
    } catch (error) {
      console.error('Error marking sale synced:', error);
    }
  },

  getCacheInfo: () => {
    try {
      const info = {};
      let totalSize = 0;

      Object.entries(CACHE_KEYS).forEach(([name, key]) => {
        if (key === CACHE_KEYS.LAST_SYNC || key === CACHE_KEYS.OFFLINE_SALES) return;
        
        const item = localStorage.getItem(key);
        if (item) {
          const size = new Blob([item]).size;
          totalSize += size;
          const { timestamp } = JSON.parse(item);
          info[name] = {
            size: `${(size / 1024).toFixed(2)} KB`,
            lastUpdate: new Date(timestamp).toLocaleString()
          };
        }
      });

      info.TOTAL = `${(totalSize / 1024).toFixed(2)} KB`;
      return info;
    } catch (error) {
      console.error('Error getting cache info:', error);
      return {};
    }
  }
};