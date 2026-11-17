Розділ 11 лабораторної, КТ-7, QR-2. Перевіряв за інструкцією
handover-check.md.


1. Виконавець

Олексій Романюк, група ІНФ-1, у команді — QA. Запуск проєкту раніше не
налаштовував, на цьому ноутбуці піднімав його вперше.

2. Середовище

- ОС: Windows 11 Pro 10.0.26300.9974, команди — у Git Bash
- Node.js v26.13.1, npm 11.20.0
- Docker 29.9.3
- git 2.56.1.windows.1
- Коміт: a94e4df (Merge pull request #38, BOOK-49)
- Початок: 17.11.2026, 15:33 (клон репозиторію)
- Кінець: 17.11.2026, 21:20

3. Кроки

| Крок | Що зробив | Результат | Час | Доказ |
|---|---|---|---|---|
| 0. Середовище | Записав версії | OK | 21:17 | див. вище |
| 1. Клон | git clone у handover-check/ | OK, але клонував по HTTPS, а не по SSH, як в інструкції | 15:33 | git reflog: clone from https://github.com/kulakdev/knu-krpp-group.git |
| 2. cp .env.example .env | як у README | OK | 15:39 | — |
| 2. npm ci | як у README | OK, але npm попередив, що не запустив install-скрипти prisma, @prisma/engines, esbuild, unrs-resolver | 15:42 | npm warn install-scripts 4 packages have install scripts not yet covered by allowScripts |
| 2. docker compose up -d db | як у README | OK | 15:42 | Container booking-db Started |
| 2. npm run db:migrate | як у README | OK, 3 міграції | 15:43 | Your database is now in sync with your schema. |
| 2. npm run db:seed | як у README | Проблема — падає | 15:43 | Error: Cannot find module '.prisma/client/default' |
| 2. (немає в README) | npx prisma generate, потім seed ще раз | OK | 15:43 | Generated Prisma Client (v7.10.0) → Seeded 3 users and 3 rooms. |
| 2. npm run dev | як у README | OK, сайт відкривається на localhost:3000 | 15:43 | Ready in 1050ms, GET / 200 |
| 3.1 | Alex Student (student-1) бронює Auditorium 101 на 25.11.2026 10:00–11:30 | OK, ACTIVE | 21:18 | "Booked Auditorium 101, 25.11.2026 10:00–11:30." |
| 3.2 | Maria Student (student-2) пробує Auditorium 101 на 11:00–12:00 | По суті OK, але не так, як в інструкції: повідомлення немає, аудиторія просто позначена Busy і кнопка Book неактивна. Перевірив через API — 409 | 21:18 | {"error":"The requested slot is already booked"}, HTTP 409 |
| 3.3 | Alex Student скасовує бронювання | OK, CANCELLED | 21:18 | "Cancelled Auditorium 101." |
| 3.4 | Alex Student бронює Grand Conference Hall на 26.11.2026 14:00–16:00 | OK, PENDING | 21:18 | "Requested Grand Conference Hall … waiting for admin approval." |
| 3.5 | Admin User на /admin підтверджує | OK, у студента стало ACTIVE | 21:19 | "Approved Grand Conference Hall for Alex Student." / "Approved by Admin User, 17.11.2026 21:19" |
| 4. Відновлення | bash scripts/restore.sh docs/handover/training-backup.sql | Не вийшло — такого файлу в репозиторії немає | 21:19 | scripts/restore.sh: line 13: docs/handover/training-backup.sql: No such file or directory |
| 5. npm run data:check | запустив після кроку 4 | Не збігається з очікуваним | 21:19 | вивід нижче |
| 6. Прибирання | не робив | — | — | — |

Вивід npm run data:check:

```text
> group-proj@0.1.0 data:check
> tsx scripts/data-check.ts

users=3 rooms=3 bookings=24
by status: ACTIVE=2 CANCELLED=22
key fields fingerprint: bbacb9e1ceb6fdee
invariants: OK
```

Мало бути bookings=5, ACTIVE=2 CANCELLED=2 REJECTED=1, fingerprint
7b6fbd338474134b. Розбіжність через те, що копію не відновлено: у базі
лишилися мої бронювання з кроку 3 і залишки від тестів та smoke. Таблицю
"My bookings" за березень 2030 з тієї ж причини перевірити не вдалося.

4. Результат

- Сервіс запустити вдалося, але тільки з npx prisma generate, якого в
  README немає.
- Основний сценарій пройшов повністю, у 3.2 інтерфейс поводиться трохи
  інакше, ніж описано.
- Відновити дані з резервної копії не вдалося — немає файлу.
- Вивід data:check з очікуваним не збігся (наслідок попереднього).

5. Що знайшов

1. У README Setup не вистачає npx prisma generate.
   npm run db:seed падає з Cannot find module '.prisma/client/default'.
   Схоже, npm 11 без дозволу не запускає install-скрипти Prisma, а
   prisma migrate dev у Prisma 7 клієнт сам не генерує. Я запустив
   npx prisma generate і повторив seed — спрацювало. Пропоную додати цю
   команду в README після npm ci або прописати postinstall у
   package.json.

2. Немає файлу docs/handover/training-backup.sql.
   Через це кроки 4 і 5 зробити неможливо. Шукав по всіх гілках
   (git log --all -- 'docs/handover/*') — файл ніде не комітили. Треба
   додати копію в репозиторій (або виправити шлях в інструкції) і
   пройти кроки 4–5 ще раз.

3. Крок 3.2 описаний не так, як працює інтерфейс.
   Інструкція чекає повідомлення про зайнятий слот, а в інтерфейсі
   кнопку Book просто не натиснеш — аудиторія Busy. Сервер сам по собі
   відповідає правильно (409). Краще переписати крок під реальну
   поведінку.

4. Імена користувачів не збігаються.
   В інструкції і README — student-1, student-2, admin-1, а в
   інтерфейсі — Alex Student, Maria Student, Admin User. Хто є хто,
   довелося дивитися в prisma/seed.ts. Варто дописати імена в README.

5. Дрібниці.
   Клон по SSH без налаштованого ключа не пройде, по HTTPS — нормально.
   Скрипти scripts/*.sh на Windows запускаються тільки через Git Bash
   (bash scripts/restore.sh …). Можна додати про це примітку.
