import { useMemo } from 'react';
import { addMonths, format, isSameMonth } from 'date-fns';

export function useSortedMonths(currentMonth: Date, range: number = 12) {
  return useMemo(() => {
    const months: Date[] = [];
    for (let i = -range; i <= range; i++) {
      months.push(addMonths(new Date(), i));
    }
    
    // Sort so current month is first, then sort the rest by date
    const currentMonthStr = format(currentMonth, 'yyyy-MM');
    
    return months.sort((a, b) => {
      const aStr = format(a, 'yyyy-MM');
      const bStr = format(b, 'yyyy-MM');
      
      // Current month always first
      if (aStr === currentMonthStr) return -1;
      if (bStr === currentMonthStr) return 1;
      
      // Then sort chronologically
      return a.getTime() - b.getTime();
    });
  }, [currentMonth, range]);
}
