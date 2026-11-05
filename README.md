# Мини-CRM «Объекты и задачи»

Небольшая CRM для строительной компании. Постановщик ведёт объекты (стройки) и задачи по ним, исполнители берут задачи в работу и отдают на проверку. У каждой задачи есть история смены статусов.

Стек: React + TypeScript (Vite), MUI, React Router, Supabase (Postgres, Auth, REST). Все правила доступа и переходы статусов проверяет база данных (RLS, права на колонки, функции и триггеры), а не интерфейс.

Проект сделан с помощью [Claude Code](https://claude.com/claude-code).

- [docs/for-manager.md](docs/for-manager.md) — как устроена система, без технических терминов.
- [docs/decisions.md](docs/decisions.md) — решения и допущения там, где ТЗ неоднозначно.
- [docs/security.md](docs/security.md) — как проверялась безопасность: автотесты и отдельный пентест.

## Структура

```
supabase/migrations/   схема, права доступа, статусы и история (три миграции)
supabase/seed.sql      демо-данные: 3 объекта, задачи во всех статусах, история
scripts/               создание демо-пользователей через Auth Admin API
src/                   фронтенд (страницы, компоненты, обращения к API)
tests/security/        атаки на базу через supabase-js с токенами пользователей
```

## Локальный запуск

Нужны Node.js 20+ и Docker.

```bash
npm install
npx supabase start
```

Создайте `.env` по образцу `.env.example`. Значения для локальной базы выводит `npx supabase status`:

- `VITE_SUPABASE_URL`, `SUPABASE_URL` — `API_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY` — `PUBLISHABLE_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY` — `SECRET_KEY` (нужен только скриптам и тестам, во фронтенд не попадает);
- `SEED_PASSWORD_*` — пароли демо-пользователей, придумайте сами.

```bash
npx supabase db reset     # применяет миграции
npm run seed:users        # создаёт трёх демо-пользователей
npm run seed:data         # загружает supabase/seed.sql
npm run dev               # http://localhost:5173
```

Демо-пользователи:

| Email                     | Роль                          |
| ------------------------- | ----------------------------- |
| `manager@mini-crm.test`   | Постановщик                   |
| `executor1@mini-crm.test` | Исполнитель (Иван Петров)     |
| `executor2@mini-crm.test` | Исполнитель (Ольга Кузнецова) |

Пароли в репозитории не хранятся: это значения `SEED_PASSWORD_*` из вашего `.env`.

Проверки: `npm run typecheck`, `npm run lint`, `npm test` (юнит-тесты), `npm run test:security` (атаки на базу, см. ниже), `npm run build`. Форматирование: `npm run format` (Prettier).

## Облачный Supabase

1. Создайте проект на [supabase.com](https://supabase.com) (тариф Free).
2. Примените миграции:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. **Выключите регистрацию:** Authentication → Sign In / Providers → снимите «Allow new users to sign up». Файл `config.toml` действует только локально.
4. Создайте пользователей. Временно пропишите в локальном `.env` облачные `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API Keys → secret key), задайте `SEED_PASSWORD_*` и выполните:
   ```bash
   npm run seed:users
   npx supabase db query --remote -f supabase/seed.sql
   ```
   Вместо второй команды можно вставить `supabase/seed.sql` в SQL Editor. После этого верните в `.env` локальные значения.
5. Роль меняется только вручную: Table Editor → `profiles` → колонка `role`. Сам пользователь свою роль изменить не может.

Бесплатный проект Supabase **засыпает после недели без активности**: приложение перестаёт отвечать до восстановления. Если ссылку откроют позже, зайдите в панель Supabase и нажмите Restore project; это занимает пару минут.

## Деплой на Vercel

1. Импортируйте репозиторий в Vercel (тариф Hobby). Фреймворк Vite определится сам: сборка `npm run build`, папка `dist`.
2. В Settings → Environment Variables задайте только две переменные:
   - `VITE_SUPABASE_URL` — URL облачного проекта;
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable (anon) key.

   `service_role` / secret key в Vercel **не добавляйте**: всё с префиксом `VITE_` попадает в код страницы.

3. `vercel.json` перенаправляет все пути на `index.html`, чтобы прямые ссылки вида `/tasks/<id>` открывались.
4. В Supabase: Authentication → URL Configuration → Site URL = адрес приложения на Vercel.

## Проверка безопасности

Тесты в `tests/security/` логинятся каждым пользователем в локальный Supabase так же, как это сделал бы человек из DevTools браузера, и пытаются нарушить правила. Каждый набор создаёт своих пользователей и данные и от сида не зависит.

```bash
npx supabase start
npm run test:security
```

Что проверяется (всё должно **не пройти**): исполнитель читает чужие задачи, объекты и историю; меняет статус чужой задачи; перескакивает статус (Новая → Принята); сам принимает свою задачу; постановщик возвращает задачу без комментария или с комментарием из пробелов; кто угодно меняет статус обычным UPDATE; задаёт при создании `status`, `author_id`, `created_at`; пишет, правит или удаляет историю; меняет правила переходов; меняет себе роль или создаёт себе профиль; назначает исполнителем постановщика; правит принятую задачу; `anon` читает или пишет что-либо; регистрация нового пользователя. Два одновременных перехода из одного статуса — проходит ровно один.

И что разрешённое проходит: полный цикл статусов с историей, удаление задачи и объекта с сохранением истории и событием `deleted`.

Тесты оставляют своих пользователей и объекты в локальной базе. Чтобы вернуть чистые демо-данные, повторите `db reset`, `seed:users` и `seed:data`.

### Примеры запросов в обход интерфейса

`$URL` — адрес API, `$KEY` — publishable key, `$TOKEN` — access token исполнителя Ольги (можно взять в DevTools после входа).

Ольга пытается прочитать задачу Ивана по id — база возвращает пустой список, как будто задачи нет:

```bash
curl "$URL/rest/v1/tasks?id=eq.a0000000-0000-4000-8000-000000000001&select=id,title" \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN"
```

```json
[]
```

Ольга пытается сменить статус обычным UPDATE:

```bash
curl -X PATCH "$URL/rest/v1/tasks?id=eq.a0000000-0000-4000-8000-000000000003" \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"accepted"}'
```

```json
{
  "code": "42501",
  "details": null,
  "hint": "Grant the required privileges to the current role with: GRANT UPDATE ON public.tasks TO authenticated;",
  "message": "permission denied for table tasks"
}
```

Ольга пытается сама принять свою задачу через функцию переходов:

```bash
curl -X POST "$URL/rest/v1/rpc/transition_task" \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"p_task_id":"a0000000-0000-4000-8000-000000000003","p_to_status":"accepted"}'
```

```json
{
  "code": "P0001",
  "details": null,
  "hint": null,
  "message": "transition_not_allowed"
}
```

Ольга пытается удалить историю своей задачи:

```bash
curl -X DELETE "$URL/rest/v1/task_history?task_id=eq.a0000000-0000-4000-8000-000000000003" \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "code": "42501",
  "details": null,
  "hint": "Grant the required privileges to the current role with: GRANT DELETE ON public.task_history TO authenticated;",
  "message": "permission denied for table task_history"
}
```

Регистрация без приглашения:

```bash
curl -X POST "$URL/auth/v1/signup" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"intruder@example.com","password":"secret123"}'
```

```json
{
  "code": 422,
  "error_code": "signup_disabled",
  "msg": "Signups not allowed for this instance"
}
```
