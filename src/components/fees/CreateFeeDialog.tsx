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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Users, User, CreditCard, Bell } from 'lucide-react';

const FEE_TYPES = [
  'Tuition', 'Transport', 'Lab', 'Exam', 'Library', 'Sports',
  'Uniform', 'Admission', 'Unit 1 Fees', 'Unit 2 Fees',
  'Unit 3 Fees', 'Unit 4 Fees', 'Custom'
];

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

  const [assignMode, setAssignMode] = useState<'class' | 'student'>('class');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feeType, setFeeType] = useState('');
  const [customFeeType, setCustomFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [enableReminder, setEnableReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState('3');

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
    setEnableReminder(true);
    setReminderDays('3');
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
    const finalFeeType = feeType === 'Custom' ? customFeeType.trim() : feeType;
    if (!finalFeeType || !dueDate || !selectedClassId) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select fee type, class, and due date' });
      return;
    }

    const numAmount = amount ? parseFloat(amount) : 0;
    if (amount && (isNaN(numAmount) || numAmount < 0)) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Amount must be a valid number' });
      return;
    }

    if (numAmount > 10000000) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Amount exceeds maximum limit' });
      return;
    }

    setLoading(true);

    try {
      const baseFee = {
        fee_type: finalFeeType,
        amount: numAmount,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        reminder_days_before: enableReminder ? parseInt(reminderDays) || 3 : 0,
      };

      if (assignMode === 'student') {
        if (!selectedStudentId) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please select a student' });
          setLoading(false);
          return;
        }

        const { error } = await supabase.from('fees').insert({
          ...baseFee,
          student_id: selectedStudentId,
        });

        if (error) throw error;
        toast({ title: 'Fee Created', description: `${finalFeeType} fee assigned to student` });
      } else {
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
          ...baseFee,
          student_id: s.id,
        }));

        const { error } = await supabase.from('fees').insert(feeRecords);
        if (error) throw error;

        toast({ title: 'Fees Created', description: `${finalFeeType} fee assigned to ${classStudents.length} students` });
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Fee Type - Button Grid */}
          <div className="space-y-1.5">
            <Label>Fee Type *</Label>
            <div className="grid grid-cols-3 gap-2">
              {FEE_TYPES.map(t => (
                <Button
                  key={t}
                  type="button"
                  variant={feeType === t ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => { setFeeType(t); if (t !== 'Custom') setCustomFeeType(''); }}
                >
                  {t}
                </Button>
              ))}
            </div>
            {feeType === 'Custom' && (
              <Input
                placeholder="Enter custom fee type name"
                value={customFeeType}
                onChange={(e) => setCustomFeeType(e.target.value)}
                maxLength={50}
                className="mt-2"
              />
            )}
          </div>

          {/* Amount (optional) */}
          <div className="space-y-1.5">
            <Label>Amount (₹) <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="number"
              placeholder="Enter amount (leave empty if not decided)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
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

          {/* Reminder Toggle */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <Label className="cursor-pointer">Send reminder to parents</Label>
              </div>
              <Switch checked={enableReminder} onCheckedChange={setEnableReminder} />
            </div>
            {enableReminder && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  min="1"
                  max="30"
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days before due date</span>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedClassId && feeType && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <p className="font-medium">Summary:</p>
              <p className="text-muted-foreground">
                {assignMode === 'class'
                  ? `Assign ${feeType === 'Custom' ? customFeeType : feeType} fee${amount ? ` of ₹${parseFloat(amount || '0').toLocaleString()}` : ''} to all students in ${classes.find(c => c.id === selectedClassId)?.name} - ${classes.find(c => c.id === selectedClassId)?.section}`
                  : `Assign ${feeType === 'Custom' ? customFeeType : feeType} fee${amount ? ` of ₹${parseFloat(amount || '0').toLocaleString()}` : ''} to ${students.find(s => s.id === selectedStudentId)?.full_name || 'selected student'}`
                }
                {enableReminder && ` • Reminder ${reminderDays} days before`}
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
