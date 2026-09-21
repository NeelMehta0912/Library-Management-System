# Library Management System — DBMS Case Study Project

**Pedagogy:** Case-based learning
**Topic:** Nested Subqueries, CTEs, Views, and Triggers
**Stack:** HTML + CSS frontend · Node/Express API · **MySQL 8** database — all three deployed as separate services in **one Railway project**

---

## 1. Architecture — three Railway services, one project

Railway is a general app platform, not just a database host, so all three
pieces of this project can live there together: a MySQL service, an
Express API service, and a static-file service for the frontend. They
sit in the same project and the two backend-facing ones talk over
Railway's free private network; only the frontend and the API need
public URLs (a browser has to be able to reach both of those from
anywhere).

```
Browser ──fetch──▶ Frontend service (Caddy, public/)   ──public URL──┐
                                                                       │
Browser ──fetch──▶ Backend service  (Express, backend/) ──public URL──┤
                          │                                           │
                          │ private network (mysql.railway.internal)  │
                          ▼                                           │
                    MySQL service   (mysql/schema.sql, private only) ◀┘
```

| Piece | Technology | Railway service | Networking |
|---|---|---|---|
| **Frontend** | Static HTML/CSS/JS, served by Caddy | `public/` | Public domain (browser loads the site here) |
| **Backend API** | Node.js + Express | `backend/` | Public domain (browser calls the API here) |
| **Database** | MySQL 8 | provisioned MySQL plugin | **Private only** — never needs to be public |

Only the database benefits from staying private: the frontend and
backend both need public URLs since a browser (which could be anywhere)
has to reach them directly.

**Before you start, know what you're signing up for:** Railway gives new
accounts a one-time **$5 usage credit, no credit card required** — comfortably
enough to build, demo, and run all three services through a viva. It is
**not indefinitely free**, though: once the credit runs out (billed by
the second, for storage/CPU/network), Railway's ongoing Free plan is
capped at ~$1/month of usage, which won't keep three services running
continuously. For a class project with a fixed demo date this is
normally a non-issue — just don't expect it to still be live, untouched,
months later without adding a card.

---

## 2. Repository structure

```
library-web/
├── public/                     # Frontend service — Root Directory = "public" on Railway
│   ├── Caddyfile               # tells Railway to serve this as a static site
│   ├── index.html              # Dashboard
│   ├── books.html              # Book catalogue
│   ├── members.html            # Members
│   ├── issue.html              # Issue / return a book (fires triggers)
│   ├── reports.html            # All 8 SQL demos (subqueries, CTEs, views)
│   ├── css/style.css
│   └── js/
│       ├── config.js           # <-- put your backend service's public URL here
│       ├── api.js              # calls the Express API (fetch wrapper)
│       ├── dashboard.js
│       ├── books.js
│       ├── members.js
│       ├── issue.js
│       └── reports.js
├── backend/                    # Backend service — Root Directory = "backend" on Railway
│   ├── package.json
│   ├── server.js
│   ├── db.js                   # MySQL connection pool (mysql2)
│   ├── .env.example             # copy to .env locally
│   └── routes/
│       ├── dashboard.js
│       ├── lookups.js          # authors, categories
│       ├── books.js
│       ├── members.js
│       ├── issues.js
│       └── reports.js
└── mysql/
    └── schema.sql               # RUN THIS FIRST — tables, views, triggers, procedures, sample data
```

---

## 3. Setup — Part A: create the project and the database

1. Go to **railway.app** → sign up (GitHub login is easiest) → **New
   Project** → **Provision MySQL** (or **+ New** → **Database** → **Add
   MySQL** if you already have a project open). No card needed to start.
   This project is where all three services will live.
2. Click into the **MySQL** service → **Variables** tab → note down
   `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
   Since the backend will also live in this same project (Part B), these
   **private** values are all you'll need — there's no reason to ever
   turn on Public Networking for this service.
3. Open the **Data** tab → **Query** (Railway's built-in SQL runner), or
   connect with the `mysql` CLI / any GUI client (temporarily enabling
   Public Networking just for this one-time setup step if you're
   connecting from your own laptop), and paste in the **entire
   contents** of `mysql/schema.sql`, then run it. This creates all 5
   tables, 3 views, 4 triggers, 9 stored procedures, and sample data.
4. (Optional but good practice) Instead of using the default root user
   in your app, create a scoped user for it — the exact `CREATE USER` /
   `GRANT` statements are at the bottom of `schema.sql`.

---

## 4. Setup — Part B: deploy the backend API as a second service

1. Push this whole `library-web/` folder to a GitHub repo.
2. In the **same Railway project** as your MySQL service → **+ New** →
   **GitHub Repo** → pick your repo.
3. Open the new service's **Settings**:
   - **Root Directory:** `backend`
   - **Start Command:** `npm start` (Railway auto-runs `npm install` as
     the build step, detected from `package.json`)
4. Go to its **Variables** tab and add, from `backend/.env.example`:
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — using the
   **private** `MYSQLHOST` etc. values from Part A — and `DB_SSL=false`.
   Leave `ALLOWED_ORIGIN` blank for now; you'll set it after Part D once
   you know the frontend's URL.
5. Under **Settings → Networking**, click **Generate Domain** — unlike
   the database, the API needs to be reachable by browsers, so it does
   need a public URL. You'll get something like
   `https://library-api-production.up.railway.app`. Visit it — you
   should see `{"ok":true,"service":"library-api"}`.
6. Open `public/js/config.js` and set:
   ```js
   const API_BASE_URL = "https://library-api-production.up.railway.app/api";
   ```

### Test the backend locally first (optional, but easier to debug)

```bash
cd library-web/backend
cp .env.example .env      # fill in the PUBLIC MySQL details (temporarily
                           # enable Public Networking on the MySQL service
                           # for this step, per the note in Part A step 3)
npm install
npm start                 # listens on http://localhost:3001
```

Leave `public/js/config.js` pointed at `http://localhost:3001/api` while
you do this, and turn Public Networking back off on the MySQL service
once you've deployed the backend (Part B needs it, going forward, to run
over the private network instead).

---

## 5. Setup — Part C: run the frontend locally (optional, before deploying)

```bash
cd library-web/public
python3 -m http.server 8000
# open http://localhost:8000
```

Click through Dashboard → Books → Members → Issue/Return → SQL Reports.
Issue a book, then return it late (edit `due_date` in your MySQL client to
force a late return) and watch `trg_before_return` auto-calculate the fine
live on the Members page.

---

## 6. Setup — Part D: deploy the frontend as a third service

1. Make sure `public/js/config.js` already points at your backend's
   Railway URL from Part B — Caddy just serves the files as they are, so
   this has to be set *before* you deploy.
2. In the **same Railway project** → **+ New** → **GitHub Repo** → the
   same repo again (Railway lets you add one repo as multiple services).
3. Open this new service's **Settings**:
   - **Root Directory:** `public`
   - Railway auto-detects the `Caddyfile` in there and serves the
     folder as a static site — no start command needed.
4. Under **Settings → Networking**, click **Generate Domain**. You'll
   get something like `https://library-frontend-production.up.railway.app`
   — that's your project link.

**Now go back to the backend service** (Part B) and set `ALLOWED_ORIGIN`
to this exact frontend URL (no trailing slash), so the API's CORS policy
only accepts requests from your deployed site. Redeploy/restart the
backend service for the change to take effect.

All three services sit in one Railway project dashboard, so you can see
their status, logs, and usage together. Nothing here requires a card to
get started — just keep an eye on your $5 credit (see the note in
Section 1) if the project needs to stay up for a long stretch.

---

## 7. What to explain in your viva — concept by concept

### Triggers (`mysql/schema.sql`, section 4)
- **`trg_before_issue`** — `BEFORE INSERT` on `issue_records`. Checks
  `available_copies`; if 0, `SIGNAL SQLSTATE '45000'` aborts the insert
  with a custom message. This is a business rule enforced *inside the
  database*, so it holds even if someone inserts directly and skips the
  API entirely.
- **`trg_after_issue`** — `AFTER INSERT`. Decrements `available_copies` by
  1. The app code never touches this column — the trigger is the only
  thing allowed to change it, which is exactly why it can't drift out of
  sync.
- **`trg_before_return`** and **`trg_after_return`** — together they do
  what Postgres's single `trg_after_return` did. MySQL doesn't support
  Postgres's `AFTER UPDATE OF col ... WHEN (...)` syntax, and a trigger
  reassigning the row that fired it only works from a `BEFORE` trigger
  (`SET NEW.col = ...`), not an `AFTER` one. So:
  - `trg_before_return` runs on the `NULL → not-NULL` `return_date`
    transition and sets `NEW.fine_amount` directly if the return is late.
  - `trg_after_return` runs on the same transition and restores
    `available_copies` on `books`.

  Same rule, same two side effects, just split to match how MySQL's
  trigger model actually works — a good thing to be able to explain if
  asked why there are 4 triggers instead of 3.

### Views (`schema.sql`, section 3)
Views package a repeated JOIN + filter as a virtual table so the app (or
any report) can `SELECT * FROM view_name` instead of re-writing the JOIN
every time:
- `available_books_view` — books with copies left, author/category pre-joined.
- `overdue_books_view` — currently unreturned books past their due date.
- `member_activity_view` — per-member totals (books issued, held, fined).

### Nested Subqueries (`schema.sql`, section 5)
- `members_above_average_borrowers()` — a subquery **inside a subquery**:
  count issues per member, average those counts, then keep members above
  that average (`HAVING COUNT(...) > (SELECT AVG(...) FROM (...))`).
- `books_never_issued()` — `NOT IN (SELECT DISTINCT book_id FROM issue_records)`.
- `most_expensive_per_category()` — a **correlated** subquery: the inner
  query references `b.category_id` from the *outer* row on every
  evaluation, unlike the other two which run independently once.

### CTEs (`schema.sql`, section 5)
- `book_popularity_ranking()` — one CTE feeding a window function (`RANK() OVER`).
- `paying_members()` — **two chained CTEs**, the second built on the first.
- `category_tree()` — a **recursive CTE**: the anchor selects root
  categories, the recursive term repeatedly joins `categories` back onto
  itself to walk down the tree, building a path string until no children
  remain. This is how you'd model any hierarchy (org charts, folder
  trees, comment threads) in SQL. Needs MySQL 8.0+ (`WITH RECURSIVE`
  isn't available in MySQL 5.x).

### Stored procedures, not functions
Postgres has table-returning `FUNCTION`s, callable as
`supabase.rpc('name')`. MySQL functions can only return one scalar value,
not a result set — so every one of the above is a `PROCEDURE` whose last
statement is a `SELECT`. The Express backend calls them with
`CALL proc_name()` and reads the returned result set exactly like a normal
query (`routes/reports.js`).

---

## 8. Troubleshooting

- **"Failed to fetch" / CORS error in the browser console** — either
  `config.js` has the wrong `API_BASE_URL`, or `ALLOWED_ORIGIN` on the
  backend service doesn't exactly match the frontend service's
  `*.up.railway.app` URL (no trailing slash, correct `https://`).
  Redeploy/restart the backend after changing environment variables.
- **"Cannot issue: no copies of this book are available"** — that's
  `trg_before_issue`'s `SIGNAL` message, surfacing correctly through the
  API's error handler into the page's flash message. Working as intended.
- **`ER_NOT_SUPPORTED_AUTH_MODE` connecting to MySQL** — some managed
  hosts default to `caching_sha2_password`; `mysql2` supports it out of
  the box, so this usually means the host/port/credentials are wrong
  rather than an auth-plugin issue — double check them.
- **Blank pages / "Api is not defined"** — make sure `config.js` loads
  *before* `api.js` in every HTML file (it already does in the files
  provided).
- **Frontend service shows a blank page or 404** — check that its Root
  Directory is set to `public` (not the repo root) and that
  `public/Caddyfile` exists; Railway needs the Caddyfile to auto-detect
  this as a static site.
- **Recursive CTE or `RANK()` errors** — you're most likely connected to
  a MySQL 5.7 instance rather than 8.0+. Check your MySQL service's
  version; Railway's MySQL plugin provisions a recent MySQL 8/9 image by
  default.
- **Backend can't connect to MySQL ("connection refused"/timeout)** —
  almost always means you used the public `MYSQLHOST`/`MYSQLPORT` for a
  service that's *inside* the same Railway project (use the private
  `mysql.railway.internal` ones instead — Part A, step 2), or, if you're
  testing from your own laptop, that Public Networking isn't enabled on
  the MySQL service for that temporary local test.
- **Everything suddenly unreachable after it worked fine before** —
  check your Railway project's usage against the $5 trial credit
  (Project → Usage). Once it's exhausted, all three services stop until
  you add a card or it resets under the ongoing Free plan's small
  monthly allowance.

## 9. Alternative: staying 100% inside Google Cloud

If your faculty insists the database itself must be hosted on Google
infrastructure, you can swap the MySQL service for **Cloud SQL for
MySQL** and deploy the frontend/backend as **Cloud Run** services instead
(same code, no changes needed beyond a `Dockerfile` each). The trade-offs
versus the all-Railway setup above:
- Requires a GCP **billing account** (a credit card, even though usage
  can often stay within free-tier quotas for a class project).
- Cloud SQL itself is a **paid** service (the smallest instance runs a
  few dollars a month).

We didn't default to this because it can genuinely cost money and needs a
credit card on file — not ideal for a class project. Ask if you'd like
this version built out instead.
