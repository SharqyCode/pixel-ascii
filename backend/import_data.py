import json
import psycopg
import os

DATABASE_URL = os.getenv("DATABASE_URL")
def get_conn():
    return psycopg.connect(DATABASE_URL)

with open("db.json", "r", encoding="utf-8") as old_db:
    data = json.load(old_db)
users = data["users"]

for user in users:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (%s, %s, %s)",
            (user["id"], user["username"], user["password_hash"]),
        )    