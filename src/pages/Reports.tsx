import { useMemo, useState, useRef } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMenus } from '@/hooks/useMenus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Loader2,
  Calendar,
  TrendingUp,
  DollarSign,
  Utensils
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Layout from '@/components/Layout';

const COLORS = ['hsl(142, 55%, 40%)', 'hsl(35, 90%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(0, 72%, 51%)'];

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { data: menus, isLoading } = useMenus(selectedMonth);

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      result.push(subMonths(new Date(), i));
    }
    return result;
  }, []);

  const stats = useMemo(() => {
    if (!menus || menus.length === 0) {
      return {
        totalCost: 0,
        averageCost: 0,
        daysPlanned: 0,
        totalDays: 0,
      };
    }

    const totalCost = menus.reduce((sum, m) => sum + m.total_cost, 0);
    const daysWithCost = menus.filter(m => m.total_cost > 0).length;
    
    return {
      totalCost,
      averageCost: daysWithCost > 0 ? totalCost / daysWithCost : 0,
      daysPlanned: menus.length,
      totalDays: endOfMonth(selectedMonth).getDate(),
    };
  }, [menus, selectedMonth]);

  const dailyData = useMemo(() => {
    if (!menus) return [];
    
    return menus
      .filter(m => m.total_cost > 0)
      .map(m => ({
        date: format(new Date(m.menu_date), 'dd/MM'),
        cost: m.total_cost,
        description: m.description || 'Sem descrição',
      }))
      .slice(0, 15);
  }, [menus]);

  const categoryData = useMemo(() => {
    if (!menus) return [];
    
    const categoryMap = new Map<string, number>();
    
    menus.forEach(menu => {
      menu.menu_ingredients?.forEach(ingredient => {
        const category = 'Ingredientes';
        categoryMap.set(category, (categoryMap.get(category) || 0) + ingredient.cost);
      });
      menu.menu_kits?.forEach(kit => {
        const name = kit.kits?.name || 'Kit';
        categoryMap.set(name, (categoryMap.get(name) || 0) + kit.cost);
      });
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [menus]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Cardápio - ${format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #166534; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #166534; color: white; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat-card { padding: 15px; background: #f0fdf4; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #166534; }
        </style>
      </head>
      <body>
        <h1>Relatório de Cardápio Escolar</h1>
        <h2>${format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
        
        <div class="stats">
          <div class="stat-card">
            <div>Custo Total</div>
            <div class="stat-value">R$ ${stats.totalCost.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div>Custo Médio</div>
            <div class="stat-value">R$ ${stats.averageCost.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div>Dias Planejados</div>
            <div class="stat-value">${stats.daysPlanned}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Custo per Capita</th>
            </tr>
          </thead>
          <tbody>
            ${menus?.map(m => `
              <tr>
                <td>${format(new Date(m.menu_date), 'dd/MM/yyyy')}</td>
                <td>${m.description || '-'}</td>
                <td>R$ ${m.total_cost.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
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

  return (
    <Layout>
      <div className="space-y-6" ref={reportRef}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Análise de custos dos cardápios</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select 
              value={format(selectedMonth, 'yyyy-MM')}
              onValueChange={(value) => setSelectedMonth(new Date(value + '-01'))}
            >
              <SelectTrigger className="w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={format(month, 'yyyy-MM')} value={format(month, 'yyyy-MM')}>
                    {format(month, 'MMMM yyyy', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold">R$ {stats.totalCost.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <TrendingUp className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Médio</p>
                  <p className="text-2xl font-bold">R$ {stats.averageCost.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Utensils className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dias Planejados</p>
                  <p className="text-2xl font-bold">{stats.daysPlanned} / {stats.totalDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <FileText className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meta per Capita</p>
                  <p className="text-2xl font-bold">R$ 3,18</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custo Diário</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Custo']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Bar dataKey="cost" fill="hsl(142, 55%, 40%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição de Custos</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhamento do Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ingredientes</TableHead>
                    <TableHead className="text-right">Custo per Capita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menus?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum cardápio planejado para este mês
                      </TableCell>
                    </TableRow>
                  ) : (
                    menus?.map((menu) => (
                      <TableRow key={menu.id}>
                        <TableCell className="font-medium">
                          {format(new Date(menu.menu_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {menu.description || '-'}
                        </TableCell>
                        <TableCell>
                          {menu.menu_ingredients?.length || 0} itens
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {menu.total_cost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
