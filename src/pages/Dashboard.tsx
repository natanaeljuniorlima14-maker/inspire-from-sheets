import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useMenus } from '@/hooks/useMenus';
import { useProducts } from '@/hooks/useProducts';
import { useKits } from '@/hooks/useKits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Package, 
  DollarSign, 
  TrendingUp,
  ArrowRight,
  Loader2,
  Utensils
} from 'lucide-react';
import Layout from '@/components/Layout';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data: menus, isLoading: menusLoading } = useMenus(currentMonth);
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: kits } = useKits();

  // Generate months for navigation with current selected month first
  const availableMonths = useMemo(() => {
    const months: Date[] = [];
    for (let i = -12; i <= 12; i++) {
      months.push(addMonths(new Date(), i));
    }
    
    const currentMonthStr = format(currentMonth, 'yyyy-MM');
    
    return months.sort((a, b) => {
      const aStr = format(a, 'yyyy-MM');
      const bStr = format(b, 'yyyy-MM');
      
      if (aStr === currentMonthStr) return -1;
      if (bStr === currentMonthStr) return 1;
      
      return a.getTime() - b.getTime();
    });
  }, [currentMonth]);

  const stats = useMemo(() => {
    const totalProducts = products?.length || 0;
    const daysInMonth = endOfMonth(currentMonth).getDate();
    const plannedDays = menus?.length || 0;
    const totalCost = menus?.reduce((sum, m) => sum + m.total_cost, 0) || 0;
    const daysWithCost = menus?.filter(m => m.total_cost > 0).length || 0;
    const averageCost = daysWithCost > 0 ? totalCost / daysWithCost : 0;
    
    return {
      totalProducts,
      plannedDays,
      daysInMonth,
      totalCost,
      averageCost,
    };
  }, [menus, products, currentMonth]);

  const recentMenus = useMemo(() => {
    if (!menus) return [];
    return menus
      .filter(m => m.total_cost > 0)
      .sort((a, b) => new Date(b.menu_date).getTime() - new Date(a.menu_date).getTime())
      .slice(0, 5);
  }, [menus]);

  if (menusLoading || productsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </p>
          </div>
          
          <Select 
            value={format(currentMonth, 'yyyy-MM')}
            onValueChange={(value) => setCurrentMonth(parseISO(value + '-15'))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={format(month, 'yyyy-MM')} value={format(month, 'yyyy-MM')}>
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/products')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Produtos Cadastrados</p>
                  <p className="text-3xl font-bold">{stats.totalProducts}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/calendar')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dias Planejados</p>
                  <p className="text-3xl font-bold">
                    {stats.plannedDays}
                    <span className="text-lg text-muted-foreground font-normal">/{stats.daysInMonth}</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30">
                  <Calendar className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/reports')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Médio</p>
                  <p className="text-3xl font-bold">
                    R$ {stats.averageCost.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total do Mês</p>
                  <p className="text-3xl font-bold">
                    R$ {stats.totalCost.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30">
                  <DollarSign className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Menus */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Cardápios Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentMenus.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum cardápio planejado ainda</p>
                  <Button variant="link" onClick={() => navigate('/calendar')}>
                    Criar primeiro cardápio
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(menu.menu_date), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {menu.description || 'Sem descrição'}
                        </p>
                      </div>
                      <span className="font-mono font-medium text-primary">
                        R$ {menu.total_cost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start h-auto py-4" 
                variant="outline"
                onClick={() => navigate('/products')}
              >
                <div className="p-2 rounded-lg bg-primary/10 mr-3">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Atualizar Preços</p>
                  <p className="text-sm text-muted-foreground">Atualize os preços dos produtos</p>
                </div>
              </Button>
              
              <Button 
                className="w-full justify-start h-auto py-4" 
                variant="outline"
                onClick={() => navigate('/calendar')}
              >
                <div className="p-2 rounded-lg bg-secondary/30 mr-3">
                  <Calendar className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Planejar Cardápio</p>
                  <p className="text-sm text-muted-foreground">Monte o cardápio do mês</p>
                </div>
              </Button>
              
              <Button 
                className="w-full justify-start h-auto py-4" 
                variant="outline"
                onClick={() => navigate('/reports')}
              >
                <div className="p-2 rounded-lg bg-primary/10 mr-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Gerar Relatório</p>
                  <p className="text-sm text-muted-foreground">Exporte o relatório em PDF</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Kits Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kits de Custo Fixo (per capita)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {kits?.filter(k => k.is_default).map((kit) => (
                <div key={kit.id} className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                  <span className="font-medium">{kit.name}</span>
                  <span className="font-mono text-primary">R$ {kit.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
