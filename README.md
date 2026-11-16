# Pixel ASCII

A retro-styled web app that converts uploaded pictures into ASCII art. Drag the picture across a vertical divider to compare the original on the left with its ASCII version on the right.

## Features

- Upload an image or drag and drop it onto the board
- Live split view: original on the left, ASCII on the right
- Drag the picture freely; the ASCII grid moves with it
- Three detail levels (Fine, Medium, Chunky)
- Colored or monochrome ASCII
- Two themes: Retro (SNES-style) and Matrix (falling-character background)
- Export the ASCII art as a PNG image or a TXT file
- Register and log in; exports require an account

## Tech stack

| Layer      | Technology                                                 |
|------------|------------------------------------------------------------|
| Frontend   | React 18, Vite 5, axios, HTML canvas                       |
| Backend    | Python 3.12, FastAPI, Uvicorn, PyJWT, psycopg, slowapi     |
| Database   | PostgreSQL 18, schema managed by dbmate migrations         |
| Proxy      | Caddy 2 (HTTPS and routing, production only)               |
| Runtime    | Docker, Docker Compose, nginx (production frontend)        |

## Project structure

```
.
├── .gitignore
├── compose.base.yaml        # services shared by all environments
├── compose.dev.yaml         # development overrides (live reload, bind mounts)
├── compose.prod.yaml        # production overrides (baked-in code, Caddy, HTTPS)
├── caddy/
│   └── Caddyfile            # routes ascii.test to the frontend and /api to the backend
├── scripts/
│   └── backup_db.sh         # dumps the production database to ~/backups
├── backend/
│   ├── Dockerfile           # development and production targets
│   ├── .dockerignore
│   ├── .env.example         # template for backend/.env.dev and backend/.env.prod
│   ├── main.py              # FastAPI app: auth, exports, rate limits, database access
│   ├── requirements.txt
│   └── migrations/          # dbmate migrations and schema snapshot
│       ├── Dockerfile       # one-off migration image
│       ├── schema.sql       # committed snapshot of the current schema
│       ├── .env.dev         # DATABASE_URL for dev (never committed)
│       └── .env.prod        # DATABASE_URL for prod (never committed)
├── db/                      # local-only: database env files (never committed)
│   ├── .env.dev
│   └── .env.prod
└── frontend/
    ├── Dockerfile           # development, build, and production stages
    ├── .dockerignore
    ├── .env.example         # template for frontend/.env.dev and frontend/.env.prod
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx
        ├── api/             # axios client and API calls
        ├── context/         # auth and alert state
        ├── components/      # board, controls, dialogs, matrix rain
        ├── lib/             # ASCII conversion, drawing, exports
        └── styles/
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (`docker compose version`)
- For running without Docker: Python 3.12+, Node.js 24+, and a local PostgreSQL server

## Configuration

Each environment has its own env files. Real values are never committed; copy the templates and fill them in.

### Backend (`backend/.env.dev` and `backend/.env.prod`)

```bash
cp backend/.env.example backend/.env.dev
cp backend/.env.example backend/.env.prod
```

| Variable       | Required | Description                                                                                  |
|----------------|----------|----------------------------------------------------------------------------------------------|
| `JWT_SECRET`   | Yes      | Secret used to sign login tokens. Use a long random value, unique per environment.           |
| `CORS_ORIGINS` | Yes      | Comma-separated frontend addresses allowed to call the API. Production uses `https://ascii.test`. |
| `DATABASE_URL` | Yes      | Connection string for PostgreSQL, e.g. `postgresql://USER:PASSWORD@ascii-db:5432/DBNAME`.    |

In Docker, the database host is the service name `ascii-db`. For a local run without Docker, use `localhost`.

Special characters in the password, such as `@`, `:`, `/`, or `%`, must be percent-encoded in `DATABASE_URL` (`@` becomes `%40`). Production uses a hexadecimal password, which avoids this.

Generate a secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Database (`db/.env.dev` and `db/.env.prod`)

Create one file per environment with the values the PostgreSQL container uses on first start:

| Variable            | Description                                                          |
|---------------------|----------------------------------------------------------------------|
| `POSTGRES_USER`     | Database user. Must match the user in `DATABASE_URL`.                |
| `POSTGRES_PASSWORD` | Database password. Must match the password in `DATABASE_URL`.        |
| `POSTGRES_DB`       | Database name. Must match the database in `DATABASE_URL`.            |

Postgres reads these only when it first creates its data volume. Changing them later doesn't update an existing database.

### Migrations (`backend/migrations/.env.dev` and `backend/migrations/.env.prod`)

Each file holds only the `DATABASE_URL` line, so the migration service never sees the JWT secret. Use the same value as the backend's file for that environment.

### Frontend (`frontend/.env.dev` and `frontend/.env.prod`)

```bash
cp frontend/.env.example frontend/.env.dev
cp frontend/.env.example frontend/.env.prod
```

| Variable       | Description                                                                       |
|----------------|-----------------------------------------------------------------------------------|
| `VITE_API_URL` | Address of the backend as seen from the browser. Dev: `http://localhost:8000`. Prod: `https://ascii.test`. |

Vite bakes this value into the JavaScript at build time. Changing it requires rebuilding the frontend.

## Running with Docker Compose

The Compose setup uses a base file plus one override per environment. Run one environment at a time, because both publish port 8000.

### Development

Live reload for all services, with your source folders mounted into the containers.

```bash
docker compose -f compose.base.yaml -f compose.dev.yaml up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (interactive docs at `/docs`)
- Database: `127.0.0.1:5433` on your machine only

### Production

Caddy is the only service exposed to the network. It serves the frontend and the API over HTTPS on one domain, and everything else runs on the internal Docker network.

```bash
docker compose -f compose.base.yaml -f compose.prod.yaml up -d --build
```

- Site: https://ascii.test
- Requests to `/api/...` go to the backend, and everything else goes to the frontend.

Caddy issues its certificate from its own local authority, because `ascii.test` isn't a public domain. Browsers warn until you trust that authority. See Deployment below.

Stop a stack with `Ctrl+C` in the foreground, or with `down` and the same `-f` flags.

### Data storage

User accounts are stored in PostgreSQL. The database keeps its data in a named volume, so it survives container restarts:

- Development uses the `ascii-db-dev` volume.
- Production uses the `ascii-db-prod` volume.

Compose prefixes volume names with the project folder name, so check the exact names with `docker volume ls`. Dev and prod never share data.

To reset the development database, stop the stack, remove its volume, and start again. The new database is created with the values in `db/.env.dev`.

To inspect the database without opening a shell in the container:

```bash
docker compose -f compose.base.yaml -f compose.dev.yaml exec ascii-db psql -U USER -d DBNAME -c "SELECT id, username, created_at FROM users;"
```

## Database migrations

Schema changes are managed with [dbmate](https://github.com/amacneil/dbmate). Migration files live in `backend/migrations/` and are named `YYYYMMDDHHMMSS_name.sql`.

- Each environment runs the migrations automatically with the `ascii-migrate` service. The backend starts only after it finishes successfully.
- To add a change, create a new migration file with a later timestamp. Don't edit files that have already been applied.
- `backend/migrations/schema.sql` is a snapshot of the current schema. Update it whenever a migration changes the schema, and commit it so schema changes show up in review.

To see which migrations have run, use the `ascii-migrate` logs or dbmate's status command against the database.

## Deployment

The production stack runs on a Linux server. The steps below assume an Ubuntu VM; a VPS works the same way.

### 1. Prepare the server

- Install Docker and the Compose plugin from Docker's official repository.
- Enable the firewall and allow only SSH (22), HTTP (80), and HTTPS (443).
- Install `git` and clone the repository to `~/ascii`.

### 2. Create the production env files

On the server, create these files with production values, following the templates above:

- `db/.env.prod`
- `backend/.env.prod`
- `backend/migrations/.env.prod`
- `frontend/.env.prod`

Generate new values on the server for `JWT_SECRET` and the database password. Never reuse dev values.

### 3. Start the stack

```bash
cd ~/ascii
docker compose -f compose.base.yaml -f compose.prod.yaml up -d --build
docker compose -f compose.base.yaml -f compose.prod.yaml ps
```

The database and backend should show `healthy`, and `ascii-migrate` should show `exited (0)`.

### 4. Trust Caddy's certificate on your machine

Copy Caddy's local root certificate from the server, then import it into your browser's certificate authorities. Caddy stores it in its data volume:

```bash
docker compose -f compose.base.yaml -f compose.prod.yaml cp caddy:/data/caddy/pki/authorities/local/root.crt ~/ascii-local-root.crt
```

Import the file in your browser's settings, and mark it as trusted for identifying websites.

### 5. Update

```bash
cd ~/ascii
git pull
docker compose -f compose.base.yaml -f compose.prod.yaml up -d --build
```

### 6. Back up the database

`scripts/backup_db.sh` writes a compressed dump of the production database to `~/backups` and deletes dumps older than 14 days. Schedule it with cron on the server:

```
0 3 * * * /home/deploy/ascii/scripts/backup_db.sh >> /home/deploy/backups/backup.log 2>&1
```

Copy backups off the server regularly, for example with `rsync` from another machine, so a lost server doesn't mean lost data.

### Restore a backup

Restore into a separate test database first, so production stays untouched. Run these on the server:

```bash
cd ~/ascii
COMPOSE="docker compose -f compose.base.yaml -f compose.prod.yaml"
set -a; . ./db/.env.prod; set +a

# pick the newest dump
DUMP=$(ls -t ~/backups/ascii_db-*.dump | head -1)

# restore into a test database
$COMPOSE exec -T ascii-db createdb -U "$POSTGRES_USER" restore_test
$COMPOSE exec -T ascii-db pg_restore -U "$POSTGRES_USER" -d restore_test < "$DUMP"

# check the data
$COMPOSE exec -T ascii-db psql -U "$POSTGRES_USER" -d restore_test -c "SELECT username, created_at FROM users;"

# remove the test database
$COMPOSE exec -T ascii-db dropdb -U "$POSTGRES_USER" restore_test
```

If `pg_restore` reports errors, the dump is damaged. Fix that before relying on backups.

To restore into the live database after data loss, stop the backend first so no writes happen during the restore, then run `pg_restore` with `--clean` against `$POSTGRES_DB` instead of `restore_test`. Confirm the dump file before running it, since this replaces the current data.

## API reference

All protected routes expect an `Authorization: Bearer <token>` header, which the frontend sends automatically after login.

| Method | Path                  | Auth | Description                                   |
|--------|-----------------------|------|-----------------------------------------------|
| POST   | `/api/auth/register`  | No   | Create an account; returns a token and user   |
| POST   | `/api/auth/login`     | No   | Log in; returns a token and user              |
| GET    | `/api/auth/me`        | Yes  | Return the logged-in user                     |
| POST   | `/api/export/txt`     | Yes  | Return the submitted ASCII text as a file     |
| POST   | `/api/export/png`     | Yes  | Return the submitted PNG data URL as a file   |
| GET    | `/health`             | No   | Check that the API and database respond       |

Usernames are 3 to 32 letters, digits, or underscores, and are unique regardless of case. Passwords are at least 6 characters.

Login allows 5 attempts per minute per client address, and registration allows 3 per minute. Exceeding a limit returns `429`.

## Limitations

- Rate limit counters are stored in memory. They reset when the backend restarts, and each worker keeps its own count. Move them to shared storage such as Redis before running multiple workers.
- Schema changes go through dbmate migrations only. Never edit a migration that has already run; add a new one instead.
- Login tokens are stored in the browser's `localStorage`, which is readable by any script on the page. Moving them to `httpOnly` cookies is planned.
- The backend runs a single Uvicorn process. Multiple workers are planned.
- Client-side routing is not configured in nginx. Only the root route is supported.

## Security

- Never commit `.env` files or `db/`. The `.gitignore` already excludes them.
- Replace the `JWT_SECRET` and database password in every environment, and rotate them if they're ever exposed.
- Passwords are hashed with PBKDF2-SHA256 (200,000 iterations).
- Only Caddy publishes ports in production. The database and backend stay on the internal network.
- Publish the database port only in development, and only on `127.0.0.1`.

## Troubleshooting

- **Browser can't reach the backend:** check that `VITE_API_URL` matches the site address, and that the site's origin appears in `CORS_ORIGINS`. Rebuild the frontend after changing `VITE_API_URL`.
- **Certificate warning in the browser:** the local authority isn't trusted yet. See step 4 of Deployment.
- **Backend exits with `failed to resolve host`:** the password in `DATABASE_URL` probably contains a special character. Percent-encode it.
- **Backend exits at startup with a `JWT_SECRET` or `DATABASE_URL` message:** the variable is missing or still set to the placeholder. Check the env file the container receives.
- **Database authentication fails after changing the password:** Postgres only reads its password when the volume is created. Reset the volume or change the password inside the database.
- **Every login attempt returns `429`:** the rate limiter sees one client address. Check that Caddy forwards `X-Forwarded-For`.

## License

To be decided.
