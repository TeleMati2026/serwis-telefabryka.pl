-- SERWIS TELEFABRYKA — uruchom cały plik w Supabase > SQL Editor
-- PRZED URUCHOMIENIEM zamień adres e-mail w ostatniej instrukcji INSERT.

create extension if not exists pgcrypto;

create table if not exists public.price_items (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (char_length(brand) between 1 and 60),
  model text not null check (char_length(model) between 1 and 100),
  service text not null check (char_length(service) between 1 and 140),
  price numeric(10,2) not null check (price >= 0),
  price_prefix text not null default 'od' check (price_prefix in ('od','','około')),
  description text not null default '' check (char_length(description) <= 300),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.price_items enable row level security;
alter table public.admin_emails enable row level security;

create or replace function public.is_telefabryka_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );
$$;

drop policy if exists "public can read visible prices" on public.price_items;
create policy "public can read visible prices" on public.price_items for select using (is_visible = true or public.is_telefabryka_admin());

drop policy if exists "admins can insert prices" on public.price_items;
create policy "admins can insert prices" on public.price_items for insert to authenticated with check (public.is_telefabryka_admin());

drop policy if exists "admins can update prices" on public.price_items;
create policy "admins can update prices" on public.price_items for update to authenticated using (public.is_telefabryka_admin()) with check (public.is_telefabryka_admin());

drop policy if exists "admins can delete prices" on public.price_items;
create policy "admins can delete prices" on public.price_items for delete to authenticated using (public.is_telefabryka_admin());

drop policy if exists "admin can view own admin record" on public.admin_emails;
create policy "admin can view own admin record" on public.admin_emails for select to authenticated using (lower(email)=lower(coalesce(auth.jwt()->>'email','')));

insert into public.price_items (brand,model,service,price,price_prefix,description,is_visible) values
('Apple','iPhone 13','Wymiana wyświetlacza OLED',449,'od','Część i montaż w cenie',true),
('Apple','iPhone 12','Wymiana baterii',199,'od','Gwarancja serwisowa',true),
('Samsung','Galaxy S22','Wymiana złącza ładowania',249,'od','Diagnostyka w cenie',true),
('Samsung','Galaxy A54','Wymiana wyświetlacza',399,'od','Cena orientacyjna',true),
('Xiaomi','Redmi Note 12','Wymiana baterii',169,'od','Część i montaż w cenie',true),
('Xiaomi','POCO X5','Wymiana wyświetlacza',329,'od','Gwarancja serwisowa',true)
on conflict do nothing;

-- ZMIEŃ PONIŻSZY E-MAIL NA TEN, KTÓRY UTWORZYSZ W SUPABASE AUTH:
insert into public.admin_emails(email) values ('TWOJ-EMAIL@PRZYKLAD.PL') on conflict do nothing;
