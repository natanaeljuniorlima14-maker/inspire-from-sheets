import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'admin' | 'pcp' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  created_at: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // Get all roles (admin can see all)
      const { data: roles, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      // Build users list with roles
      const roleMap = new Map<string, AppRole>();
      (roles || []).forEach((r: any) => {
        roleMap.set(r.user_id, r.role);
      });

      return (profiles || []).map((profile: any) => ({
        id: profile.user_id,
        email: profile.full_name ? `${profile.full_name}` : 'Sem nome',
        full_name: profile.full_name,
        role: roleMap.get(profile.user_id) || null,
        created_at: profile.created_at,
      }));
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole | null }) => {
      // First, delete existing role
      await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // If role is not null, insert new role
      if (role) {
        const { error } = await (supabase as any)
          .from('user_roles')
          .insert({ user_id: userId, role });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({ title: 'Permissão atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar permissão', description: error.message, variant: 'destructive' });
    },
  });
}
