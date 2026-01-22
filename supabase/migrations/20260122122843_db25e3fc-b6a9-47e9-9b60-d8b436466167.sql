-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Remove role column from profiles (will use user_roles table)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- =====================================================
-- PROFILES: Users can only view/manage own profile
-- =====================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- CATEGORIES: All authenticated read, admin write
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;

CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (public.is_authenticated());

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PRODUCTS: All authenticated read, admin write
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.is_authenticated());

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- KITS: All authenticated read, admin write
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view kits" ON public.kits;
DROP POLICY IF EXISTS "Authenticated users can insert kits" ON public.kits;
DROP POLICY IF EXISTS "Authenticated users can update kits" ON public.kits;

CREATE POLICY "Authenticated users can view kits"
  ON public.kits FOR SELECT
  TO authenticated
  USING (public.is_authenticated());

CREATE POLICY "Admins can insert kits"
  ON public.kits FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update kits"
  ON public.kits FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete kits"
  ON public.kits FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- DAILY_MENUS: All authenticated read, admin write
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view menus" ON public.daily_menus;
DROP POLICY IF EXISTS "Authenticated users can insert menus" ON public.daily_menus;
DROP POLICY IF EXISTS "Authenticated users can update menus" ON public.daily_menus;
DROP POLICY IF EXISTS "Authenticated users can delete menus" ON public.daily_menus;

CREATE POLICY "Authenticated users can view menus"
  ON public.daily_menus FOR SELECT
  TO authenticated
  USING (public.is_authenticated());

CREATE POLICY "Admins can insert menus"
  ON public.daily_menus FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menus"
  ON public.daily_menus FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menus"
  ON public.daily_menus FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- MENU_INGREDIENTS: All authenticated read, admin write
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view menu ingredients" ON public.menu_ingredients;
DROP POLICY IF EXISTS "Authenticated users can insert menu ingredients" ON public.menu_ingredients;
DROP POLICY IF EXISTS "Authenticated users can update menu ingredients" ON public.menu_ingredients;
DROP POLICY IF EXISTS "Authenticated users can delete menu ingredients" ON public.menu_ingredients;

CREATE POLICY "Authenticated users can view menu ingredients"
  ON public.menu_ingredients FOR SELECT
  TO authenticated
  USING (public.is_authenticated());

CREATE POLICY "Admins can insert menu ingredients"
  ON public.menu_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu ingredients"
  ON public.menu_ingredients FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu ingredients"
  ON public.menu_ingredients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- MENU_KITS: All authenticated read, admin write
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view menu kits" ON public.menu_kits;
DROP POLICY IF EXISTS "Authenticated users can insert menu kits" ON public.menu_kits;
DROP POLICY IF EXISTS "Authenticated users can update menu kits" ON public.menu_kits;
DROP POLICY IF EXISTS "Authenticated users can delete menu kits" ON public.menu_kits;

CREATE POLICY "Authenticated users can view menu kits"
  ON public.menu_kits FOR SELECT
  TO authenticated
  USING (public.is_authenticated());

CREATE POLICY "Admins can insert menu kits"
  ON public.menu_kits FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu kits"
  ON public.menu_kits FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu kits"
  ON public.menu_kits FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- MENU_TYPES: All authenticated read, admin write
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view menu types" ON public.menu_types;
DROP POLICY IF EXISTS "Authenticated users can create menu types" ON public.menu_types;
DROP POLICY IF EXISTS "Authenticated users can update menu types" ON public.menu_types;
DROP POLICY IF EXISTS "Authenticated users can delete menu types" ON public.menu_types;

CREATE POLICY "Authenticated users can view menu types"
  ON public.menu_types FOR SELECT
  TO authenticated
  USING (public.is_authenticated());

CREATE POLICY "Admins can insert menu types"
  ON public.menu_types FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu types"
  ON public.menu_types FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu types"
  ON public.menu_types FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));