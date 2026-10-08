import json
import time
import uuid

import requests
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError, connection, transaction
from django.db.models import Count
from django.http import Http404
from django.shortcuts import render
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .dashboard import dashboard_repository, dashboard_summary
from .models import Commit, Repository, WebhookDelivery
from .serializers import CommitSerializer
from .services.crypto import decrypt_secret
from .services.github import GitHubClient
from .services.signatures import is_valid_github_signature
from .tasks import process_webhook


@api_view(["GET"])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return Response({"status": "unhealthy", "database": "down"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({"status": "healthy", "database": "up"})


@api_view(["GET"])
def github_connectivity(request):
    started_at = time.monotonic()
    try:
        response = GitHubClient().get("/meta")
        return Response(
            {
                "status": "up",
                "latency_ms": round((time.monotonic() - started_at) * 1000, 2),
                "github_status": response.status_code,
            }
        )
    except requests.RequestException as exc:
        return Response(
            {"status": "down", "latency_ms": round((time.monotonic() - started_at) * 1000, 2), "detail": str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@extend_schema(
    request=None,
    responses={
        202: OpenApiResponse(description="Evento aceito"),
        401: OpenApiResponse(description="Assinatura invalida"),
    },
)
@api_view(["POST"])
def github_webhook(request):
    signature = request.headers.get("X-Hub-Signature-256", "")
    event = request.headers.get("X-GitHub-Event", "")
    delivery_header = request.headers.get("X-GitHub-Delivery", "")
    try:
        delivery_id = uuid.UUID(delivery_header)
        payload = json.loads(request.body)
        repository = Repository.objects.get(github_id=payload["repository"]["id"], active=True)
    except (ValueError, json.JSONDecodeError, KeyError, Repository.DoesNotExist):
        return Response(
            {"detail": "Invalid delivery, payload, or unknown repository"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not is_valid_github_signature(request.body, signature, decrypt_secret(repository.webhook_secret)):
        return Response({"detail": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        with transaction.atomic():
            delivery = WebhookDelivery.objects.create(
                delivery_id=delivery_id,
                repository=repository,
                event=event,
                payload=payload,
            )
            transaction.on_commit(lambda: process_webhook.delay(delivery.pk))
    except IntegrityError:
        return Response({"status": "ignored", "reason": "duplicate delivery"}, status=status.HTTP_200_OK)
    return Response({"status": "accepted", "delivery_id": str(delivery_id)}, status=status.HTTP_202_ACCEPTED)


class CommitListView(ListAPIView):
    serializer_class = CommitSerializer

    def get_queryset(self):
        queryset = (
            Commit.objects.select_related("repository", "branch", "author")
            .prefetch_related("files")
            .order_by("-authored_at")
        )
        repository_id = self.request.query_params.get("repository_id")
        author = self.request.query_params.get("author")
        since = self.request.query_params.get("since")
        until = self.request.query_params.get("until")
        if repository_id:
            queryset = queryset.filter(repository_id=repository_id)
        if author:
            queryset = queryset.filter(author__login=author)
        if since:
            queryset = queryset.filter(authored_at__gte=since)
        if until:
            queryset = queryset.filter(authored_at__lte=until)
        return queryset


@api_view(["GET"])
def flow_metrics(request):
    queryset = Commit.objects.all()
    repository_id = request.query_params.get("repository_id")
    if repository_id:
        queryset = queryset.filter(repository_id=repository_id)
    by_author = list(queryset.values("author__login").annotate(commits=Count("id")).order_by("-commits"))
    return Response({"total_commits": queryset.count(), "commits_by_author": by_author})


def _dashboard_params(params):
    days = params.get("days", "7")
    repository_id = params.get("repository_id")
    if days not in ("7", "30") or (repository_id is not None and not repository_id.isdecimal()):
        raise ValueError("Selecione um período de 7 ou 30 dias e um repositório válido.")
    return int(days), repository_id


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_metrics(request):
    try:
        days, repository_id = _dashboard_params(request.query_params)
        repository, _ = dashboard_repository(repository_id)
    except (ValueError, Repository.DoesNotExist):
        return Response({"detail": "Parâmetros inválidos."}, status=status.HTTP_400_BAD_REQUEST)
    if repository is None:
        return Response({"detail": "Nenhum repositório ativo cadastrado."}, status=status.HTTP_404_NOT_FOUND)
    return Response(dashboard_summary(repository, days))


@login_required(login_url="/admin/login/")
def dashboard_page(request):
    try:
        days, repository_id = _dashboard_params(request.GET)
        repository, repositories = dashboard_repository(repository_id)
    except (ValueError, Repository.DoesNotExist) as exc:
        raise Http404("Repositório ou período inválido.") from exc
    return render(
        request,
        "github_sync/dashboard.html",
        {
            "summary": dashboard_summary(repository, days) if repository else None,
            "repositories": repositories,
            "selected_repository": repository,
            "days": days,
        },
    )
