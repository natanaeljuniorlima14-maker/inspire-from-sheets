import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMenus, useCreateMenu, useUpdateMenu, useDeleteMenu, useAddIngredient, useRemoveIngredient, useAddKit, useRemoveKit, useDuplicateMenu, useDuplicateMenuType, DailyMenu } from '@/hooks/useMenus';
import { useMenuTypes, useCreateMenuType, useDeleteMenuType } from '@/hooks/useMenuTypes';
import { useProducts } from '@/hooks/useProducts';
import { useKits } from '@/hooks/useKits';
import { useUserRole } from '@/hooks/useUserRole';
import { MonthSelector } from '@/components/MonthSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Loader2,
  Trash2,
  Utensils,
  Check,
  ChevronsUpDown,
  Copy,
  Settings,
  Layers,
  Save
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isDuplicateTypeDialogOpen, setIsDuplicateTypeDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [perCapita, setPerCapita] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedMenuTypeId, setSelectedMenuTypeId] = useState<string>('all');
  const [duplicateTargetDate, setDuplicateTargetDate] = useState('');
  const [duplicateTargetTypeId, setDuplicateTargetTypeId] = useState<string>('');
  const [duplicateSourceTypeId, setDuplicateSourceTypeId] = useState<string>('');
  const [duplicateDestTypeId, setDuplicateDestTypeId] = useState<string>('');
  const [newTypeName, setNewTypeName] = useState('');
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);

  const { isAdmin } = useUserRole();
  const { data: menuTypes } = useMenuTypes();
  const { data: menus, isLoading } = useMenus(currentMonth, selectedMenuTypeId === 'all' ? undefined : selectedMenuTypeId);
  const { data: products } = useProducts();
  const { data: kits } = useKits();
  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();
  const deleteMenu = useDeleteMenu();
  const addIngredient = useAddIngredient();
  const removeIngredient = useRemoveIngredient();
  const addKit = useAddKit();
  const removeKit = useRemoveKit();
  const duplicateMenu = useDuplicateMenu();
  const duplicateMenuType = useDuplicateMenuType();
  const createMenuType = useCreateMenuType();
  const deleteMenuType = useDeleteMenuType();

  // Filter only weekdays (Monday to Friday)
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    // Filter out weekends (0 = Sunday, 6 = Saturday)
    return allDays.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
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

  // Get kits that are already added to this menu
  const addedKitIds = useMemo(() => {
    return new Set(selectedMenu?.menu_kits?.map(mk => mk.kit_id) || []);
  }, [selectedMenu]);

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
      await createMenu.mutateAsync({ 
        menu_date: dateStr, 
        description,
        menu_type_id: selectedMenuTypeId === 'all' ? undefined : selectedMenuTypeId
      });
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
    const kitsCost = selectedMenu.menu_kits?.reduce((sum, k) => sum + k.cost, 0) || 0;
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
    const kitsCost = selectedMenu.menu_kits?.reduce((sum, k) => sum + k.cost, 0) || 0;
    await updateMenu.mutateAsync({ 
      id: selectedMenu.id, 
      total_cost: ingredientsCost + kitsCost 
    });
  };

  const handleToggleKit = async (kitId: string, kitPrice: number) => {
    if (!selectedMenu) return;

    const existingKit = selectedMenu.menu_kits?.find(mk => mk.kit_id === kitId);
    
    if (existingKit) {
      // Optimistic update handles total_cost recalculation
      await removeKit.mutateAsync({ 
        id: existingKit.id, 
        menu_id: selectedMenu.id, 
        cost: existingKit.cost 
      });
    } else {
      // Optimistic update handles total_cost recalculation
      await addKit.mutateAsync({
        menu_id: selectedMenu.id,
        kit_id: kitId,
        cost: kitPrice,
      });
    }
  };

  const handleDeleteMenu = async () => {
    if (!selectedMenu) return;
    if (confirm('Tem certeza que deseja remover este cardápio?')) {
      await deleteMenu.mutateAsync(selectedMenu.id);
      setIsDialogOpen(false);
    }
  };

  const handleDuplicate = () => {
    if (!selectedMenu) return;
    setDuplicateTargetDate('');
    setDuplicateTargetTypeId(selectedMenuTypeId === 'all' ? '' : selectedMenuTypeId);
    setIsDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!selectedMenu || !duplicateTargetDate) return;
    await duplicateMenu.mutateAsync({
      sourceMenuId: selectedMenu.id,
      targetDate: duplicateTargetDate,
      targetMenuTypeId: duplicateTargetTypeId || undefined,
    });
    setIsDuplicateDialogOpen(false);
    setIsDialogOpen(false);
  };

  const handleOpenDuplicateType = () => {
    setDuplicateSourceTypeId('');
    setDuplicateDestTypeId('');
    setIsDuplicateTypeDialogOpen(true);
  };

  const handleConfirmDuplicateType = async () => {
    if (!duplicateSourceTypeId || !duplicateDestTypeId) return;
    await duplicateMenuType.mutateAsync({
      sourceTypeId: duplicateSourceTypeId,
      targetTypeId: duplicateDestTypeId,
      month: currentMonth,
    });
    setIsDuplicateTypeDialogOpen(false);
  };

  const handleCreateMenuType = async () => {
    if (!newTypeName.trim()) return;
    await createMenuType.mutateAsync({ name: newTypeName.trim() });
    setNewTypeName('');
    setIsTypeDialogOpen(false);
  };

  const handleDeleteMenuType = async (typeId: string) => {
    if (confirm('Tem certeza que deseja excluir este tipo de cardápio?')) {
      await deleteMenuType.mutateAsync(typeId);
    }
  };

  const totalCost = useMemo(() => {
    if (!selectedMenu) return 0;
    const ingredientsCost = selectedMenu.menu_ingredients?.reduce((sum, i) => sum + i.cost, 0) || 0;
    const kitsCost = selectedMenu.menu_kits?.reduce((sum, k) => sum + k.cost, 0) || 0;
    return ingredientsCost + kitsCost;
  }, [selectedMenu]);


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
            <p className="text-muted-foreground">Planeje os cardápios mensais (dias úteis)</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Menu Type Selector */}
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
            
            <Button variant="outline" size="icon" onClick={handleOpenDuplicateType} title="Duplicar tipo de cardápio">
              <Layers className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="icon" onClick={() => setIsTypeDialogOpen(true)} title="Gerenciar tipos">
              <Settings className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <MonthSelector 
                value={currentMonth} 
                onChange={setCurrentMonth}
                triggerClassName="w-40"
              />
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {/* Calendar Header - Only weekdays */}
            <div className="grid grid-cols-5 gap-1 mb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days - Group by weeks */}
            <div className="grid grid-cols-5 gap-1">
              {days.map((day, index) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const menu = menusByDate.get(dateStr);
                const hasMenu = !!menu;
                const hasCost = menu && menu.total_cost > 0;
                const dayOfWeek = getDay(day);
                
                // Calculate empty cells at the start (Monday = 1, so offset = dayOfWeek - 1)
                const offset = index === 0 ? (dayOfWeek === 0 ? 4 : dayOfWeek - 1) : 0;

                return (
                  <>
                    {/* Add empty cells for the first week */}
                    {index === 0 && Array.from({ length: offset }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
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
                  </>
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
                  {selectedMenu?.menu_types && (
                    <Badge variant="secondary" className="ml-2">{selectedMenu.menu_types.name}</Badge>
                  )}
                </span>
                <div className="flex gap-1">
                  {selectedMenu && (
                    <>
                      <Button variant="ghost" size="icon" onClick={handleDuplicate} title="Duplicar cardápio">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleDeleteMenu}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
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

                  {/* Kits - Manual Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Kits (selecione os utilizados)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {kits?.map((kit) => (
                          <div key={kit.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                id={`kit-${kit.id}`}
                                checked={addedKitIds.has(kit.id)}
                                onCheckedChange={() => handleToggleKit(kit.id, kit.price)}
                              />
                              <label htmlFor={`kit-${kit.id}`} className="font-medium cursor-pointer">
                                {kit.name}
                              </label>
                            </div>
                            <span className="font-mono text-sm">R$ {kit.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Custo Total per Capita</span>
                        <span className="text-2xl font-bold text-primary">
                          R$ {totalCost.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <Button 
                    className="w-full bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar e Fechar
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Duplicate Dialog */}
        <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicar Cardápio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Data de destino</Label>
                <Input
                  type="date"
                  value={duplicateTargetDate}
                  onChange={(e) => setDuplicateTargetDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de cardápio (opcional)</Label>
                <Select value={duplicateTargetTypeId} onValueChange={setDuplicateTargetTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Manter o mesmo tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Manter o mesmo tipo</SelectItem>
                    {menuTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmDuplicate} disabled={!duplicateTargetDate || duplicateMenu.isPending}>
                {duplicateMenu.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Duplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Menu Type Dialog */}
        <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Tipos de Cardápio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Criar novo tipo</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Creche, Fundamental, Integral..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                  />
                  <Button onClick={handleCreateMenuType} disabled={!newTypeName.trim() || createMenuType.isPending}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tipos existentes:</Label>
                <div className="space-y-2">
                  {menuTypes?.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{type.name}</span>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteMenuType(type.id)}
                          disabled={deleteMenuType.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTypeDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Menu Type Dialog */}
        <Dialog open={isDuplicateTypeDialogOpen} onOpenChange={setIsDuplicateTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicar Tipo de Cardápio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Copie todos os cardápios de um tipo para outro no mês de {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}.
              </p>
              <div className="space-y-2">
                <Label>Tipo de origem</Label>
                <Select value={duplicateSourceTypeId} onValueChange={setDuplicateSourceTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {menuTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de destino</Label>
                <Select value={duplicateDestTypeId} onValueChange={setDuplicateDestTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {menuTypes?.filter(t => t.id !== duplicateSourceTypeId).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDuplicateTypeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmDuplicateType} 
                disabled={!duplicateSourceTypeId || !duplicateDestTypeId || duplicateMenuType.isPending}
              >
                {duplicateMenuType.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                Duplicar Tipo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
