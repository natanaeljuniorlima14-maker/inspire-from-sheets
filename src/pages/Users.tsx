import { useState } from 'react';
import { useUsers, useSetUserRole, AppRole } from '@/hooks/useUsers';
import { useUserRole } from '@/hooks/useUserRole';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users as UsersIcon, Shield, UserCog, User as UserIcon } from 'lucide-react';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  pcp: 'PCP',
  user: 'Usuário',
};

const roleDescriptions: Record<string, string> = {
  admin: 'Acesso total ao sistema, incluindo gerenciamento de usuários',
  pcp: 'Pode criar e editar produtos, cardápios e categorias',
  user: 'Visualização de cardápios e relatórios apenas',
};

const roleIcons: Record<string, any> = {
  admin: Shield,
  pcp: UserCog,
  user: UserIcon,
};

const roleBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  pcp: 'secondary',
  user: 'outline',
};

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const { isAdmin } = useUserRole();
  const setUserRole = useSetUserRole();

  const handleRoleChange = (userId: string, role: string) => {
    const newRole = role === 'none' ? null : (role as AppRole);
    setUserRole.mutate({ userId, role: newRole });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Shield className="h-12 w-12 mb-4 opacity-50" />
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">Defina as permissões de cada usuário do sistema</p>
        </div>

        {/* Role Legend */}
        <div className="grid gap-4 sm:grid-cols-3">
          {['admin', 'pcp', 'user'].map((role) => {
            const Icon = roleIcons[role];
            return (
              <Card key={role} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{roleLabels[role]}</p>
                      <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {(user.full_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {user.role && (
                      <Badge variant={roleBadgeVariants[user.role] || 'outline'}>
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    )}
                    
                    <Select
                      value={user.role || 'none'}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={setUserRole.isPending}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem permissão</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="pcp">PCP</SelectItem>
                        <SelectItem value="user">Usuário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              
              {(!users || users.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum usuário cadastrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
