import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Kit {
  id: string;
  name: string;
  price: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useKits() {
  return useQuery({
    queryKey: ['kits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kits')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Kit[];
    },
  });
}

export function useUpdateKit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { data, error } = await supabase
        .from('kits')
        .update({ price })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast({ title: 'Kit atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar kit', description: error.message, variant: 'destructive' });
    },
  });
}
