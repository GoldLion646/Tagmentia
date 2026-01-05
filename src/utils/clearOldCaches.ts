// Clear old logo caches on app startup
export const clearOldLogoCaches = () => {
  if (typeof window === 'undefined') return;

  try {
    // Clear old localStorage keys
    const oldKeys = [
      'tagmentia_global_logo_config',
      'logo_config',
      'tagmentia_logo_v1',
      'tagmentia_logo_v2',
      'tagmentia_logo_v3'
    ];

    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`🗑️ Clearing old cache: ${key}`);
        localStorage.removeItem(key);
      }
    });

    // Clear service worker cache if it exists
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('logo') || name.includes('branding')) {
            console.log(`🗑️ Clearing service worker cache: ${name}`);
            caches.delete(name);
          }
        });
      });
    }

    console.log('✅ Old logo caches cleared');
  } catch (error) {
    console.error('Error clearing old caches:', error);
  }
};
