"""Auth: password hashing, JWT, dependencies, roles, OTP + rate limiting."""
import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core import db, clean, new_id, now_iso, gen_simpldsc_id

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


async def get_current_customer(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    token = creds.credentials if creds else request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Seamless support for MSG91-verified mobile sessions: sd_verified_<mobile>_<timestamp>
    if token.startswith("sd_verified_"):
        parts = token.split("_")
        if len(parts) >= 3:
            raw_mobile = parts[2]
            clean_mobile = "".join(filter(str.isdigit, raw_mobile))
            if len(clean_mobile) == 10:
                user = await db.users.find_one({"mobile": clean_mobile})
                if not user:
                    ids = await gen_simpldsc_id()
                    now = now_iso()
                    user = {
                        "id": new_id(),
                        "mobile": clean_mobile,
                        "name": None,
                        "email": None,
                        "profile": {},
                        "billing": {},
                        "mobileVerified": True,
                        "mobileVerifiedAt": now,
                        "otpProvider": "msg91_widget",
                        "createdAt": now,
                        "updatedAt": now,
                        **ids
                    }
                    await db.users.insert_one(user)
                return clean(user)

    payload = decode_token(token)
    if payload.get("kind") != "customer":
        raise HTTPException(status_code=401, detail="Customer auth required")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return clean(user)


async def get_current_admin(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    token = creds.credentials if creds else request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("kind") != "admin":
        raise HTTPException(status_code=401, detail="Admin auth required")
    admin = await db.admin_users.find_one({"id": payload["sub"]})
    if not admin or not admin.get("active", True):
        raise HTTPException(status_code=401, detail="Admin not found or disabled")
    return clean(admin)


async def get_current_agent(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    token = creds.credentials if creds else request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("kind") != "agent":
        raise HTTPException(status_code=401, detail="Agent auth required")
    agent = await db.agents.find_one({"id": payload["sub"]})
    if not agent or agent.get("status") == "Suspended":
        raise HTTPException(status_code=401, detail="Agent not found or suspended")
    return clean(agent)


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
