from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from jwt import InvalidTokenError, PyJWKClient, PyJWKClientError
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication, get_authorization_header


@dataclass(frozen=True)
class PlatformPrincipal:
    """Authenticated identity issued by the platform's Module 1."""

    id: UUID
    claims: dict

    @property
    def pk(self):
        return self.id

    @property
    def username(self) -> str:
        return str(self.id)

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    def get_username(self) -> str:
        return self.username


@lru_cache(maxsize=8)
def _jwks_client(url: str, cache_seconds: int, timeout: int) -> PyJWKClient:
    return PyJWKClient(
        url,
        cache_keys=True,
        cache_jwk_set=True,
        lifespan=cache_seconds,
        timeout=timeout,
    )


class Module1JWTAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if not header:
            return None
        if header[0].decode("ascii", errors="ignore").lower() != self.keyword.lower():
            return None
        if len(header) != 2:
            raise exceptions.AuthenticationFailed("Cabeçalho Bearer inválido.")
        try:
            token = header[1].decode("ascii")
        except UnicodeError as exc:
            raise exceptions.AuthenticationFailed("Token inválido.") from exc

        try:
            client = _jwks_client(
                settings.MODULE1_JWKS_URL,
                settings.MODULE1_JWKS_CACHE_SECONDS,
                settings.MODULE1_JWKS_TIMEOUT,
            )
            signing_key = client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.MODULE1_JWT_AUDIENCE,
                issuer=settings.MODULE1_JWT_ISSUER,
                options={"require": ["sub", "iss", "aud", "iat", "exp", "jti"]},
            )
            subject = UUID(str(claims["sub"]))
        except (InvalidTokenError, PyJWKClientError, ValueError, KeyError) as exc:
            raise exceptions.AuthenticationFailed("Token do Módulo 1 inválido ou expirado.") from exc

        return PlatformPrincipal(id=subject, claims=claims), token

    def authenticate_header(self, request) -> str:
        return self.keyword


class Module1JWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "apps.github_sync.authentication.Module1JWTAuthentication"
    name = "bearerAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT RS256 emitido pelo serviço de autenticação do Módulo 1.",
        }
