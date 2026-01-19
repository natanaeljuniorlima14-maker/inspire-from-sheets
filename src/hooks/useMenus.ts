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
  description: string | null;
  total_cost: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  menu_ingredients?: MenuIngredient[];
  menu_kits?: MenuKit[];
}

export function useMenus(month?: Date) {
  return useQuery({
    queryKey: ['menus', month ? format(month, 'yyyy-MM') : 'all'],
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
    mutationFn: async (menu: { menu_date: string; description: string }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useRemoveKit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_kits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}
