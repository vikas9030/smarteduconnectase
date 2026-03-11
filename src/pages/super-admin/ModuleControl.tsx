import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { superAdminSidebarItems } from '@/config/superAdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, ToggleLeft } from 'lucide-react';
import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { toast } from 'sonner';

export default function ModuleControl() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { modules, loading: modulesLoading, refetch } = useModuleVisibility();

  useEffect(() => {
    if (!loading && (!user || userRole !== 'super_admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  const handleToggle = async (moduleKey: string, newValue: boolean) => {
    const { error } = await supabase
      .from('module_visibility')
      .update({ is_enabled: newValue, updated_by: user?.id, updated_at: new Date().toISOString() } as any)
      .eq('module_key', moduleKey);

    if (error) {
      toast.error('Failed to update module');
    } else {
      toast.success(`Module ${newValue ? 'enabled' : 'disabled'}`);
      refetch();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={superAdminSidebarItems} roleColor="super_admin">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Module Control</h1>
          <p className="text-muted-foreground">Enable or disable system modules for all users</p>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <ToggleLeft className="h-5 w-5 text-primary" />
              System Modules
            </CardTitle>
            <CardDescription>Toggle modules on/off. Disabled modules will be hidden from Admin, Teacher, and Parent panels.</CardDescription>
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {modules.map((mod) => (
                  <div key={mod.module_key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div>
                      <p className="font-medium">{mod.module_label}</p>
                      <p className="text-xs text-muted-foreground">Key: {mod.module_key}</p>
                    </div>
                    <Switch
                      checked={mod.is_enabled}
                      onCheckedChange={(checked) => handleToggle(mod.module_key, checked)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
