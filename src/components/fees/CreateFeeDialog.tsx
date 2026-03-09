import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Users, User } from 'lucide-react';

const FEE_TYPES = ['Tuition', 'Transport', 'Lab', 'Exam', 'Library', 'Sports', 'Uniform', 'Admission', 'Other'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateFeeDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string; admission_number: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form state
  const [assignMode, setAssignMode] = useState<'class' | 'student'>('class');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feeType, setFeeType] = useState('');
  const [customFeeType, setCustomFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();

  useEffect(() => {
    if (open) {
      fetchClasses();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClassId && assignMode === 'student') {
      fetchStudentsByClass(selectedClassId);
    }
  }, [selectedClassId, assignMode]);

  const resetForm = () => {
    setAssignMode('class');
    setSelectedClassId('');
    setSelectedStudentId('');
    setFeeType('');
    setCustomFeeType('');
    setAmount('');
    setDueDate(undefined);
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('id, name, section').order('name');
    if (data) setClasses(data);
  };

  const fetchStudentsByClass = async (classId: string) => {
    setLoadingStudents(true);
    const { data } = await supabase
      .from('students')
      .select('id, full_name, admission_number')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('full_name');
    if (data) setStudents(data);
    setLoadingStudents(false);
  };

  const handleSubmit = async () => {
    const finalFeeType = feeType === 'Other' ? customFeeType.trim() : feeType;
    if (!finalFeeType || !amount || !dueDate || !selectedClassId) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill all required fields' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Amount must be a positive number' });
      return;
    }

    if (numAmount > 10000000) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Amount exceeds maximum limit' });
      return;
    }

    setLoading(true);

    try {
      if (assignMode === 'student') {
        if (!selectedStudentId) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please select a student' });
          setLoading(false);
          return;
        }

        const { error } = await supabase.from('fees').insert({
          student_id: selectedStudentId,
          fee_type: finalFeeType,
          amount: numAmount,
          due_date: format(dueDate, 'yyyy-MM-dd'),
        });

        if (error) throw error;
        toast({ title: 'Fee Created', description: `₹${numAmount.toLocaleString()} ${finalFeeType} fee assigned to student` });
      } else {
        // Bulk assign to all students in class
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', selectedClassId)
          .eq('status', 'active');

        if (!classStudents || classStudents.length === 0) {
          toast({ variant: 'destructive', title: 'No Students', description: 'No active students found in this class' });
          setLoading(false);
          return;
        }

        const feeRecords = classStudents.map(s => ({
          student_id: s.id,
          fee_type: finalFeeType,
          amount: numAmount,
          due_date: format(dueDate, 'yyyy-MM-dd'),
        }));

        const { error } = await supabase.from('fees').insert(feeRecords);
        if (error) throw error;

        toast({ title: 'Fees Created', description: `₹${numAmount.toLocaleString()} ${finalFeeType} fee assigned to ${classStudents.length} students` });
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Create Fee</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assign Mode Toggle */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Button
              variant={assignMode === 'class' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setAssignMode('class'); setSelectedStudentId(''); }}
              className="flex items-center gap-1"
            >
              <Users className="h-4 w-4" /> Entire Class
            </Button>
            <Button
              variant={assignMode === 'student' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAssignMode('student')}
              className="flex items-center gap-1"
            >
              <User className="h-4 w-4" /> Individual Student
            </Button>
          </div>

          {/* Class Selection */}
          <div className="space-y-1.5">
            <Label>Class *</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Selection (individual mode) */}
          {assignMode === 'student' && selectedClassId && (
            <div className="space-y-1.5">
              <Label>Student *</Label>
              {loadingStudents ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading students...
                </div>
              ) : (
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.admission_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Fee Type */}
          <div className="space-y-1.5">
            <Label>Fee Type *</Label>
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger><SelectValue placeholder="Select fee type" /></SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {feeType === 'Other' && (
              <Input
                placeholder="Enter custom fee type"
                value={customFeeType}
                onChange={(e) => setCustomFeeType(e.target.value)}
                maxLength={50}
                className="mt-2"
              />
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="10000000"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Summary */}
          {selectedClassId && amount && feeType && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <p className="font-medium">Summary:</p>
              <p className="text-muted-foreground">
                {assignMode === 'class'
                  ? `Assign ₹${parseFloat(amount || '0').toLocaleString()} ${feeType === 'Other' ? customFeeType : feeType} fee to all students in ${classes.find(c => c.id === selectedClassId)?.name} - ${classes.find(c => c.id === selectedClassId)?.section}`
                  : `Assign ₹${parseFloat(amount || '0').toLocaleString()} ${feeType === 'Other' ? customFeeType : feeType} fee to ${students.find(s => s.id === selectedStudentId)?.full_name || 'selected student'}`
                }
              </p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
            {assignMode === 'class' ? 'Assign to Entire Class' : 'Assign to Student'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
