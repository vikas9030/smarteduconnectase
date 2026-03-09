import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, IndianRupee, AlertCircle } from 'lucide-react';

interface FeeRecord {
  id: string;
  student_id: string;
  fee_type: string;
  amount: number;
  discount: number | null;
  paid_amount: number | null;
  due_date: string;
  payment_status: string;
  students?: { full_name: string; admission_number: string; classes?: { name: string; section: string; id?: string } | null } | null;
}

interface ClassInfo {
  id: string;
  name: string;
  section: string;
}

interface Props {
  fees: FeeRecord[];
  classes: ClassInfo[];
  onClassSelect: (classId: string) => void;
}

export default function ClassSummaryView({ fees, classes, onClassSelect }: Props) {
  const classSummaries = classes.map((cls) => {
    const classFees = fees.filter(f => {
      const studentClass = f.students?.classes;
      if (!studentClass) return false;
      return `${studentClass.name}-${studentClass.section}` === `${cls.name}-${cls.section}`;
    });

    const uniqueStudents = new Set(classFees.map(f => f.student_id)).size;
    const totalFees = classFees.reduce((s, f) => s + f.amount, 0);
    const totalDiscount = classFees.reduce((s, f) => s + (f.discount || 0), 0);
    const totalCollected = classFees.reduce((s, f) => s + (f.paid_amount || 0), 0);
    const totalDue = totalFees - totalDiscount - totalCollected;
    const overdueCount = classFees.filter(f => f.payment_status !== 'paid' && new Date(f.due_date) < new Date()).length;

    return { cls, uniqueStudents, totalFees, totalCollected, totalDue, overdueCount };
  }).filter(s => s.uniqueStudents > 0);

  if (classSummaries.length === 0) {
    return <p className="text-center py-12 text-muted-foreground">No fee data available by class.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {classSummaries.map(({ cls, uniqueStudents, totalFees, totalCollected, totalDue, overdueCount }) => (
        <Card
          key={cls.id}
          className="card-elevated cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
          onClick={() => onClassSelect(cls.id)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center justify-between">
              {cls.name} - {cls.section}
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {uniqueStudents}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Fees</span>
              <span className="font-medium flex items-center"><IndianRupee className="h-3 w-3" />{totalFees.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-medium text-green-600 flex items-center"><IndianRupee className="h-3 w-3" />{totalCollected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due</span>
              <span className="font-medium text-red-600 flex items-center"><IndianRupee className="h-3 w-3" />{totalDue.toLocaleString()}</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 text-destructive text-xs pt-1">
                <AlertCircle className="h-3 w-3" /> {overdueCount} overdue
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
