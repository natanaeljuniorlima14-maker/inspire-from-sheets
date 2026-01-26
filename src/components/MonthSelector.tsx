import { useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MonthSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
  range?: number;
  className?: string;
  triggerClassName?: string;
}

export function MonthSelector({ value, onChange, range = 12, triggerClassName }: MonthSelectorProps) {
  const currentValueStr = format(value, 'yyyy-MM');

  // Generate months in chronological order
  const months = useMemo(() => {
    const result: Date[] = [];
    for (let i = -range; i <= range; i++) {
      result.push(addMonths(new Date(), i));
    }
    return result;
  }, [range]);

  const handleValueChange = (val: string) => {
    const [year, month] = val.split('-').map(Number);
    onChange(new Date(year, month - 1, 15));
  };

  return (
    <Select value={currentValueStr} onValueChange={handleValueChange}>
      <SelectTrigger className={cn('w-48', triggerClassName)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-64">
          <div className="p-1">
            {months.map((month) => {
              const monthStr = format(month, 'yyyy-MM');
              return (
                <SelectItem key={monthStr} value={monthStr}>
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </SelectItem>
              );
            })}
          </div>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
