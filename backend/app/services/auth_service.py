"""Authentication service — registration, login, JWT management."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import ConflictError, ValidationError, NotFoundError
from app.models.user import User, MedicalProfile
from app.models.subscription import Subscription
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse, UserBrief,
    RefreshRequest, TokenResponse,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, req: RegisterRequest) -> RegisterResponse:
        # Check for existing user
        result = await self.db.execute(select(User).where(User.email == req.email))
        if result.scalar_one_or_none():
            raise ConflictError("User with this email already exists")

        # Create user
        user = User(
            email=req.email,
            password_hash=hash_password(req.password),
            full_name=req.full_name,
            phone=req.phone,
        )
        self.db.add(user)
        await self.db.flush()

        # Create default free subscription
        subscription = Subscription(
            user_id=user.id,
            tier="free",
            status="active",
        )
        self.db.add(subscription)

        # Create medical profile if data provided
        if req.date_of_birth or req.gender:
            profile = MedicalProfile(
                user_id=user.id,
                date_of_birth=req.date_of_birth,
                gender=req.gender,
            )
            self.db.add(profile)

        await self.db.flush()

        # Generate tokens
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return RegisterResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            subscription_tier="free",
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def login(self, req: LoginRequest) -> LoginResponse:
        result = await self.db.execute(select(User).where(User.email == req.email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(req.password, user.password_hash):
            raise ValidationError("Invalid email or password")

        if not user.is_active:
            raise ValidationError("Account is deactivated")

        # Get subscription tier
        sub_result = await self.db.execute(
            select(Subscription)
            .where(Subscription.user_id == user.id, Subscription.status == "active")
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        sub = sub_result.scalar_one_or_none()
        tier = sub.tier if sub else "free"

        token_data = {"sub": str(user.id), "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserBrief(
                id=user.id,
                email=user.email,
                subscription_tier=tier,
                full_name=user.full_name,
            ),
        )

    async def refresh_token(self, req: RefreshRequest) -> TokenResponse:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise ValidationError("Invalid refresh token")

        user_id = payload.get("sub")
        result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User")

        token_data = {"sub": str(user.id), "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
        )

    async def get_profile(self, user_id: uuid.UUID):
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User")
        return user
