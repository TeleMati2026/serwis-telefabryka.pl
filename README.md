# Serwis Telefabryka — działająca wersja statyczna

Ta wersja nie wymaga Vite, npm ani kompilacji. Cloudflare publikuje ją bezpośrednio.

## Wgranie na GitHub

Usuń stare pliki i wgraj bezpośrednio do głównego katalogu repozytorium:

- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `supabase.sql`
- `README.md`

## Cloudflare Pages

W `Settings → Build configuration` ustaw:

- Build command: pozostaw puste
- Build output directory: `/`
- Root directory: pozostaw puste

Następnie uruchom nowe wdrożenie. Sama strona i cennik demonstracyjny zaczną działać od razu.

## Podłączenie panelu administratora

1. Utwórz projekt Supabase.
2. W `SQL Editor` uruchom cały plik `supabase.sql`.
3. W `Authentication → Users` utwórz użytkownika administratora.
4. Skopiuj jego UUID i uruchom w SQL Editor:

```sql
insert into public.admins (user_id) values ('TU-WKLEJ-UUID');
```

5. W Supabase otwórz `Project Settings → API` i skopiuj `Project URL` oraz klucz `anon public`.
6. Na GitHubie edytuj `config.js`:

```js
window.TELEFABRYKA_CONFIG = {
  supabaseUrl: 'https://TWOJ-PROJEKT.supabase.co',
  supabaseAnonKey: 'TU_WKLEJ_ANON_PUBLIC_KEY'
};
```

Po zapisaniu GitHub uruchomi automatyczne wdrożenie. Klucza `service_role` nie wolno umieszczać w pliku.
