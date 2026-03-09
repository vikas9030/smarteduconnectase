import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, Download, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { generateFeeReceipt } from './FeeReceiptGenerator';

interface FeeRecord {
  id: string;
  fee_type: string;
  amount: number;
  discount?: number | null;
  paid_amount: number | null;
  due_date: string;
  payment_status: string;
  paid_at: string | null;
  receipt_number: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  admissionNumber: string;
  className: string;
  fees: FeeRecord[];
}

export default function StudentFeeDetailDialog({ open, onOpenChange, studentName, admissionNumber, className, fees }: Props) {
  const totalFees = fees.reduce((s, f) => s + f.amount, 0);
  const totalDiscount = fees.reduce((s, f) => s + (f.discount || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paid_amount || 0), 0);
  const balance = totalFees - totalDiscount - totalPaid;

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" />Paid</Badge>;
    if (status === 'partial') return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" />Partial</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1 w-fit"><AlertCircle className="h-3 w-3" />Unpaid</Badge>;
  };

  const handleDownloadReceipt = (fee: FeeRecord) => {
    if (!fee.receipt_number || !fee.paid_at) return;
    generateFeeReceipt({
      receiptNumber: fee.receipt_number,
      studentName,
      admissionNumber,
      className,
      feeType: fee.fee_type,
      amount: fee.amount,
      paidAmount: fee.paid_amount || 0,
      paidAt: fee.paid_at,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{studentName}'s Fee Details</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-2">
          Admission: <span className="font-mono">{admissionNumber}</span> · Class: {className}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Fees</p>
            <p className="text-lg font-bold flex items-center justify-center"><IndianRupee className="h-4 w-4" />{totalFees.toLocaleString()}</p>
          </div>
          {totalDiscount > 0 && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">Discount</p>
              <p className="text-lg font-bold text-blue-600 flex items-center justify-center">-<IndianRupee className="h-4 w-4" />{totalDiscount.toLocaleString()}</p>
            </div>
          )}
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-bold text-green-600 flex items-center justify-center"><IndianRupee className="h-4 w-4" />{totalPaid.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-center">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-bold text-red-600 flex items-center justify-center"><IndianRupee className="h-4 w-4" />{balance.toLocaleString()}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
             <TableHead>Fee Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map(fee => (
              <TableRow key={fee.id}>
                <TableCell className="capitalize">{fee.fee_type}</TableCell>
                <TableCell>₹{fee.amount.toLocaleString()}</TableCell>
                <TableCell>{(fee.discount || 0) > 0 ? <span className="text-success">₹{(fee.discount || 0).toLocaleString()}</span> : '-'}</TableCell>
                <TableCell className="font-medium">₹{(fee.amount - (fee.discount || 0)).toLocaleString()}</TableCell>
                <TableCell>₹{(fee.paid_amount || 0).toLocaleString()}</TableCell>
                <TableCell className="font-medium text-destructive">₹{(fee.amount - (fee.discount || 0) - (fee.paid_amount || 0)).toLocaleString()}</TableCell>
                <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(fee.payment_status)}</TableCell>
                <TableCell>
                  {fee.receipt_number ? (
                    <Button size="sm" variant="ghost" onClick={() => handleDownloadReceipt(fee)}>
                      <Download className="h-3 w-3 mr-1" />
                      {fee.receipt_number}
                    </Button>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
