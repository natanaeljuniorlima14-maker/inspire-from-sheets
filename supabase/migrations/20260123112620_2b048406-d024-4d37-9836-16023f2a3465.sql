-- Create a helper function to check if user is admin or pcp
CREATE OR REPLACE FUNCTION public.is_admin_or_pcp(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'pcp')
  )
$$;

-- Update categories policies to include PCP
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins and PCP can insert categories" 
ON public.categories 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins and PCP can update categories" 
ON public.categories 
FOR UPDATE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins and PCP can delete categories" 
ON public.categories 
FOR DELETE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

-- Update products policies to include PCP
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins and PCP can insert products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins and PCP can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins and PCP can delete products" 
ON public.products 
FOR DELETE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

-- Update daily_menus policies to include PCP
DROP POLICY IF EXISTS "Admins can insert menus" ON public.daily_menus;
CREATE POLICY "Admins and PCP can insert menus" 
ON public.daily_menus 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can update menus" ON public.daily_menus;
CREATE POLICY "Admins and PCP can update menus" 
ON public.daily_menus 
FOR UPDATE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete menus" ON public.daily_menus;
CREATE POLICY "Admins and PCP can delete menus" 
ON public.daily_menus 
FOR DELETE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

-- Update kits policies to include PCP
DROP POLICY IF EXISTS "Admins can insert kits" ON public.kits;
CREATE POLICY "Admins and PCP can insert kits" 
ON public.kits 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can update kits" ON public.kits;
CREATE POLICY "Admins and PCP can update kits" 
ON public.kits 
FOR UPDATE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete kits" ON public.kits;
CREATE POLICY "Admins and PCP can delete kits" 
ON public.kits 
FOR DELETE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

-- Update menu_ingredients policies to include PCP
DROP POLICY IF EXISTS "Admins can insert menu ingredients" ON public.menu_ingredients;
CREATE POLICY "Admins and PCP can insert menu ingredients" 
ON public.menu_ingredients 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can update menu ingredients" ON public.menu_ingredients;
CREATE POLICY "Admins and PCP can update menu ingredients" 
ON public.menu_ingredients 
FOR UPDATE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete menu ingredients" ON public.menu_ingredients;
CREATE POLICY "Admins and PCP can delete menu ingredients" 
ON public.menu_ingredients 
FOR DELETE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

-- Update menu_kits policies to include PCP
DROP POLICY IF EXISTS "Admins can insert menu kits" ON public.menu_kits;
CREATE POLICY "Admins and PCP can insert menu kits" 
ON public.menu_kits 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can update menu kits" ON public.menu_kits;
CREATE POLICY "Admins and PCP can update menu kits" 
ON public.menu_kits 
FOR UPDATE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete menu kits" ON public.menu_kits;
CREATE POLICY "Admins and PCP can delete menu kits" 
ON public.menu_kits 
FOR DELETE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

-- Update menu_types policies to include PCP
DROP POLICY IF EXISTS "Admins can insert menu types" ON public.menu_types;
CREATE POLICY "Admins and PCP can insert menu types" 
ON public.menu_types 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can update menu types" ON public.menu_types;
CREATE POLICY "Admins and PCP can update menu types" 
ON public.menu_types 
FOR UPDATE 
TO authenticated
USING (is_admin_or_pcp(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete menu types" ON public.menu_types;
CREATE POLICY "Only Admins can delete menu types" 
ON public.menu_types 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add SELECT policy for user_roles to allow admins to see all roles (for users management page)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));