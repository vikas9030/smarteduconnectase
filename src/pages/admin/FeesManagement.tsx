import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { adminSidebarItems } from '@/config/adminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, CreditCard, DollarSign, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/StatCard';
import { BackButton } from '@/components/ui/back-button';

interface FeeRecord {
  id: string;
  student_id: string;
  fee_type: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  payment_status: string;
  paid_at: string | null;
  receipt_number: string | null;
  students?: { full_name: string; admission_number: string; classes?: { name: string; section: string } | null } | null;
}

export default function FeesManagement() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const [stats, setStats] = useState({ totalDue: 0, totalPaid: 0, overdue: 0 });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);

    const [feesRes, classesRes] = await Promise.all([
      supabase.from('fees').select('*, students(full_name, admission_number, classes(name, section))').order('due_date', { ascending: false }),
      supabase.from('classes').select('*').order('name'),
    ]);

    if (feesRes.data) {
      setFees(feesRes.data as FeeRecord[]);

      const totalDue = feesRes.data.reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);
      const totalPaid = feesRes.data.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
      const overdue = feesRes.data.filter(f => f.payment_status === 'unpaid' && new Date(f.due_date) < new Date()).length;
      setStats({ totalDue, totalPaid, overdue });
    }
    if (classesRes.data) setClasses(classesRes.data);

    setLoadingData(false);
  };

  const handleMarkPaid = async (id: string, amount: number) => {
    const receiptNumber = `RCP${Date.now().toString().slice(-8)}`;
    const { error } = await supabase
      .from('fees')
      .update({ 
        payment_status: 'paid', 
        paid_amount: amount, 
        paid_at: new Date().toISOString(),
        receipt_number: receiptNumber 
      })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Payment recorded' });
      fetchData();
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'paid') return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
    if (status === 'partial') return <Badge className="bg-warning/10 text-warning border-warning/20">Partial</Badge>;
    if (new Date(dueDate) < new Date()) return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>;
    return <Badge className="bg-primary/10 text-primary border-primary/20">Unpaid</Badge>;
  };

  const filteredFees = fees.filter((f) => {
    const matchesSearch = f.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.students?.admission_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.fee_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.payment_status === statusFilter;
    const matchesClass = classFilter === 'all';
    return matchesSearch && matchesStatus && matchesClass;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Fees Management</h1>
            <p className="text-muted-foreground">Track and manage student fees</p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Due" value={`₹${stats.totalDue.toLocaleString()}`} icon={<AlertCircle className="h-6 w-6" />} />
          <StatCard title="Total Collected" value={`₹${stats.totalPaid.toLocaleString()}`} icon={<CheckCircle className="h-6 w-6" />} variant="primary" />
          <StatCard title="Overdue" value={stats.overdue.toString()} icon={<CreditCard className="h-6 w-6" />} />
        </div>

        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by student or fee type..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader><CardTitle className="font-display">Fee Records ({filteredFees.length})</CardTitle></CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredFees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No fee records found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{fee.students?.full_name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground font-mono">{fee.students?.admission_number}</div>
                          </div>
                        </TableCell>
                        <TableCell>{fee.students?.classes ? `${fee.students.classes.name} - ${fee.students.classes.section}` : 'N/A'}</TableCell>
                        <TableCell className="capitalize">{fee.fee_type}</TableCell>
                        <TableCell className="font-medium">₹{fee.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-success">₹{(fee.paid_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(fee.payment_status, fee.due_date)}</TableCell>
                        <TableCell>
                          {fee.payment_status !== 'paid' && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkPaid(fee.id, fee.amount)}>
                              <DollarSign className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          {fee.receipt_number && (
                            <Badge variant="outline" className="text-xs">{fee.receipt_number}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
