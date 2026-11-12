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

| Layer    | Technology                                                  |
|----------|-------------------------------------------------------------|
| Frontend | React 18, Vite 5, axios, HTML canvas                        |
| Backend  | Python 3.12, FastAPI, Uvicorn, PyJWT, psycopg               |
| Database | PostgreSQL 18 (Docker container)                            |
| Runtime  | Docker, Docker Compose, nginx (production frontend)         |

## Project structure

```
.
├── .gitignore
├── compose.base.yaml        # services shared by all environments
├── compose.dev.yaml         # development overrides (live reload, bind mounts)
├── compose.prod.yaml        # production overrides (baked-in code, nginx)
├── backend/
│   ├── Dockerfile           # development and production targets
│   ├── .dockerignore
│   ├── .env.example         # template for backend/.env.dev and backend/.env.prod
│   ├── main.py              # FastAPI app: auth, exports, database access
│   └── requirements.txt
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
| `CORS_ORIGINS` | Yes      | Comma-separated frontend addresses allowed to call the API.                                  |
| `DATABASE_URL` | Yes      | Connection string for PostgreSQL, e.g. `postgresql://USER:PASSWORD@ascii-db:5432/DBNAME`.    |

In Docker, the database host is the service name `ascii-db`. For a local run without Docker, use `localhost`.

Special characters in the password, such as `@`, `:`, `/`, or `%`, must be percent-encoded in `DATABASE_URL` (`@` becomes `%40`).

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

### Frontend (`frontend/.env.dev` and `frontend/.env.prod`)

```bash
cp frontend/.env.example frontend/.env.dev
cp frontend/.env.example frontend/.env.prod
```

| Variable       | Description                                                                       |
|----------------|-----------------------------------------------------------------------------------|
| `VITE_API_URL` | Address of the backend as seen from the browser, e.g. `http://localhost:8000`.    |

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

### Production

Each service runs the code baked into its image. The frontend is served by nginx.

```bash
docker compose -f compose.base.yaml -f compose.prod.yaml up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000

Stop a stack with `Ctrl+C`, or from another terminal with the same `-f` flags and `down`.

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

The schema is created automatically when the backend starts.

## Running without Docker

You need a local PostgreSQL server with a database and user matching `DATABASE_URL`. Run the backend and frontend in two terminals.

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Set `DATABASE_URL` in your env file to point at `localhost`, then start the server:

```bash
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Set `VITE_API_URL` to `http://localhost:8000` and make sure `CORS_ORIGINS` includes `http://localhost:5173`.

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

## Limitations

- The database schema is created in application code at startup. A migration tool will replace it.
- Login tokens are stored in the browser's `localStorage`, which is readable by any script on the page. Acceptable for a demo, not for sensitive data.
- The stack serves plain HTTP. Put it behind a reverse proxy with TLS before exposing it publicly.
- Client-side routing is not configured in nginx. Only the root route is supported today.

## Security

- Never commit `.env` files or `db/`. The `.gitignore` already excludes them.
- Replace the `JWT_SECRET` and database password in every environment, and rotate them if they're ever exposed.
- Passwords are hashed with PBKDF2-SHA256 (200,000 iterations).
- Publish the database port only in development, and only on `127.0.0.1` if you do.

## Troubleshooting

- **Browser can't reach the backend:** check that `VITE_API_URL` matches the backend's published port, and that the frontend's origin appears in `CORS_ORIGINS`. Rebuild the frontend after changing `VITE_API_URL`.
- **Production frontend doesn't load:** make sure you ran `--build` after switching from development. Stop the development stack first, since both stacks publish port 8000.
- **Backend exits with `failed to resolve host`:** the password in `DATABASE_URL` probably contains a special character. Percent-encode it.
- **Backend exits at startup with a `JWT_SECRET` or `DATABASE_URL` message:** the variable is missing or still set to the placeholder. Check the env file that the container receives.
- **Database authentication fails after changing the password:** Postgres only reads its password when the volume is created. Reset the volume or change the password inside the database.

## License

To be decided.
