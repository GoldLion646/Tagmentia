import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StorageQuota {
  quota_bytes: number | null;
  used_bytes: number;
  remaining_bytes: number | null;
  quota_mb: number | null;
  used_mb: number;
  remaining_mb: number | null;
  percentage: number | null;
  is_unlimited: boolean;
}

export const useStorageQuota = () => {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuota = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_storage_quota', {
        user_uuid: user.id
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const result = data[0];
        const isUnlimited = result.quota_bytes === null;
        
        setQuota({
          quota_bytes: result.quota_bytes,
          used_bytes: result.used_bytes || 0,
          remaining_bytes: result.remaining_bytes,
          quota_mb: result.quota_bytes ? Math.round(result.quota_bytes / (1024 * 1024)) : null,
          used_mb: Math.round((result.used_bytes || 0) / (1024 * 1024)),
          remaining_mb: result.remaining_bytes ? Math.round(result.remaining_bytes / (1024 * 1024)) : null,
          percentage: isUnlimited ? null : ((result.used_bytes || 0) / result.quota_bytes) * 100,
          is_unlimited: isUnlimited,
        });
      }
    } catch (error) {
      console.error('Error fetching storage quota:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  return {
    quota,
    loading,
    refresh: fetchQuota,
  };
};