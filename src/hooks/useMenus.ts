import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface MenuIngredient {
  id: string;
  menu_id: string;
  product_id: string;
  per_capita: number;
  cost: number;
  products?: {
    id: string;
    name: string;
    unit: string;
    price: number;
  };
}

export interface MenuKit {
  id: string;
  menu_id: string;
  kit_id: string;
  cost: number;
  kits?: {
    id: string;
    name: string;
    price: number;
  };
}

export interface DailyMenu {
  id: string;
  menu_date: string;
  menu_type_id: string | null;
  description: string | null;
  total_cost: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  menu_ingredients?: MenuIngredient[];
  menu_kits?: MenuKit[];
  menu_types?: {
    id: string;
    name: string;
  };
}

export function useMenus(month?: Date, menuTypeId?: string) {
  return useQuery({
    queryKey: ['menus', month ? format(month, 'yyyy-MM') : 'all', menuTypeId || 'all'],
    queryFn: async () => {
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
              price
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
        .order('menu_date');

      if (month) {
        const startOfMonth = format(month, 'yyyy-MM-01');
        const nextMonth = new Date(month);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endOfMonth = format(nextMonth, 'yyyy-MM-01');
        
        query = query.gte('menu_date', startOfMonth).lt('menu_date', endOfMonth);
      }

      if (menuTypeId) {
        query = query.eq('menu_type_id', menuTypeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DailyMenu[];
    },
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (menu: { menu_date: string; description: string; menu_type_id?: string }) => {
      const { data, error } = await supabase
        .from('daily_menus')
        .insert(menu)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({ title: 'Cardápio criado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar cardápio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDuplicateMenu() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sourceMenuId, targetDate, targetMenuTypeId }: { sourceMenuId: string; targetDate: string; targetMenuTypeId?: string }) => {
      // Get the source menu with all data
      const { data: sourceMenu, error: fetchError } = await supabase
        .from('daily_menus')
        .select(`
          *,
          menu_ingredients (*),
          menu_kits (*)
        `)
        .eq('id', sourceMenuId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check if a menu already exists for this date and type
      const { data: existingMenu } = await supabase
        .from('daily_menus')
        .select('id')
        .eq('menu_date', targetDate)
        .eq('menu_type_id', targetMenuTypeId || sourceMenu.menu_type_id)
        .maybeSingle();
      
      if (existingMenu) {
        throw new Error('Já existe um cardápio para esta data e tipo. Escolha outra data ou tipo.');
      }
      
      // Create new menu
      const { data: newMenu, error: createError } = await supabase
        .from('daily_menus')
        .insert({
          menu_date: targetDate,
          description: sourceMenu.description,
          total_cost: sourceMenu.total_cost,
          menu_type_id: targetMenuTypeId || sourceMenu.menu_type_id,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Copy ingredients
      if (sourceMenu.menu_ingredients?.length > 0) {
        const ingredients = sourceMenu.menu_ingredients.map((ing: MenuIngredient) => ({
          menu_id: newMenu.id,
          product_id: ing.product_id,
          per_capita: ing.per_capita,
          cost: ing.cost,
        }));
        
        const { error: ingredientsError } = await supabase
          .from('menu_ingredients')
          .insert(ingredients);
        
        if (ingredientsError) throw ingredientsError;
      }
      
      // Copy kits
      if (sourceMenu.menu_kits?.length > 0) {
        const kits = sourceMenu.menu_kits.map((kit: MenuKit) => ({
          menu_id: newMenu.id,
          kit_id: kit.kit_id,
          cost: kit.cost,
        }));
        
        const { error: kitsError } = await supabase
          .from('menu_kits')
          .insert(kits);
        
        if (kitsError) throw kitsError;
      }
      
      return newMenu;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({ title: 'Cardápio duplicado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao duplicar cardápio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDuplicateMenuType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sourceTypeId, targetTypeId, month }: { sourceTypeId: string; targetTypeId: string; month: Date }) => {
      const startOfMonth = format(month, 'yyyy-MM-01');
      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endOfMonth = format(nextMonth, 'yyyy-MM-01');
      
      // Get all menus from source type for this month
      const { data: sourceMenus, error: fetchError } = await supabase
        .from('daily_menus')
        .select(`
          *,
          menu_ingredients (*),
          menu_kits (*)
        `)
        .eq('menu_type_id', sourceTypeId)
        .gte('menu_date', startOfMonth)
        .lt('menu_date', endOfMonth);
      
      if (fetchError) throw fetchError;
      if (!sourceMenus || sourceMenus.length === 0) {
        throw new Error('Nenhum cardápio encontrado no tipo de origem.');
      }
      
      let duplicatedCount = 0;
      let skippedCount = 0;
      
      for (const sourceMenu of sourceMenus) {
        // Check if menu already exists for this date and target type
        const { data: existingMenu } = await supabase
          .from('daily_menus')
          .select('id')
          .eq('menu_date', sourceMenu.menu_date)
          .eq('menu_type_id', targetTypeId)
          .maybeSingle();
        
        if (existingMenu) {
          skippedCount++;
          continue;
        }
        
        // Create new menu
        const { data: newMenu, error: createError } = await supabase
          .from('daily_menus')
          .insert({
            menu_date: sourceMenu.menu_date,
            description: sourceMenu.description,
            total_cost: sourceMenu.total_cost,
            menu_type_id: targetTypeId,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        // Copy ingredients
        if (sourceMenu.menu_ingredients?.length > 0) {
          const ingredients = sourceMenu.menu_ingredients.map((ing: MenuIngredient) => ({
            menu_id: newMenu.id,
            product_id: ing.product_id,
            per_capita: ing.per_capita,
            cost: ing.cost,
          }));
          
          await supabase.from('menu_ingredients').insert(ingredients);
        }
        
        // Copy kits
        if (sourceMenu.menu_kits?.length > 0) {
          const kits = sourceMenu.menu_kits.map((kit: MenuKit) => ({
            menu_id: newMenu.id,
            kit_id: kit.kit_id,
            cost: kit.cost,
          }));
          
          await supabase.from('menu_kits').insert(kits);
        }
        
        duplicatedCount++;
      }
      
      return { duplicatedCount, skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({ 
        title: 'Tipo de cardápio duplicado!',
        description: `${result.duplicatedCount} cardápios copiados. ${result.skippedCount > 0 ? `${result.skippedCount} ignorados (já existentes).` : ''}`
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao duplicar tipo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateMenu() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, description, total_cost }: { id: string; description?: string; total_cost?: number }) => {
      const { data, error } = await supabase
        .from('daily_menus')
        .update({ description, total_cost })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar cardápio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteMenu() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_menus')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast({ title: 'Cardápio removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover cardápio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menu_id, product_id, per_capita, cost }: { menu_id: string; product_id: string; per_capita: number; cost: number }) => {
      const { data, error } = await supabase
        .from('menu_ingredients')
        .insert({ menu_id, product_id, per_capita, cost })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useRemoveIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useAddKit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menu_id, kit_id, cost }: { menu_id: string; kit_id: string; cost: number }) => {
      const { data, error } = await supabase
        .from('menu_kits')
        .insert({ menu_id, kit_id, cost })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ menu_id, kit_id, cost }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['menus'] });
      
      // Snapshot current cache for rollback
      const previousMenus = queryClient.getQueryData(['menus']);
      
      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['menus'] }, (old: any) => {
        if (!old) return old;
        return old.map((menu: DailyMenu) => {
          if (menu.id === menu_id) {
            return {
              ...menu,
              menu_kits: [...(menu.menu_kits || []), { id: 'temp-' + kit_id, menu_id, kit_id, cost }],
              total_cost: menu.total_cost + cost,
            };
          }
          return menu;
        });
      });
      
      return { previousMenus };
    },
    onError: (err, variables, context) => {
      if (context?.previousMenus) {
        queryClient.setQueriesData({ queryKey: ['menus'] }, context.previousMenus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useRemoveKit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, menu_id, cost }: { id: string; menu_id: string; cost: number }) => {
      const { error } = await supabase
        .from('menu_kits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async ({ id, menu_id, cost }) => {
      await queryClient.cancelQueries({ queryKey: ['menus'] });
      
      const previousMenus = queryClient.getQueryData(['menus']);
      
      queryClient.setQueriesData({ queryKey: ['menus'] }, (old: any) => {
        if (!old) return old;
        return old.map((menu: DailyMenu) => {
          if (menu.id === menu_id) {
            return {
              ...menu,
              menu_kits: (menu.menu_kits || []).filter((k: MenuKit) => k.id !== id),
              total_cost: Math.max(0, menu.total_cost - cost),
            };
          }
          return menu;
        });
      });
      
      return { previousMenus };
    },
    onError: (err, variables, context) => {
      if (context?.previousMenus) {
        queryClient.setQueriesData({ queryKey: ['menus'] }, context.previousMenus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}
