import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMenus, useCreateMenu, useUpdateMenu, useDeleteMenu, useAddIngredient, useRemoveIngredient, DailyMenu } from '@/hooks/useMenus';
import { useProducts } from '@/hooks/useProducts';
import { useKits } from '@/hooks/useKits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Loader2,
  Trash2,
  Utensils,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [perCapita, setPerCapita] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const { data: menus, isLoading } = useMenus(currentMonth);
  const { data: products } = useProducts();
  const { data: kits } = useKits();
  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();
  const deleteMenu = useDeleteMenu();
  const addIngredient = useAddIngredient();
  const removeIngredient = useRemoveIngredient();

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const menusByDate = useMemo(() => {
    const map = new Map<string, DailyMenu>();
    menus?.forEach((menu) => {
      map.set(menu.menu_date, menu);
    });
    return map;
  }, [menus]);

  const selectedMenu = useMemo(() => {
    if (!selectedDate) return null;
    return menusByDate.get(format(selectedDate, 'yyyy-MM-dd')) || null;
  }, [selectedDate, menusByDate]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearch) return products.slice(0, 10);
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 10);
  }, [products, productSearch]);

  const selectedProduct = products?.find(p => p.id === selectedProductId);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const menu = menusByDate.get(format(date, 'yyyy-MM-dd'));
    setDescription(menu?.description || '');
    setIsDialogOpen(true);
  };

  const handleSaveDescription = async () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    if (selectedMenu) {
      await updateMenu.mutateAsync({ id: selectedMenu.id, description });
    } else {
      await createMenu.mutateAsync({ menu_date: dateStr, description });
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedMenu || !selectedProductId || !perCapita) return;
    
    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;

    const perCapitaValue = parseFloat(perCapita);
    const cost = perCapitaValue * product.price;

    await addIngredient.mutateAsync({
      menu_id: selectedMenu.id,
      product_id: selectedProductId,
      per_capita: perCapitaValue,
      cost,
    });

    // Recalculate total cost
    const ingredientsCost = (selectedMenu.menu_ingredients?.reduce((sum, i) => sum + i.cost, 0) || 0) + cost;
    const kitsCost = kits?.filter(k => k.is_default).reduce((sum, k) => sum + k.price, 0) || 0;
    await updateMenu.mutateAsync({ 
      id: selectedMenu.id, 
      total_cost: ingredientsCost + kitsCost 
    });

    setSelectedProductId('');
    setPerCapita('');
    setProductSearch('');
  };

  const handleRemoveIngredient = async (ingredientId: string) => {
    if (!selectedMenu) return;
    
    const ingredient = selectedMenu.menu_ingredients?.find(i => i.id === ingredientId);
    if (!ingredient) return;

    await removeIngredient.mutateAsync(ingredientId);

    // Recalculate total cost
    const ingredientsCost = (selectedMenu.menu_ingredients?.reduce((sum, i) => sum + i.cost, 0) || 0) - ingredient.cost;
    const kitsCost = kits?.filter(k => k.is_default).reduce((sum, k) => sum + k.price, 0) || 0;
    await updateMenu.mutateAsync({ 
      id: selectedMenu.id, 
      total_cost: ingredientsCost + kitsCost 
    });
  };

  const handleDeleteMenu = async () => {
    if (!selectedMenu) return;
    if (confirm('Tem certeza que deseja remover este cardápio?')) {
      await deleteMenu.mutateAsync(selectedMenu.id);
      setIsDialogOpen(false);
    }
  };

  const totalCost = useMemo(() => {
    if (!selectedMenu) return 0;
    const ingredientsCost = selectedMenu.menu_ingredients?.reduce((sum, i) => sum + i.cost, 0) || 0;
    const kitsCost = kits?.filter(k => k.is_default).reduce((sum, k) => sum + k.price, 0) || 0;
    return ingredientsCost + kitsCost;
  }, [selectedMenu, kits]);

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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Calendário de Cardápios</h1>
            <p className="text-muted-foreground">Planeje os cardápios mensais</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-32 text-center capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before start of month */}
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const menu = menusByDate.get(dateStr);
                const hasMenu = !!menu;
                const hasCost = menu && menu.total_cost > 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'aspect-square p-1 rounded-lg border transition-all hover:border-primary hover:shadow-sm relative',
                      !isSameMonth(day, currentMonth) && 'opacity-50',
                      isToday(day) && 'ring-2 ring-primary ring-offset-2',
                      hasMenu && 'bg-primary/5 border-primary/30',
                      !hasMenu && 'bg-card border-border'
                    )}
                  >
                    <div className="flex flex-col h-full">
                      <span className={cn(
                        'text-sm font-medium',
                        isToday(day) && 'text-primary'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {hasMenu && (
                        <div className="flex-1 flex flex-col justify-end gap-0.5">
                          <Utensils className="h-3 w-3 text-primary mx-auto" />
                          {hasCost && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              R${menu.total_cost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  Cardápio - {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </span>
                {selectedMenu && (
                  <Button variant="ghost" size="icon" onClick={handleDeleteMenu}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição do cardápio</Label>
                <Textarea
                  placeholder="Ex: Arroz, feijão, frango grelhado, salada..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSaveDescription}
                  rows={3}
                />
              </div>

              {selectedMenu && (
                <>
                  {/* Add Ingredient */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Adicionar Ingrediente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {selectedProduct?.name || 'Buscar produto...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Digite para buscar..." 
                                  value={productSearch}
                                  onValueChange={setProductSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredProducts.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.name}
                                        onSelect={() => {
                                          setSelectedProductId(product.id);
                                          setProductPopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="flex-1">{product.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                          R$ {product.price.toFixed(2)}/{product.unit}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="Per capita"
                            value={perCapita}
                            onChange={(e) => setPerCapita(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={handleAddIngredient}
                          disabled={!selectedProductId || !perCapita || addIngredient.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ingredients List */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Ingredientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedMenu.menu_ingredients?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum ingrediente adicionado
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedMenu.menu_ingredients?.map((ingredient) => (
                            <div
                              key={ingredient.id}
                              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                            >
                              <div>
                                <span className="font-medium">
                                  {ingredient.products?.name}
                                </span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {ingredient.per_capita} {ingredient.products?.unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  R$ {ingredient.cost.toFixed(2)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRemoveIngredient(ingredient.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Kits */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Kits (automático)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {kits?.filter(k => k.is_default).map((kit) => (
                          <Badge key={kit.id} variant="secondary" className="gap-1">
                            {kit.name}
                            <span className="font-mono">R$ {kit.price.toFixed(2)}</span>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <span className="font-medium">Custo Total per Capita</span>
                    <span className="text-xl font-bold text-primary font-mono">
                      R$ {totalCost.toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {!selectedMenu && selectedDate && (
                <Button 
                  className="w-full" 
                  onClick={async () => {
                    await createMenu.mutateAsync({ 
                      menu_date: format(selectedDate, 'yyyy-MM-dd'), 
                      description 
                    });
                  }}
                  disabled={createMenu.isPending}
                >
                  {createMenu.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Criar Cardápio
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
