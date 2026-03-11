import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, History } from 'lucide-react';

interface ChildOption {
  id: string;
  full_name: string;
  admission_number: string;
  status: string | null;
  classes: { name: string; section: string } | null;
}

interface ChildSelectorProps {
  children: ChildOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function ChildSelector({ children, selectedId, onSelect }: ChildSelectorProps) {
  const activeChildren = children.filter(c => c.status === 'active');
  const historicalChildren = children.filter(c => c.status === 'promoted');

  if (activeChildren.length <= 1 && historicalChildren.length === 0) return null;

  const selected = children.find(c => c.id === selectedId);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedId} onValueChange={onSelect}>
        <SelectTrigger className="w-full sm:w-[280px] h-9 text-xs sm:text-sm">
          <SelectValue>
            {selected && (
              <span className="flex items-center gap-1.5">
                {selected.status === 'promoted' && <History className="h-3 w-3 text-muted-foreground" />}
                {selected.full_name} — {selected.classes ? `${selected.classes.name}-${selected.classes.section}` : 'N/A'}
                {selected.status === 'promoted' && ' (Past)'}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeChildren.length > 0 && (
            <>
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Current</p>
              {activeChildren.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-3 w-3 text-primary" />
                    {c.full_name} — {c.classes ? `${c.classes.name}-${c.classes.section}` : 'N/A'}
                  </span>
                </SelectItem>
              ))}
            </>
          )}
          {historicalChildren.length > 0 && (
            <>
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase mt-1">Previous Years</p>
              {historicalChildren.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <History className="h-3 w-3" />
                    {c.full_name} — {c.classes ? `${c.classes.name}-${c.classes.section}` : 'N/A'}
                  </span>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
