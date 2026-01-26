import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MenuType {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMenuTypes() {
  return useQuery({
    queryKey: ['menu-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_types')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as MenuType[];
    },
  });
}

export function useCreateMenuType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('menu_types')
        .insert({ name, description })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-types'] });
      toast({ title: 'Tipo de cardápio criado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar tipo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateMenuType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('menu_types')
        .update({ name, description })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-types'] });
      toast({ title: 'Tipo atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteMenuType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if there are menus using this type
      const { data: menusWithType } = await supabase
        .from('daily_menus')
        .select('id')
        .eq('menu_type_id', id)
        .limit(1);
      
      if (menusWithType && menusWithType.length > 0) {
        throw new Error('Não é possível excluir este tipo pois existem cardápios associados a ele. Remova os cardápios primeiro.');
      }
      
      // Delete the menu type (RLS will enforce admin-only)
      const { error } = await supabase
        .from('menu_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-types'] });
      toast({ title: 'Tipo de cardápio removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover tipo', description: error.message, variant: 'destructive' });
    },
  });
}
