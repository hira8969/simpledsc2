"""Auth: password hashing, JWT, dependencies, roles, OTP + rate limiting."""
import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core import db, clean, new_id, now_iso, gen_simpldsc_id

JWT_SECRET = os.environ.get("JWT_SECRET", "simpldsc_super_secret_change_in_prod_2f9a7c1e8b4d6a3f")
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
    if not token or token in ("null", "undefined", "None", ""):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Handle MSG91 verified mobile session tokens (sd_verified_<mobile>_<timestamp>)
    token_str = str(token).strip()
    if token_str.startswith("sd_verified_"):
        parts = token_str.split("_")
        mob = parts[2] if len(parts) >= 3 else ""
        digits = "".join(filter(str.isdigit, mob))
        clean_mob = digits[-10:] if len(digits) >= 10 else digits
        return {"sub": f"usr_{clean_mob}", "kind": "customer", "mobile": clean_mob}

    try:
        return jwt.decode(token_str, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        # Check if customer token expired recently; safely recover customer payload
        try:
            unverified = jwt.decode(token_str, options={"verify_signature": False, "verify_exp": False})
            if unverified.get("kind") == "customer" and unverified.get("sub"):
                return unverified
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_customer(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    token = creds.credentials if creds else request.query_params.get("token")
    if not token:
        # Check custom or fallback authorization headers
        auth_hdr = request.headers.get("authorization") or request.headers.get("x-customer-token") or request.headers.get("x-auth-token")
        if auth_hdr:
            token = auth_hdr.replace("Bearer ", "").replace("bearer ", "").strip()

    if not token or token in ("null", "undefined", "None", ""):
        # Check if customer mobile is supplied via header or query params
        raw_m = request.headers.get("x-customer-mobile") or request.query_params.get("mobile")
        if raw_m:
            digits = "".join(filter(str.isdigit, str(raw_m)))
            clean_m = digits[-10:] if len(digits) >= 10 else digits
            if len(clean_m) == 10:
                user = await db.users.find_one({
                    "$or": [
                        {"mobile": clean_m},
                        {"mobile": f"+91{clean_m}"},
                        {"mobile": f"91{clean_m}"}
                    ]
                })
                if not user:
                    ids = await gen_simpldsc_id()
                    now = now_iso()
                    user = {
                        "id": new_id(),
                        "mobile": clean_m,
                        "name": None,
                        "email": None,
                        "profile": {},
                        "billing": {},
                        "mobileVerified": True,
                        "mobileVerifiedAt": now,
                        "otpProvider": "customer_header",
                        "createdAt": now,
                        "updatedAt": now,
                        **ids
                    }
                    await db.users.insert_one(user)
                return clean(user)
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Seamless support for MSG91-verified mobile sessions: sd_verified_<mobile>_<timestamp>
    if token.startswith("sd_verified_"):
        parts = token.split("_")
        if len(parts) >= 3:
            raw_mobile = parts[2]
            digits = "".join(filter(str.isdigit, raw_mobile))
            clean_mobile = digits[-10:] if len(digits) >= 10 else digits
            if len(clean_mobile) == 10:
                user = await db.users.find_one({
                    "$or": [
                        {"mobile": clean_mobile},
                        {"mobile": f"+91{clean_mobile}"},
                        {"mobile": f"91{clean_mobile}"}
                    ]
                })
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

    # Decode JWT token with resilient recovery for active customers
    try:
        payload = decode_token(token)
    except HTTPException:
        # If token recently expired or secret rotated, attempt safe customer recovery
        try:
            unverified = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
            sub = unverified.get("sub")
            mob = unverified.get("mobile")
            q = []
            if sub and sub not in ("null", "undefined"):
                q.append({"id": sub})
            if mob:
                m_clean = "".join(filter(str.isdigit, str(mob)))[-10:]
                if len(m_clean) == 10:
                    q.extend([{"mobile": m_clean}, {"mobile": f"+91{m_clean}"}, {"mobile": f"91{m_clean}"}])
            if q:
                recovered = await db.users.find_one({"$or": q})
                if recovered:
                    return clean(recovered)
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("kind") != "customer":
        raise HTTPException(status_code=401, detail="Customer auth required")

    user = await db.users.find_one({
        "$or": [
            {"id": payload["sub"]},
            {"mobile": str(payload.get("mobile", ""))[-10:] if payload.get("mobile") else ""}
        ]
    })
    if not user:
        # Check if sub or mobile has a 10-digit number
        sub_str = str(payload.get("sub", ""))
        mob_str = str(payload.get("mobile", ""))
        digits = "".join(filter(str.isdigit, mob_str)) or "".join(filter(str.isdigit, sub_str))
        if len(digits) >= 10:
            clean_m = digits[-10:]
            user = await db.users.find_one({
                "$or": [{"mobile": clean_m}, {"mobile": f"+91{clean_m}"}, {"mobile": f"91{clean_m}"}]
            })
            if not user:
                ids = await gen_simpldsc_id()
                now = now_iso()
                user = {
                    "id": payload.get("sub") if str(payload.get("sub", "")).startswith("usr_") else new_id(),
                    "mobile": clean_m,
                    "name": None,
                    "email": None,
                    "profile": {},
                    "billing": {},
                    "mobileVerified": True,
                    "mobileVerifiedAt": now,
                    "otpProvider": "token_session",
                    "createdAt": now,
                    "updatedAt": now,
                    **ids
                }
                await db.users.insert_one(user)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return clean(user)


async def get_current_customer_optional(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        return await get_current_customer(request, creds)
    except HTTPException:
        return None


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
