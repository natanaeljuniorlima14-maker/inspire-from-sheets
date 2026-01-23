import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'pcp' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export function useUserRole() {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async (): Promise<UserRole[]> => {
      if (!user) return [];
      
      // Direct query to user_roles table using type assertion
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      return (data || []) as UserRole[];
    },
    enabled: !!user,
  });

  const isAdmin = roles?.some((r) => r.role === 'admin') ?? false;
  const isPcp = roles?.some((r) => r.role === 'pcp') ?? false;
  const isUser = roles?.some((r) => r.role === 'user') ?? false;
  const canEdit = isAdmin || isPcp;

  return {
    roles,
    isAdmin,
    isPcp,
    isUser,
    canEdit,
    isLoading,
    hasRole: (role: AppRole) => roles?.some((r) => r.role === role) ?? false,
  };
}
