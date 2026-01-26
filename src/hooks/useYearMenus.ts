import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DailyMenu } from './useMenus';

export function useYearMenus(year: number, menuTypeId?: string) {
  return useQuery({
    queryKey: ['menus-year', year, menuTypeId || 'all'],
    queryFn: async () => {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year + 1}-01-01`;
      
      let query = supabase
        .from('daily_menus')
        .select(`
          *,
          menu_ingredients (
            *,
            products (
              id,
              name,
              unit,
              price,
              category_id,
              categories:category_id (
                id,
                name
              )
            )
          ),
          menu_kits (
            *,
            kits (
              id,
              name,
              price
            )
          ),
          menu_types (
            id,
            name
          )
        `)
        .gte('menu_date', startOfYear)
        .lt('menu_date', endOfYear)
        .order('menu_date');

      if (menuTypeId) {
        query = query.eq('menu_type_id', menuTypeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DailyMenu[];
    },
  });
}
