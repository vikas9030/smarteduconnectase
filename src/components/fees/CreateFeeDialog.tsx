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
import { CalendarIcon, Loader2, Users, User, CreditCard, Bell, X } from 'lucide-react';

const FEE_TYPES = [
  'Tuition', 'Transport', 'Lab', 'Exam', 'Library', 'Sports',
  'Uniform', 'Admission', 'Unit 1 Fees', 'Unit 2 Fees',
  'Unit 3 Fees', 'Unit 4 Fees',
];

interface FeeEntry {
  type: string;
  amount: string;
}

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
  const [feeEntries, setFeeEntries] = useState<FeeEntry[]>([]);
  const [customFeeType, setCustomFeeType] = useState('');
  const [customFeeAmount, setCustomFeeAmount] = useState('');
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
    setFeeEntries([]);
    setCustomFeeType('');
    setCustomFeeAmount('');
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

  const toggleFeeType = (type: string) => {
    setFeeEntries(prev => {
      const exists = prev.find(e => e.type === type);
      if (exists) return prev.filter(e => e.type !== type);
      return [...prev, { type, amount: '' }];
    });
  };

  const updateFeeAmount = (type: string, amount: string) => {
    setFeeEntries(prev => prev.map(e => e.type === type ? { ...e, amount } : e));
  };

  const addCustomFee = () => {
    const name = customFeeType.trim();
    if (!name) return;
    if (feeEntries.find(e => e.type === name)) {
      toast({ variant: 'destructive', title: 'Duplicate', description: 'This fee type is already added' });
      return;
    }
    setFeeEntries(prev => [...prev, { type: name, amount: customFeeAmount }]);
    setCustomFeeType('');
    setCustomFeeAmount('');
  };

  const removeFeeEntry = (type: string) => {
    setFeeEntries(prev => prev.filter(e => e.type !== type));
  };

  const totalAmount = feeEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const handleSubmit = async () => {
    if (feeEntries.length === 0) {
      toast({ variant: 'destructive', title: 'No Fee Types', description: 'Please select at least one fee type' });
      return;
    }
    if (!dueDate || !selectedClassId) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select class and due date' });
      return;
    }

    for (const entry of feeEntries) {
      const amt = entry.amount ? parseFloat(entry.amount) : 0;
      if (entry.amount && (isNaN(amt) || amt < 0)) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: `Invalid amount for ${entry.type}` });
        return;
      }
    }

    setLoading(true);
    try {
      let studentIds: string[] = [];

      if (assignMode === 'student') {
        if (!selectedStudentId) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please select a student' });
          setLoading(false);
          return;
        }
        studentIds = [selectedStudentId];
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
        studentIds = classStudents.map(s => s.id);
      }

      const dueDateStr = format(dueDate, 'yyyy-MM-dd');
      const reminderDaysBefore = enableReminder ? parseInt(reminderDays) || 3 : 0;

      // Build all fee records: each fee type × each student
      const feeRecords = studentIds.flatMap(sid =>
        feeEntries.map(entry => ({
          student_id: sid,
          fee_type: entry.type,
          amount: parseFloat(entry.amount) || 0,
          due_date: dueDateStr,
          reminder_days_before: reminderDaysBefore,
        }))
      );

      const { error } = await supabase.from('fees').insert(feeRecords);
      if (error) throw error;

      toast({
        title: 'Fees Created',
        description: `${feeEntries.length} fee type(s) assigned to ${studentIds.length} student(s)`,
      });

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
          {/* Assign Mode */}
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

          {/* Class */}
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

          {/* Student (individual mode) */}
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

          {/* Fee Type Buttons */}
          <div className="space-y-1.5">
            <Label>Select Fee Types * <span className="text-muted-foreground text-xs">(click to add)</span></Label>
            <div className="grid grid-cols-3 gap-2">
              {FEE_TYPES.map(t => (
                <Button
                  key={t}
                  type="button"
                  variant={feeEntries.some(e => e.type === t) ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => toggleFeeType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Fee Type */}
          <div className="space-y-1.5">
            <Label>Add Custom Fee Type</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Custom name"
                value={customFeeType}
                onChange={(e) => setCustomFeeType(e.target.value)}
                maxLength={50}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="₹ Amount"
                value={customFeeAmount}
                onChange={(e) => setCustomFeeAmount(e.target.value)}
                min="0"
                className="w-28"
              />
              <Button type="button" size="sm" onClick={addCustomFee} disabled={!customFeeType.trim()}>
                Add
              </Button>
            </div>
          </div>

          {/* Selected Fee Entries with Individual Amounts */}
          {feeEntries.length > 0 && (
            <div className="space-y-2">
              <Label>Fee Amounts <span className="text-muted-foreground text-xs">(optional per type)</span></Label>
              {feeEntries.map(entry => (
                <div key={entry.type} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                  <span className="text-sm font-medium flex-1 truncate">{entry.type}</span>
                  <Input
                    type="number"
                    placeholder="₹ Amount"
                    value={entry.amount}
                    onChange={(e) => updateFeeAmount(entry.type, e.target.value)}
                    min="0"
                    className="w-28 h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFeeEntry(entry.type)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {totalAmount > 0 && (
                <div className="text-sm font-medium text-right text-primary">
                  Total: ₹{totalAmount.toLocaleString()}
                </div>
              )}
            </div>
          )}

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

          {/* Reminder */}
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
          {selectedClassId && feeEntries.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm space-y-1">
              <p className="font-medium">Summary:</p>
              <p className="text-muted-foreground">
                {feeEntries.length} fee type(s){totalAmount > 0 ? ` totalling ₹${totalAmount.toLocaleString()}` : ''} →{' '}
                {assignMode === 'class'
                  ? `all students in ${classes.find(c => c.id === selectedClassId)?.name} - ${classes.find(c => c.id === selectedClassId)?.section}`
                  : students.find(s => s.id === selectedStudentId)?.full_name || 'selected student'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {feeEntries.map(e => `${e.type}${e.amount ? `: ₹${parseFloat(e.amount).toLocaleString()}` : ''}`).join(' • ')}
              </p>
              {enableReminder && (
                <p className="text-xs text-muted-foreground">📢 Reminder {reminderDays} days before due date</p>
              )}
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
