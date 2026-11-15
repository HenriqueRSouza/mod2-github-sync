from django.conf import settings
from rest_framework.permissions import BasePermission


class Module1AccessPermission(BasePermission):
    """Require a valid Module 1 identity; an opt-out must be explicit."""

    message = "Autenticação do Módulo 1 é obrigatória."

    def has_permission(self, request, view):
        if not settings.MODULE1_AUTH_REQUIRED:
            return True
        return bool(request.user and request.user.is_authenticated)
