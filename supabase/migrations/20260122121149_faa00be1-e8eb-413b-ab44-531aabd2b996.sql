-- Remove old unique constraint that only checks menu_date
ALTER TABLE public.daily_menus
  DROP CONSTRAINT IF EXISTS daily_menus_menu_date_key;