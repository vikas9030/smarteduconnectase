import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Calendar, CheckCircle2, Clock, AlertCircle, IndianRupee } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BackButton } from '@/components/ui/back-button';

interface Fee {
  id: string;
  fee_type: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  payment_status: string;
  paid_at: string | null;
  receipt_number: string | null;
}

export default function ParentFees() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [fees, setFees] = useState<Fee[]>([]);
  const [childName, setChildName] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchFees() {
      if (!user) return;
      setLoadingData(true);

      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentData) {
        const { data: links } = await supabase
          .from('student_parents')
          .select('student_id, students(full_name)')
          .eq('parent_id', parentData.id);

        if (links && links.length > 0) {
          const studentId = links[0].student_id;
          setChildName((links[0] as any).students?.full_name || '');

          const { data: feesData } = await supabase
            .from('fees')
            .select('*')
            .eq('student_id', studentId)
            .order('due_date', { ascending: false });

          if (feesData) setFees(feesData);
        }
      }
      setLoadingData(false);
    }
    fetchFees();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isLoadingContent = loadingData;

  const totalDue = fees.filter(f => f.payment_status !== 'paid').reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);
  const totalPaid = fees.filter(f => f.payment_status === 'paid').reduce((sum, f) => sum + f.amount, 0);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { icon: <CheckCircle2 className="h-4 w-4" />, class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      case 'partial': return { icon: <Clock className="h-4 w-4" />, class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
      default: return { icon: <AlertCircle className="h-4 w-4" />, class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    }
  };

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {isLoadingContent ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />
        <div>
          <h1 className="font-display text-2xl font-bold">Fee Payment</h1>
          <p className="text-muted-foreground">{childName}'s fee details and payment history</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-elevated border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Due</p>
                  <p className="text-2xl font-bold text-red-500 flex items-center">
                    <IndianRupee className="h-5 w-5" />{totalDue.toLocaleString()}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-500 flex items-center">
                    <IndianRupee className="h-5 w-5" />{totalPaid.toLocaleString()}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5" />{fees.reduce((s, f) => s + f.amount, 0).toLocaleString()}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fees Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Fee Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No fee records found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => {
                    const style = getStatusStyle(fee.payment_status);
                    const isOverdue = fee.payment_status !== 'paid' && new Date(fee.due_date) < new Date();
                    
                    return (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.fee_type}</TableCell>
                        <TableCell className="flex items-center"><IndianRupee className="h-3 w-3" />{fee.amount.toLocaleString()}</TableCell>
                        <TableCell className="flex items-center">
                          <IndianRupee className="h-3 w-3" />{(fee.paid_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-500' : ''}`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(fee.due_date).toLocaleDateString()}
                            {isOverdue && <Badge variant="destructive" className="ml-1 text-xs">Overdue</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${style.class} flex items-center gap-1 w-fit`}>
                            {style.icon}
                            {fee.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{fee.receipt_number || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {totalDue > 0 && (
          <Card className="card-elevated bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Ready to pay your dues?</p>
                  <p className="text-sm text-muted-foreground">Contact school office for payment options</p>
                </div>
                <Button className="gradient-parent">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      )}
    </DashboardLayout>
  );
}
