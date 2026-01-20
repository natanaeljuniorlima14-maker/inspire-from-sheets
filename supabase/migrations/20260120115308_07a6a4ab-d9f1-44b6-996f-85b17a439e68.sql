-- Create menu_types table for different cardapio types
CREATE TABLE public.menu_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_types ENABLE ROW LEVEL SECURITY;

-- Create policies for menu_types
CREATE POLICY "Authenticated users can view menu types" 
ON public.menu_types FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create menu types" 
ON public.menu_types FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update menu types" 
ON public.menu_types FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete menu types" 
ON public.menu_types FOR DELETE 
TO authenticated
USING (true);

-- Add menu_type_id to daily_menus
ALTER TABLE public.daily_menus 
ADD COLUMN menu_type_id UUID REFERENCES public.menu_types(id);

-- Create index for faster lookups
CREATE INDEX idx_daily_menus_menu_type ON public.daily_menus(menu_type_id);

-- Insert default menu type
INSERT INTO public.menu_types (name, description) VALUES ('Padrão', 'Tipo de cardápio padrão');

-- Add trigger for updated_at
CREATE TRIGGER update_menu_types_updated_at
BEFORE UPDATE ON public.menu_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();