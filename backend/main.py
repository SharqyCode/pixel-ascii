import base64, hashlib, hmac, os, secrets, uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")  # local runs only; in Docker the env file is injected

# If JWT secret is not set or kept default, refuse to start up server
SECRET = os.getenv("JWT_SECRET", "")
if not SECRET or SECRET == "dev-secret-change-me":
    raise RuntimeError(
        "JWT_SECRET is not set. Add a long random value to your env file "
        "or pass it with --env-file / the compose environment."
    )

# e.g. postgresql://ascii_user:password@ascii-db:5432/ascii_db
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Point it at the Postgres server, for example "
        "postgresql://USER:PASSWORD@ascii-db:5432/DBNAME"
    )

ALGO = "HS256"
TOKEN_MINUTES = 60
# comma-separated list, e.g. CORS_ORIGINS=http://localhost:5173,https://myapp.example.com
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]


def get_conn():
    return psycopg.connect(DATABASE_URL)


app = FastAPI(title="Pixel ASCII API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
bearer = HTTPBearer()


# ---------- database access ----------
def find_user(username):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE lower(username) = lower(%s)",
            (username,),
        ).fetchone()
    if row is None:
        return None
    return {"id": row[0], "username": row[1], "password_hash": row[2]}


# ---------- password hashing (stdlib only) ----------
def hash_password(pw, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 200_000).hex()
    return f"{salt}${digest}"

def verify_password(pw, stored):
    salt, _ = stored.split("$")
    return hmac.compare_digest(hash_password(pw, salt), stored)


# ---------- JWT auth ----------
def create_token(user):
    exp = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_MINUTES)
    return jwt.encode({"sub": user["username"], "exp": exp}, SECRET, algorithm=ALGO)

def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = find_user(payload["sub"])
    if not user:
        raise HTTPException(401, "Unknown user")
    return user

def public(user):
    return {"id": user["id"], "username": user["username"]}


# ---------- auth routes ----------
class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=6, max_length=128)

@app.post("/api/auth/register", status_code=201)
def register(body: Credentials):
    user = {
        "id": str(uuid.uuid4()),
        "username": body.username,
        "password_hash": hash_password(body.password),
    }
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO users (id, username, password_hash) VALUES (%s, %s, %s)",
                (user["id"], user["username"], user["password_hash"]),
            )
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Username already taken")
    return {"token": create_token(user), "user": public(user)}

@app.post("/api/auth/login")
def login(body: Credentials):
    user = find_user(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Wrong username or password")
    return {"token": create_token(user), "user": public(user)}

@app.get("/api/auth/me")
def me(user=Depends(current_user)):
    return public(user)


# ---------- protected export routes ----------
class TextExport(BaseModel):
    content: str = Field(max_length=2_000_000)

class PngExport(BaseModel):
    data_url: str = Field(max_length=20_000_000)

@app.post("/api/export/txt")
def export_txt(body: TextExport, user=Depends(current_user)):
    return Response(body.content.encode(), media_type="text/plain",
                    headers={"Content-Disposition": 'attachment; filename="ascii.txt"'})

@app.post("/api/export/png")
def export_png(body: PngExport, user=Depends(current_user)):
    prefix = "data:image/png;base64,"
    if not body.data_url.startswith(prefix):
        raise HTTPException(400, "Expected a PNG data URL")
    return Response(base64.b64decode(body.data_url[len(prefix):]), media_type="image/png",
                    headers={"Content-Disposition": 'attachment; filename="ascii.png"'})


# ---------- health check (used by Docker Compose) ----------
@app.get("/health")
def health():
    with get_conn() as conn:
        conn.execute("SELECT 1")
    return {"status": "ok"}
