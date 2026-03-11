import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { superAdminSidebarItems } from '@/config/superAdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Key, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  user_id: string;
  role: string;
  full_name: string;
  email: string;
}

export default function ManageAdmins() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', password: '' });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'super_admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'super_admin']);

    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const merged: AdminUser[] = roles.map(r => {
        const p = profiles?.find(p => p.user_id === r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          full_name: p?.full_name || 'Unknown',
          email: p?.email || '',
        };
      });
      setAdmins(merged);
    } else {
      setAdmins([]);
    }
    setLoadingAdmins(false);
  };

  useEffect(() => {
    if (user) fetchAdmins();
  }, [user]);

  const handleCreateAdmin = async () => {
    if (!form.email || !form.fullName || !form.password) {
      toast.error('Please fill all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-user', {
        body: { email: form.email, password: form.password, fullName: form.fullName, role: 'admin', phone: '' },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to create admin');

      toast.success(`Admin ${form.fullName} created successfully`);
      setCreateOpen(false);
      setForm({ email: '', fullName: '', password: '' });
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admin');
    }
    setCreating(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setResetting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('reset-user-password', {
        body: { targetUserId: resetTarget.user_id, newPassword },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to reset password');

      toast.success(`Password reset for ${resetTarget.full_name}`);
      setResetOpen(false);
      setNewPassword('');
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
    setResetting(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={superAdminSidebarItems} roleColor="super_admin">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Manage Admins</h1>
            <p className="text-muted-foreground">Create and manage admin accounts</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary"><Plus className="h-4 w-4 mr-2" />Create Admin</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
                <DialogDescription>Create a new admin account with email and password</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Admin Name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@school.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateAdmin} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Admin
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Admin Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAdmins ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : admins.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No admins found</p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.user_id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{admin.full_name}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                      <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setResetTarget(admin); setResetOpen(true); setNewPassword(''); }}
                    >
                      <Key className="h-4 w-4 mr-1" />Reset Password
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset Password Dialog */}
        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Set a new password for {resetTarget?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleResetPassword} disabled={resetting}>
                {resetting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
