"""Auth: password hashing, JWT, dependencies, roles, OTP + rate limiting."""
import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core import db, clean

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"

bearer = HTTPBearer(auto_error=False)

ROLES = ["super_admin", "staff", "doc_staff", "order_staff"]


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(subject: str, kind: str, extra: dict = None) -> str:
    payload = {
        "sub": subject,
        "kind": kind,  # 'customer' | 'admin'
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_customer(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    if payload.get("kind") != "customer":
        raise HTTPException(status_code=401, detail="Customer auth required")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return clean(user)


async def get_current_admin(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    if payload.get("kind") != "admin":
        raise HTTPException(status_code=401, detail="Admin auth required")
    admin = await db.admin_users.find_one({"id": payload["sub"]})
    if not admin or not admin.get("active", True):
        raise HTTPException(status_code=401, detail="Admin not found or disabled")
    return clean(admin)


def require_roles(*allowed):
    async def dep(admin: dict = Depends(get_current_admin)):
        if admin["role"] == "super_admin" or admin["role"] in allowed:
            return admin
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return dep


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
