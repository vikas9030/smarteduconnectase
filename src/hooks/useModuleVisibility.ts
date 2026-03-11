import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ModuleVisibility {
  module_key: string;
  module_label: string;
  is_enabled: boolean;
}

let cachedModules: ModuleVisibility[] | null = null;
let fetchPromise: Promise<ModuleVisibility[]> | null = null;

async function fetchModules(): Promise<ModuleVisibility[]> {
  const { data, error } = await supabase
    .from('module_visibility')
    .select('module_key, module_label, is_enabled');
  if (error) {
    console.error('Error fetching module visibility:', error);
    return [];
  }
  return (data as any[]) || [];
}

export function useModuleVisibility() {
  const [modules, setModules] = useState<ModuleVisibility[]>(cachedModules || []);
  const [loading, setLoading] = useState(!cachedModules);

  const refetch = async () => {
    setLoading(true);
    cachedModules = null;
    fetchPromise = null;
    const data = await fetchModules();
    cachedModules = data;
    setModules(data);
    setLoading(false);
  };

  useEffect(() => {
    if (cachedModules) {
      setModules(cachedModules);
      setLoading(false);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetchModules();
    }
    fetchPromise.then((data) => {
      cachedModules = data;
      setModules(data);
      setLoading(false);
    });
  }, []);

  const isModuleEnabled = (key: string): boolean => {
    const mod = modules.find((m) => m.module_key === key);
    return mod ? mod.is_enabled : true; // default enabled if not found
  };

  return { modules, loading, isModuleEnabled, refetch };
}
