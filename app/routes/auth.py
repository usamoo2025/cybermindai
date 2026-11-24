import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Response
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pwdlib import PasswordHash
import psycopg

from app.database import get_connection
from fastapi import APIRouter, HTTPException, Request, Response


# ==========================================
# 1. AUTHENTICATION CONFIGURATION
# ==========================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

password_hasher = PasswordHash.recommended()


# ==========================================
# 2. REGISTRATION REQUEST VALIDATION
# ==========================================

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: str = Field(
        min_length=5,
        max_length=255,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )
    password: str = Field(min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)

# ==========================================
# 3. USER REGISTRATION
# ==========================================

@router.post("/register", status_code=201)
def register_user(user: UserRegister):

    # Normalize the submitted information
    username = user.username.strip()
    email = user.email.strip().lower()

    if not username:
        raise HTTPException(
            status_code=422,
            detail="Username cannot be empty"
        )

    # Hash the password
    hashed_password = password_hasher.hash(user.password)

    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO users
                (username, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, username, email, created_at
                """,
                (username, email, hashed_password)
            )

            new_user = cursor.fetchone()

        connection.commit()

        return {
            "message": "Account created successfully",
            "user": {
                "id": new_user[0],
                "username": new_user[1],
                "email": new_user[2],
                "created_at": new_user[3]
            }
        }

    except psycopg.errors.UniqueViolation:
        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email address is already registered"
        )

    except Exception:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not create user account"
        )

    finally:
        connection.close()

@router.post("/login")
def login_user(user: UserLogin, response: Response):

    # 1. Normalize email
    email = user.email.strip().lower()

    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            # 2. Find the registered user
            cursor.execute(
                """
                SELECT id, username, email, password_hash
                FROM users
                WHERE email = %s
                """,
                (email,)
            )

            db_user = cursor.fetchone()

        # 3. Check whether the account exists
        if db_user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # 4. Verify the submitted password
        password_is_valid = password_hasher.verify(
            user.password,
            db_user[3]
        )

        if not password_is_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # 5. Generate a random session token
        session_token = secrets.token_urlsafe(32)

        # 6. Hash the token before storing it
        token_hash = hashlib.sha256(
            session_token.encode()
        ).hexdigest()

        # 7. Set session expiration
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        # 8. Save the session in PostgreSQL
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO user_sessions
                (user_id, token_hash, expires_at)
                VALUES (%s, %s, %s)
                """,
                (db_user[0], token_hash, expires_at)
            )

        connection.commit()

        # 9. Send the session token as an HttpOnly cookie
        response.set_cookie(
            key="cybermind_session",
            value=session_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=604800,
            path="/"
        )

        # 10. Return account information
        return {
            "message": "Login successful",
            "user": {
                "id": db_user[0],
                "username": db_user[1],
                "email": db_user[2]
            }
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not complete login"
        )

    finally:
        connection.close()
def get_current_user(request: Request):

    # 1. Read the session cookie
    session_token = request.cookies.get("cybermind_session")

    if not session_token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    # 2. Hash the received token
    token_hash = hashlib.sha256(
        session_token.encode()
    ).hexdigest()

    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            # 3. Verify session and retrieve its owner
            cursor.execute(
                """
                SELECT u.id, u.username, u.email
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token_hash = %s
                AND s.expires_at > NOW()
                """,
                (token_hash,)
            )

            current_user = cursor.fetchone()

        if current_user is None:
            raise HTTPException(
                status_code=401,
                detail="Session is invalid or expired"
            )

        # 4. Return authenticated user information
        return {
            "id": current_user[0],
            "username": current_user[1],
            "email": current_user[2]
        }

    finally:
        connection.close()
@router.post("/logout")
def logout_user(
    request: Request,
    response: Response
):

    session_token = request.cookies.get("cybermind_session")

    if session_token:
        token_hash = hashlib.sha256(
            session_token.encode()
        ).hexdigest()

        connection = get_connection()

        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM user_sessions
                    WHERE token_hash = %s
                    """,
                    (token_hash,)
                )

            connection.commit()

        except Exception:
            connection.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not complete logout"
            )

        finally:
            connection.close()

    response.delete_cookie(
        key="cybermind_session",
        path="/",
        httponly=True,
        secure=False,
        samesite="lax"
    )

    return {
        "message": "Logout successful"
    }