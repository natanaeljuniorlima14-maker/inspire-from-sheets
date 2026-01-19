import { useState, useMemo } from 'react';
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useKits, useUpdateKit } from '@/hooks/useKits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Package,
  Loader2,
  DollarSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';

export default function Products() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: kits, isLoading: kitsLoading } = useKits();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateKit = useUpdateKit();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unit: 'kg',
    price: '',
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      category_id: formData.category_id || null,
      unit: formData.unit,
      price: parseFloat(formData.price) || 0,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
    }

    setFormData({ name: '', category_id: '', unit: 'kg', price: '' });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (product: typeof products extends (infer T)[] ? T : never) => {
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      unit: product.unit,
      price: product.price.toString(),
    });
    setEditingProduct(product.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto?')) {
      await deleteProduct.mutateAsync(id);
    }
  };

  const handleKitPriceUpdate = async (id: string, price: string) => {
    await updateKit.mutateAsync({ id, price: parseFloat(price) || 0 });
  };

  if (productsLoading || kitsLoading) {
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
            <h1 className="text-2xl font-bold">Produtos</h1>
            <p className="text-muted-foreground">Gerencie os produtos e preços</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setFormData({ name: '', category_id: '', unit: 'kg', price: '' });
                setEditingProduct(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do produto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Arroz branco"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidade</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="un">un</SelectItem>
                        <SelectItem value="dz">dz</SelectItem>
                        <SelectItem value="pct">pct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos ({products?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="kits" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Kits ({kits?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produtos..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Todas categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead>Atualizado</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum produto encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              {product.categories ? (
                                <Badge variant="secondary">{product.categories.name}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{product.unit}</TableCell>
                            <TableCell className="text-right font-mono">
                              R$ {product.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(product.price_updated_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(product)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kits" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kits de Custo Fixo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Valores per capita adicionados automaticamente a cada cardápio
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {kits?.map((kit) => (
                    <div key={kit.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{kit.name}</p>
                        {kit.is_default && (
                          <Badge variant="outline" className="mt-1">Padrão</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={kit.price}
                          className="w-24 text-right"
                          onBlur={(e) => handleKitPriceUpdate(kit.id, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
