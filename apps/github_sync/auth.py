import hmac
from dataclasses import dataclass
from functools import wraps
from urllib.parse import urlencode

from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication

SESSION_KEY = "access_token"


@dataclass(frozen=True)
class TokenUser:
    """Identidade autenticada por token de acesso, sem usuario no banco."""

    username: str
    is_authenticated: bool = True
    is_anonymous: bool = False
    is_active: bool = True
    is_staff: bool = False


def verify_access_token(token):
    """Retorna a identidade do token, ou None quando ele for invalido.

    Ponto unico de troca: quando o microservico de login existir, substitua a
    comparacao com ACCESS_TOKEN pela validacao do token emitido por ele.
    """
    expected = settings.ACCESS_TOKEN
    if not token or not expected:
        return None
    if hmac.compare_digest(token.encode(), expected.encode()):
        return TokenUser(username="access-token")
    return None


def bearer_token(request):
    scheme, _, token = request.META.get("HTTP_AUTHORIZATION", "").partition(" ")
    return token.strip() if scheme.lower() == "bearer" else ""


class AccessTokenAuthentication(BaseAuthentication):
    """Autentica a API pelo header `Authorization: Bearer <token>`."""

    def authenticate(self, request):
        token = bearer_token(request)
        if not token:
            return None
        user = verify_access_token(token)
        if user is None:
            raise exceptions.AuthenticationFailed("Token de acesso inválido.")
        return user, token

    def authenticate_header(self, request):
        return "Bearer"


class AccessTokenScheme(OpenApiAuthenticationExtension):
    target_class = "apps.github_sync.auth.AccessTokenAuthentication"
    name = "accessToken"

    def get_security_definition(self, auto_schema):
        return {"type": "http", "scheme": "bearer"}


def access_token_required(view):
    """Protege paginas HTML aceitando o token do header ou o salvo na sessao."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        user = verify_access_token(bearer_token(request) or request.session.get(SESSION_KEY, ""))
        if user is None:
            request.session.pop(SESSION_KEY, None)
            return redirect(f"{reverse('login')}?{urlencode({'next': request.get_full_path()})}")
        request.user = user
        return view(request, *args, **kwargs)

    return wrapper
