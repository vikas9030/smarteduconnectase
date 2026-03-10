import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface DeleteFeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'single' | 'class';
  feeIds: string[];
  recordCount: number;
  onSuccess: () => void;
}

export default function DeleteFeeDialog({ open, onOpenChange, mode, feeIds, recordCount, onSuccess }: DeleteFeeDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (feeIds.length === 0) return;
    setDeleting(true);

    // Delete related fee_payments first
    const { error: paymentsError } = await supabase
      .from('fee_payments')
      .delete()
      .in('fee_id', feeIds);

    if (paymentsError) {
      toast({ variant: 'destructive', title: 'Error deleting payments', description: paymentsError.message });
      setDeleting(false);
      return;
    }

    // Delete fees
    const { error } = await supabase
      .from('fees')
      .delete()
      .in('id', feeIds);

    setDeleting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: `${recordCount} fee record${recordCount > 1 ? 's' : ''} deleted` });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'class' ? 'Delete All Class Fees?' : 'Delete Fee Record?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {recordCount} fee record{recordCount > 1 ? 's' : ''} and all associated payment history. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
