import { useMemo, useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useYearMenus } from '@/hooks/useYearMenus';
import { useMenuTypes } from '@/hooks/useMenuTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Loader2,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Layout from '@/components/Layout';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const COLORS = ['hsl(142, 55%, 40%)', 'hsl(35, 90%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(170, 60%, 40%)', 'hsl(320, 60%, 50%)', 'hsl(60, 70%, 45%)'];

export default function AnnualReport() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMenuTypeId, setSelectedMenuTypeId] = useState<string>('all');
  const [selectedComparisonTypeIds, setSelectedComparisonTypeIds] = useState<string[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { data: menuTypes } = useMenuTypes();
  const { data: menus, isLoading } = useYearMenus(selectedYear, selectedMenuTypeId === 'all' ? undefined : selectedMenuTypeId);
  const { data: allMenus } = useYearMenus(selectedYear); // All menus for comparison

  // Generate available years (5 years back and 2 forward)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = -5; i <= 2; i++) {
      years.push(currentYear + i);
    }
    return years;
  }, [currentYear]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    if (!menus) return [];
    
    const monthStats = MONTHS.map((name, index) => ({
      name,
      month: index + 1,
      totalCost: 0,
      daysPlanned: 0,
      averageCost: 0,
    }));
    
    menus.forEach(menu => {
      const menuDate = parseISO(menu.menu_date);
      const monthIndex = menuDate.getMonth();
      monthStats[monthIndex].totalCost += menu.total_cost;
      if (menu.total_cost > 0) {
        monthStats[monthIndex].daysPlanned++;
      }
    });
    
    monthStats.forEach(stat => {
      stat.averageCost = stat.daysPlanned > 0 ? stat.totalCost / stat.daysPlanned : 0;
    });
    
    return monthStats;
  }, [menus]);

  // Annual stats
  const annualStats = useMemo(() => {
    const totalCost = monthlyData.reduce((sum, m) => sum + m.totalCost, 0);
    const totalDays = monthlyData.reduce((sum, m) => sum + m.daysPlanned, 0);
    const averageCost = totalDays > 0 ? totalCost / totalDays : 0;
    
    // Find most expensive and cheapest months
    const monthsWithData = monthlyData.filter(m => m.daysPlanned > 0);
    const mostExpensive = monthsWithData.length > 0 
      ? monthsWithData.reduce((max, m) => m.averageCost > max.averageCost ? m : max)
      : null;
    const cheapest = monthsWithData.length > 0
      ? monthsWithData.reduce((min, m) => m.averageCost < min.averageCost ? m : min)
      : null;
    
    return {
      totalCost,
      totalDays,
      averageCost,
      mostExpensive,
      cheapest,
    };
  }, [monthlyData]);

  // Category costs (food groups)
  const categoryData = useMemo(() => {
    if (!menus) return [];
    
    const categoryMap = new Map<string, number>();
    
    menus.forEach(menu => {
      menu.menu_ingredients?.forEach((ingredient: any) => {
        const categoryName = ingredient.products?.categories?.name || 'Sem categoria';
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + ingredient.cost);
      });
    });
    
    // Convert to array and sort by value descending
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [menus]);

  // Comparison data by menu type
  const comparisonByTypeAndMonth = useMemo(() => {
    if (!allMenus || !menuTypes) return [];
    
    const typesToShow = selectedComparisonTypeIds.length > 0 
      ? menuTypes.filter(t => selectedComparisonTypeIds.includes(t.id))
      : menuTypes;
    
    // Create monthly data for each type
    return MONTHS.map((monthName, monthIndex) => {
      const result: Record<string, any> = { name: monthName.slice(0, 3) };
      
      typesToShow.forEach(type => {
        const typeMenus = allMenus.filter(menu => {
          const menuDate = parseISO(menu.menu_date);
          return menuDate.getMonth() === monthIndex && menu.menu_type_id === type.id;
        });
        
        const totalCost = typeMenus.reduce((sum, m) => sum + m.total_cost, 0);
        const daysWithCost = typeMenus.filter(m => m.total_cost > 0).length;
        result[type.name] = daysWithCost > 0 ? totalCost / daysWithCost : 0;
      });
      
      return result;
    });
  }, [allMenus, menuTypes, selectedComparisonTypeIds]);

  const handleToggleComparisonType = (typeId: string) => {
    setSelectedComparisonTypeIds(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleExportPDF = async () => {
    const typeName = selectedMenuTypeId === 'all' 
      ? 'Todos os Tipos' 
      : menuTypes?.find(t => t.id === selectedMenuTypeId)?.name || 'Cardápio';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Anual - ${selectedYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #166534; }
          h2 { color: #333; margin-top: 20px; }
          h3 { color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #166534; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
          .stat-card { padding: 15px; background: #f0fdf4; border-radius: 8px; min-width: 150px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #166534; }
        </style>
      </head>
      <body>
        <h1>Relatório Anual de Cardápio Escolar</h1>
        <h2>${selectedYear} - ${typeName}</h2>
        
        <div class="stats">
          <div class="stat-card">
            <div>Custo Total Anual</div>
            <div class="stat-value">R$ ${annualStats.totalCost.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div>Custo Médio Anual</div>
            <div class="stat-value">R$ ${annualStats.averageCost.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div>Total de Dias Planejados</div>
            <div class="stat-value">${annualStats.totalDays}</div>
          </div>
        </div>

        ${annualStats.mostExpensive ? `
        <p><strong>Mês mais caro:</strong> ${annualStats.mostExpensive.name} (R$ ${annualStats.mostExpensive.averageCost.toFixed(2)} médio)</p>
        ` : ''}
        ${annualStats.cheapest ? `
        <p><strong>Mês mais barato:</strong> ${annualStats.cheapest.name} (R$ ${annualStats.cheapest.averageCost.toFixed(2)} médio)</p>
        ` : ''}

        ${categoryData.length > 0 ? `
        <h3>Custos por Grupo Alimentar</h3>
        <table>
          <thead>
            <tr>
              <th>Grupo Alimentar</th>
              <th>Custo Total</th>
              <th>% do Total</th>
            </tr>
          </thead>
          <tbody>
            ${categoryData.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td>R$ ${cat.value.toFixed(2)}</td>
                <td>${((cat.value / annualStats.totalCost) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        
        <h3>Detalhamento Mensal</h3>
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Dias Planejados</th>
              <th>Custo Total</th>
              <th>Custo Médio</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyData.map(m => `
              <tr>
                <td>${m.name}</td>
                <td>${m.daysPlanned}</td>
                <td>R$ ${m.totalCost.toFixed(2)}</td>
                <td>R$ ${m.averageCost.toFixed(2)}</td>
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

  const typesToShow = selectedComparisonTypeIds.length > 0 
    ? menuTypes?.filter(t => selectedComparisonTypeIds.includes(t.id)) || []
    : menuTypes || [];

  return (
    <Layout>
      <div className="space-y-6" ref={reportRef}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatório Anual</h1>
            <p className="text-muted-foreground">Análise completa do ano</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select 
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(Number(val))}
            >
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedMenuTypeId} onValueChange={setSelectedMenuTypeId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {menuTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
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
                  <p className="text-sm text-muted-foreground">Custo Total Anual</p>
                  <p className="text-2xl font-bold">R$ {annualStats.totalCost.toFixed(2)}</p>
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
                  <p className="text-sm text-muted-foreground">Custo Médio Anual</p>
                  <p className="text-2xl font-bold">R$ {annualStats.averageCost.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Dias</p>
                  <p className="text-2xl font-bold">{annualStats.totalDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <BarChart3 className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mês Mais Caro</p>
                  <p className="text-2xl font-bold">
                    {annualStats.mostExpensive?.name.slice(0, 3) || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal do Custo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickFormatter={(v) => v.slice(0, 3)} fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R$${v.toFixed(2)}`} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Custo Médio']}
                />
                <Line 
                  type="monotone" 
                  dataKey="averageCost" 
                  stroke="hsl(142, 55%, 40%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 55%, 40%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Maior Custo por Grupo Alimentar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">Ranking de custos por grupo</p>
                  {categoryData.slice(0, 6).map((cat, index) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <span className="font-mono">R$ {cat.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison by menu type */}
        {menuTypes && menuTypes.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comparação por Tipo de Cardápio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all-annual"
                    checked={selectedComparisonTypeIds.length === menuTypes?.length}
                    onCheckedChange={() => {
                      if (selectedComparisonTypeIds.length === menuTypes?.length) {
                        setSelectedComparisonTypeIds([]);
                      } else {
                        setSelectedComparisonTypeIds(menuTypes?.map(t => t.id) || []);
                      }
                    }}
                  />
                  <Label htmlFor="select-all-annual" className="cursor-pointer font-medium">
                    Todos
                  </Label>
                </div>
                <div className="w-px h-6 bg-border" />
                {menuTypes?.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-annual-${type.id}`}
                      checked={selectedComparisonTypeIds.includes(type.id)}
                      onCheckedChange={() => handleToggleComparisonType(type.id)}
                    />
                    <Label htmlFor={`type-annual-${type.id}`} className="cursor-pointer">
                      {type.name}
                    </Label>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonByTypeAndMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `R$${v.toFixed(2)}`} />
                  <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  <Legend />
                  {typesToShow.map((type, index) => (
                    <Bar 
                      key={type.id}
                      dataKey={type.name} 
                      fill={COLORS[index % COLORS.length]} 
                      radius={[4, 4, 0, 0]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly details table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhamento Mensal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Dias Planejados</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Custo Médio</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((month, index) => {
                    const prevMonth = index > 0 ? monthlyData[index - 1] : null;
                    const variation = prevMonth && prevMonth.averageCost > 0 
                      ? ((month.averageCost - prevMonth.averageCost) / prevMonth.averageCost) * 100
                      : null;
                    
                    return (
                      <TableRow key={month.name}>
                        <TableCell className="font-medium">{month.name}</TableCell>
                        <TableCell className="text-right font-mono">{month.daysPlanned}</TableCell>
                        <TableCell className="text-right font-mono">R$ {month.totalCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          R$ {month.averageCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {variation !== null && month.daysPlanned > 0 ? (
                            <Badge variant={variation >= 0 ? 'destructive' : 'secondary'}>
                              {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Annual Summary Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL ANUAL</TableCell>
                    <TableCell className="text-right font-mono">{annualStats.totalDays}</TableCell>
                    <TableCell className="text-right font-mono">R$ {annualStats.totalCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-primary">
                      R$ {annualStats.averageCost.toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
