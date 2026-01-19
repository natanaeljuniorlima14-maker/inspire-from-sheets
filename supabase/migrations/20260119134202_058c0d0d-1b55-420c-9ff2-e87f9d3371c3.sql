-- Categorias de produtos
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Produtos com preços
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kits (Tempero, Descartável, Limpeza, Gás)
CREATE TABLE public.kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cardápios diários
CREATE TABLE public.daily_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_date DATE NOT NULL UNIQUE,
  description TEXT,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ingredientes do cardápio diário
CREATE TABLE public.menu_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.daily_menus(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  per_capita DECIMAL(10,4) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kits aplicados ao cardápio
CREATE TABLE public.menu_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.daily_menus(id) ON DELETE CASCADE,
  kit_id UUID NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_id, kit_id)
);

-- Perfis de usuários
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_daily_menus_date ON public.daily_menus(menu_date);
CREATE INDEX idx_menu_ingredients_menu ON public.menu_ingredients(menu_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Categorias (todos autenticados podem ver e editar)
CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE TO authenticated USING (true);

-- Políticas RLS - Produtos
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON public.products FOR DELETE TO authenticated USING (true);

-- Políticas RLS - Kits
CREATE POLICY "Authenticated users can view kits" ON public.kits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert kits" ON public.kits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update kits" ON public.kits FOR UPDATE TO authenticated USING (true);

-- Políticas RLS - Cardápios
CREATE POLICY "Authenticated users can view menus" ON public.daily_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert menus" ON public.daily_menus FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update menus" ON public.daily_menus FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete menus" ON public.daily_menus FOR DELETE TO authenticated USING (true);

-- Políticas RLS - Ingredientes do cardápio
CREATE POLICY "Authenticated users can view menu ingredients" ON public.menu_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert menu ingredients" ON public.menu_ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update menu ingredients" ON public.menu_ingredients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete menu ingredients" ON public.menu_ingredients FOR DELETE TO authenticated USING (true);

-- Políticas RLS - Kits do cardápio
CREATE POLICY "Authenticated users can view menu kits" ON public.menu_kits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert menu kits" ON public.menu_kits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update menu kits" ON public.menu_kits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete menu kits" ON public.menu_kits FOR DELETE TO authenticated USING (true);

-- Políticas RLS - Perfis
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kits_updated_at BEFORE UPDATE ON public.kits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_menus_updated_at BEFORE UPDATE ON public.daily_menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir categorias padrão baseadas na planilha
INSERT INTO public.categories (name, description) VALUES
  ('Perecíveis', 'Produtos perecíveis como carnes, laticínios'),
  ('Base Seca', 'Produtos de base seca como arroz, feijão, massas'),
  ('Hortifrútis', 'Frutas, legumes e verduras'),
  ('Pães', 'Pães e produtos de padaria'),
  ('Temperos', 'Temperos e condimentos'),
  ('Outros', 'Outros produtos');

-- Inserir kits padrão
INSERT INTO public.kits (name, price, is_default) VALUES
  ('Kit Tempero', 0.05, true),
  ('Kit Descartável', 0.06, true),
  ('Kit Limpeza', 0.02, true),
  ('Gás', 0.04, true);