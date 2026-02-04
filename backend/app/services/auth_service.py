"""Authentication service for user management and JWT tokens."""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..db.database import get_db
from ..db.models import UserDB
from ..models.user import TokenData, UserCreate, UserInDB, UserResponse

logger = logging.getLogger(__name__)

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[UserDB]:
    """Get a user by email."""
    result = await db.execute(select(UserDB).where(UserDB.email == email))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[UserDB]:
    """Get a user by username."""
    result = await db.execute(select(UserDB).where(UserDB.username == username))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[UserDB]:
    """Get a user by ID."""
    result = await db.execute(select(UserDB).where(UserDB.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_data: UserCreate) -> UserDB:
    """Create a new user."""
    # Check if email already exists
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    existing_user = await get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create user with hashed password
    hashed_password = get_password_hash(user_data.password)
    db_user = UserDB(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    await db.flush()
    await db.refresh(db_user)

    logger.info(f"Created new user: {user_data.email}")
    return db_user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[UserDB]:
    """Authenticate a user by email and password."""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[UserDB]:
    """Get the current authenticated user from JWT token."""
    if token is None:
        logger.warning("No token provided in request")
        return None

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub = payload.get("sub")
        if sub is None:
            logger.warning("Token payload missing 'sub' claim")
            return None
        # Convert sub to int (it's stored as string for JWT compliance)
        user_id = int(sub)
        token_data = TokenData(user_id=user_id)
    except (JWTError, ValueError) as e:
        logger.warning(f"JWT decode error: {e}")
        return None

    user = await get_user_by_id(db, user_id=token_data.user_id)
    if user is None:
        logger.warning(f"User not found for id: {token_data.user_id}")
    return user


async def get_current_active_user(
    current_user: Optional[UserDB] = Depends(get_current_user)
) -> UserDB:
    """Get current user and verify they are active. Raises if not authenticated."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def user_to_response(user: UserDB) -> UserResponse:
    """Convert UserDB to UserResponse."""
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        created_at=user.created_at,
    )
