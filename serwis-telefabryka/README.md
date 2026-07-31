# Serwis Telefabryka — cennik online

Publiczny cennik z wyszukiwarką i panelem administratora. Administrator może dodawać, edytować i usuwać marki, modele, usługi, opisy oraz ceny. Klienci mają wyłącznie podgląd.

## Zawartość paczki
- `src/main.js` — działanie aplikacji i panelu administratora
- `src/style.css` — wygląd
- `supabase.sql` — baza danych i zabezpieczenia
- `.env.example` — miejsce na dane Supabase
- `package.json` — wymagane biblioteki

## Uruchomienie lokalne
1. Zainstaluj Node.js.
2. Zmień nazwę `.env.example` na `.env`.
3. Wpisz w nim dane projektu Supabase.
4. W folderze aplikacji uruchom `npm install`.
5. Następnie uruchom `npm run dev`.

## Konfiguracja Supabase
1. Utwórz projekt Supabase.
2. W SQL Editor uruchom zawartość pliku `supabase.sql`.
3. W Authentication > Users utwórz konto administratora.
4. Skopiuj UUID użytkownika i w SQL Editor wykonaj:
   `insert into public.admins (user_id) values ('UUID');`
5. Z Project Settings > API skopiuj Project URL oraz anon key do pliku `.env`.

## Publikacja
Projekt można opublikować na Cloudflare Pages, Netlify lub innym hostingu obsługującym Vite.

## Ważne
Przed publikacją zmień przykładowy numer telefonu w `src/main.js`.
