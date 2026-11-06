import base64
import json
import logging
import time
import uuid

import requests
from cryptography.exceptions import InvalidTag
from django.conf import settings
from django.db import IntegrityError, connection, transaction
from django.db.models import Count
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.generics import DestroyAPIView, ListAPIView, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .dashboard import dashboard_repository, dashboard_summary
from .models import Branch, Commit, PullRequest, Repository, WebhookDelivery
from .permissions import Module1AccessPermission
from .serializers import (
    BranchSerializer,
    CommitDiffRequestSerializer,
    CommitDiffResponseSerializer,
    CommitSerializer,
    DashboardMetricsSerializer,
    ErrorSerializer,
    FlowMetricsSerializer,
    GitHubConnectivitySerializer,
    HandshakeRequestSerializer,
    HandshakeResponseSerializer,
    HealthSerializer,
    PlatformProjectDraftSerializer,
    PlatformRegistrationSerializer,
    PlatformTokenRequestSerializer,
    PlatformTokenResponseSerializer,
    PullRequestSerializer,
    ReadinessSerializer,
    RepositoryContentRequestSerializer,
    RepositoryContentResponseSerializer,
    RepositoryCreateRequestSerializer,
    RepositoryCreateResponseSerializer,
    RepositoryIntelligenceSerializer,
    RepositorySerializer,
    RepositorySyncRequestSerializer,
    RepositorySyncResponseSerializer,
    WebhookDeliverySerializer,
)
from .services.credentials import store_repository_credential
from .services.crypto import decrypt_secret
from .services.github import GitHubClient, GitHubRateLimitError
from .services.health import readiness_report
from .services.intelligence import repository_intelligence
from .services.platform import (
    PlatformServiceError,
    create_project,
    current_user,
    get_project,
    issue_token,
    list_projects,
    register_user,
)
from .services.signatures import is_valid_github_signature
from .services.sync import sync_repository_from_github
from .tasks import process_webhook
from .throttles import PlatformAuthThrottle

logger = logging.getLogger(__name__)


def _error_response(code: str, detail: str, http_status: int) -> Response:
    return Response({"code": code, "detail": detail}, status=http_status)


def _platform_error_response(exc: PlatformServiceError) -> Response:
    payload = exc.detail if isinstance(exc.detail, dict) else {"detail": str(exc.detail)}
    return Response(payload, status=exc.status_code)


def _owned_repositories(request):
    queryset = Repository.objects.filter(active=True)
    if not settings.MODULE1_AUTH_REQUIRED:
        return queryset
    return queryset.filter(platform_user_id=request.user.id)


@extend_schema(request=PlatformRegistrationSerializer, responses={200: dict, 422: dict, 503: ErrorSerializer}, auth=[])
@api_view(["POST"])
@throttle_classes([PlatformAuthThrottle])
def platform_register(request):
    serializer = PlatformRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        return Response(register_user(serializer.validated_data))
    except PlatformServiceError as exc:
        return _platform_error_response(exc)


@extend_schema(
    request=PlatformTokenRequestSerializer,
    responses={200: PlatformTokenResponseSerializer, 401: ErrorSerializer, 422: dict, 503: ErrorSerializer},
    auth=[],
)
@api_view(["POST"])
@throttle_classes([PlatformAuthThrottle])
def platform_token(request):
    serializer = PlatformTokenRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        return Response(issue_token(serializer.validated_data["email"], serializer.validated_data["password"]))
    except PlatformServiceError as exc:
        return _platform_error_response(exc)


@extend_schema(responses={200: dict, 401: ErrorSerializer, 503: ErrorSerializer})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def platform_me(request):
    try:
        return Response(current_user(request.auth))
    except PlatformServiceError as exc:
        return _platform_error_response(exc)


@extend_schema(
    request=PlatformProjectDraftSerializer,
    responses={200: dict, 201: dict, 401: ErrorSerializer, 503: ErrorSerializer},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def platform_projects(request):
    try:
        if request.method == "GET":
            return Response(list_projects(request.auth))
        serializer = PlatformProjectDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(create_project(request.auth, serializer.validated_data), status=status.HTTP_201_CREATED)
    except PlatformServiceError as exc:
        return _platform_error_response(exc)


@extend_schema(
    responses={
        200: HealthSerializer,
        503: HealthSerializer,
    },
)
@api_view(["GET"])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return Response({"status": "unhealthy", "database": "down"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({"status": "healthy", "database": "up"})


@extend_schema(responses={200: ReadinessSerializer, 503: ReadinessSerializer})
@api_view(["GET"])
def readiness(request):
    report = readiness_report()
    response_status = status.HTTP_200_OK if report["status"] == "ready" else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(report, status=response_status)


@extend_schema(
    responses={
        200: GitHubConnectivitySerializer,
        503: GitHubConnectivitySerializer,
    },
)
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
    except requests.RequestException:
        return Response(
            {
                "status": "down",
                "latency_ms": round((time.monotonic() - started_at) * 1000, 2),
                "detail": "Nao foi possivel contatar o GitHub.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@extend_schema(
    request=HandshakeRequestSerializer,
    responses={
        200: HandshakeResponseSerializer,
        400: HandshakeResponseSerializer,
        401: HandshakeResponseSerializer,
        502: HandshakeResponseSerializer,
        503: HandshakeResponseSerializer,
    },
)
@api_view(["POST"])
@permission_classes([Module1AccessPermission])
def github_handshake(request):
    # O token so e usado nesta chamada: nao e persistido, logado nem devolvido.
    serializer = HandshakeRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"valid": False, "detail": "Informe um token."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user, scopes = GitHubClient(token=serializer.validated_data["token"]).handshake()
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else None
        if code in (401, 403):
            return Response(
                {"valid": False, "detail": "Token recusado pelo GitHub."}, status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(
            {"valid": False, "detail": f"GitHub respondeu com status {code}."}, status=status.HTTP_502_BAD_GATEWAY
        )
    except requests.RequestException:
        return Response(
            {"valid": False, "detail": "Nao foi possivel contatar o GitHub."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    missing_scopes = settings.GITHUB_REQUIRED_SCOPES - scopes
    excess_scopes = scopes - settings.GITHUB_ALLOWED_SCOPES if settings.GITHUB_ALLOWED_SCOPES else set()
    response_data = {
        "valid": not missing_scopes,
        "login": user.get("login"),
        "name": user.get("name"),
        "avatar_url": user.get("avatar_url"),
        "scopes": sorted(scopes),
        "required_scopes": sorted(settings.GITHUB_REQUIRED_SCOPES),
        "missing_scopes": sorted(missing_scopes),
        "excess_scopes": sorted(excess_scopes),
        "least_privilege": not excess_scopes,
    }
    if missing_scopes:
        response_data["detail"] = "O token não possui todos os escopos exigidos para este ambiente."
        return Response(response_data, status=status.HTTP_403_FORBIDDEN)
    return Response(response_data)


@extend_schema(
    request=None,
    responses={
        202: OpenApiResponse(description="Evento aceito"),
        400: ErrorSerializer,
        401: ErrorSerializer,
        503: ErrorSerializer,
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
        return _error_response(
            "invalid_webhook_payload",
            "Invalid delivery, payload, or unknown repository",
            status.HTTP_400_BAD_REQUEST,
        )

    if repository.webhook_secret_expires_at and repository.webhook_secret_expires_at <= timezone.now():
        return _error_response(
            "webhook_credential_expired",
            "A credencial deste webhook expirou e precisa ser rotacionada.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        webhook_secret = decrypt_secret(repository.webhook_secret)
    except (InvalidTag, RuntimeError, ValueError, UnicodeDecodeError):
        logger.exception(
            "webhook_credential_decryption_failed",
            extra={"repository_id": repository.pk},
        )
        return _error_response(
            "webhook_credential_unavailable",
            "A credencial do webhook não pôde ser lida. Rotacione o segredo antes de reenviar.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not is_valid_github_signature(request.body, signature, webhook_secret):
        return _error_response("invalid_webhook_signature", "Invalid signature", status.HTTP_401_UNAUTHORIZED)

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


@extend_schema(
    request=None,
    responses={202: WebhookDeliverySerializer, 404: ErrorSerializer, 409: ErrorSerializer},
)
@api_view(["POST"])
@permission_classes([Module1AccessPermission])
def replay_webhook(request, delivery_id):
    """Reagenda uma entrega falha sem duplicar efeitos ja processados."""
    try:
        with transaction.atomic():
            delivery = WebhookDelivery.objects.select_for_update().get(
                delivery_id=delivery_id,
                repository__in=_owned_repositories(request),
            )
            if delivery.status != WebhookDelivery.Status.FAILED:
                return _error_response(
                    "delivery_not_replayable",
                    "Somente entregas com falha podem ser reprocessadas.",
                    status.HTTP_409_CONFLICT,
                )
            delivery.status = WebhookDelivery.Status.PENDING
            delivery.error = ""
            delivery.processed_at = None
            delivery.save(update_fields=("status", "error", "processed_at"))
            transaction.on_commit(lambda: process_webhook.delay(delivery.pk))
    except WebhookDelivery.DoesNotExist:
        return _error_response("delivery_not_found", "Entrega não encontrada.", status.HTTP_404_NOT_FOUND)
    return Response(WebhookDeliverySerializer(delivery).data, status=status.HTTP_202_ACCEPTED)


class CommitListView(ListAPIView):
    serializer_class = CommitSerializer
    permission_classes = (Module1AccessPermission,)

    def get_queryset(self):
        queryset = (
            Commit.objects.filter(repository__in=_owned_repositories(self.request))
            .select_related("repository", "branch", "author")
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


class BranchListView(ListAPIView):
    serializer_class = BranchSerializer
    permission_classes = (Module1AccessPermission,)

    def get_queryset(self):
        queryset = Branch.objects.filter(repository__in=_owned_repositories(self.request)).select_related(
            "repository"
        ).order_by("repository_id", "name")
        repository_id = self.request.query_params.get("repository_id")
        if repository_id:
            queryset = queryset.filter(repository_id=repository_id)
        if self.request.query_params.get("include_deleted", "false").lower() != "true":
            queryset = queryset.filter(deleted_at__isnull=True)
        return queryset


class PullRequestListView(ListAPIView):
    serializer_class = PullRequestSerializer
    permission_classes = (Module1AccessPermission,)

    def get_queryset(self):
        queryset = PullRequest.objects.filter(repository__in=_owned_repositories(self.request)).select_related(
            "repository", "author"
        ).order_by("-updated_at")
        repository_id = self.request.query_params.get("repository_id")
        state_filter = self.request.query_params.get("state")
        author = self.request.query_params.get("author")
        if repository_id:
            queryset = queryset.filter(repository_id=repository_id)
        if state_filter:
            queryset = queryset.filter(state=state_filter)
        if author:
            queryset = queryset.filter(author__login=author)
        return queryset


@extend_schema(responses={200: FlowMetricsSerializer})
@api_view(["GET"])
@permission_classes([Module1AccessPermission])
def flow_metrics(request):
    queryset = Commit.objects.filter(repository__in=_owned_repositories(request))
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


@extend_schema(
    responses={
        200: DashboardMetricsSerializer,
        400: ErrorSerializer,
        401: ErrorSerializer,
        404: ErrorSerializer,
    },
)
@api_view(["GET"])
@permission_classes([Module1AccessPermission])
def dashboard_metrics(request):
    try:
        days, repository_id = _dashboard_params(request.query_params)
        repository, _ = dashboard_repository(repository_id, repositories=_owned_repositories(request))
    except (ValueError, Repository.DoesNotExist):
        return _error_response("invalid_dashboard_parameters", "Parâmetros inválidos.", status.HTTP_400_BAD_REQUEST)
    if repository is None:
        return _error_response(
            "repository_not_found", "Nenhum repositório ativo cadastrado.", status.HTTP_404_NOT_FOUND
        )
    return Response(dashboard_summary(repository, days))


@extend_schema(
    request=RepositorySyncRequestSerializer,
    responses={
        200: RepositorySyncResponseSerializer,
        404: ErrorSerializer,
        500: ErrorSerializer,
        502: ErrorSerializer,
    },
)
@api_view(["POST"])
@permission_classes([Module1AccessPermission])
def repository_sync(request, pk):
    """Sincroniza commits e dados reais de um repositorio via GitHub API (M2-111 / M2-114)."""
    try:
        repository = _owned_repositories(request).get(pk=pk)
    except Repository.DoesNotExist:
        return _error_response("repository_not_found", "Repositório não encontrado.", status.HTTP_404_NOT_FOUND)
    token = request.data.get("token")
    try:
        commits_count = sync_repository_from_github(repository, token=token)
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else 502
        response_status = code if code in (401, 403, 404) else status.HTTP_502_BAD_GATEWAY
        return _error_response(
            "github_api_error", f"A API do GitHub recusou a sincronização (HTTP {code}).", response_status
        )
    except Exception:
        logger.exception("repository_sync_failed", extra={"repository_id": repository.pk})
        return _error_response(
            "repository_sync_failed",
            "A sincronização falhou. Tente novamente mais tarde.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return Response({
        "status": "synced",
        "repository": str(repository),
        "commits_synced": commits_count,
    })


@extend_schema(
    parameters=[
        OpenApiParameter(
            name="days",
            type=int,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Janela de análise entre 1 e 365 dias (padrão: 30).",
        )
    ],
    responses={200: RepositoryIntelligenceSerializer, 400: ErrorSerializer, 404: ErrorSerializer},
)
@api_view(["GET"])
@permission_classes([Module1AccessPermission])
def repository_insights(request, pk):
    try:
        days = int(request.query_params.get("days", "30"))
    except ValueError:
        return _error_response("invalid_period", "days precisa ser um número inteiro.", status.HTTP_400_BAD_REQUEST)
    if not 1 <= days <= 365:
        return _error_response("invalid_period", "days precisa estar entre 1 e 365.", status.HTTP_400_BAD_REQUEST)
    try:
        repository = _owned_repositories(request).get(pk=pk)
    except Repository.DoesNotExist:
        return _error_response("repository_not_found", "Repositório não encontrado.", status.HTTP_404_NOT_FOUND)
    return Response(repository_intelligence(repository, days=days))


def _active_repository(request, pk):
    try:
        return _owned_repositories(request).get(pk=pk), None
    except Repository.DoesNotExist:
        return None, _error_response("repository_not_found", "Repositório não encontrado.", status.HTTP_404_NOT_FOUND)


@extend_schema(
    request=RepositoryContentRequestSerializer,
    responses={
        200: RepositoryContentResponseSerializer,
        400: ErrorSerializer,
        404: ErrorSerializer,
        502: ErrorSerializer,
    },
)
@api_view(["POST"])
@permission_classes([Module1AccessPermission])
def repository_content(request, pk):
    serializer = RepositoryContentRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return _error_response("invalid_content_request", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
    repository, error = _active_repository(request, pk)
    if error:
        return error
    path = serializer.validated_data["path"].strip("/")
    if not path or ".." in path.split("/"):
        return _error_response(
            "invalid_content_path",
            "Informe um caminho de arquivo seguro.",
            status.HTTP_400_BAD_REQUEST,
        )
    token = serializer.validated_data.get("token") or None
    ref = serializer.validated_data.get("ref") or repository.default_branch
    try:
        payload = GitHubClient(token=token).get_content(repository.owner, repository.name, path, ref=ref)
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else 502
        response_status = code if code in (401, 403, 404) else status.HTTP_502_BAD_GATEWAY
        return _error_response("github_content_error", f"GitHub respondeu com HTTP {code}.", response_status)
    if payload.get("type") != "file" or payload.get("encoding") != "base64":
        return _error_response(
            "unsupported_content",
            "O caminho não representa um arquivo Base64.",
            status.HTTP_400_BAD_REQUEST,
        )
    size = int(payload.get("size") or 0)
    if size > settings.GITHUB_CONTENT_MAX_BYTES:
        return _error_response(
            "content_too_large",
            "O arquivo excede o limite configurado.",
            status.HTTP_400_BAD_REQUEST,
        )
    try:
        encoded_content = "".join(str(payload.get("content", "")).split())
        decoded = base64.b64decode(encoded_content, validate=True).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return _error_response(
            "unsupported_content",
            "O arquivo não contém texto UTF-8 válido.",
            status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {
            "repository": str(repository),
            "path": payload.get("path") or path,
            "ref": ref,
            "sha": payload.get("sha", ""),
            "size": size,
            "encoding": "utf-8",
            "content": decoded,
            "source_url": payload.get("html_url"),
        }
    )


@extend_schema(
    request=CommitDiffRequestSerializer,
    responses={200: CommitDiffResponseSerializer, 404: ErrorSerializer, 502: ErrorSerializer},
)
@api_view(["POST"])
@permission_classes([Module1AccessPermission])
def repository_commit_diff(request, pk, sha):
    serializer = CommitDiffRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    repository, error = _active_repository(request, pk)
    if error:
        return error
    try:
        payload = GitHubClient(token=serializer.validated_data.get("token") or None).get_commit(
            repository.owner, repository.name, sha
        )
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else 502
        response_status = code if code in (401, 403, 404) else status.HTTP_502_BAD_GATEWAY
        return _error_response("github_commit_error", f"GitHub respondeu com HTTP {code}.", response_status)
    files = []
    for item in payload.get("files") or []:
        patch = item.get("patch") or ""
        limit = settings.GITHUB_DIFF_PATCH_MAX_CHARS
        files.append(
            {
                "path": item.get("filename", ""),
                "status": item.get("status", "modified"),
                "additions": item.get("additions", 0),
                "deletions": item.get("deletions", 0),
                "changes": item.get("changes", 0),
                "patch": patch[:limit],
                "truncated": len(patch) > limit,
            }
        )
    return Response(
        {
            "repository": str(repository),
            "sha": payload.get("sha") or sha,
            "source_url": payload.get("html_url"),
            "files": files,
        }
    )


class RepositoryListView(ListCreateAPIView):
    serializer_class = RepositorySerializer
    pagination_class = None
    permission_classes = (Module1AccessPermission,)

    def get_queryset(self):
        queryset = _owned_repositories(self.request)
        project_id = self.request.query_params.get("project_id")
        if project_id:
            try:
                project_id = uuid.UUID(project_id)
            except ValueError:
                return queryset.none()
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by("owner", "name")

    @extend_schema(
        request=RepositoryCreateRequestSerializer,
        responses={
            201: RepositoryCreateResponseSerializer,
            400: ErrorSerializer,
            404: ErrorSerializer,
            429: ErrorSerializer,
            502: ErrorSerializer,
            503: ErrorSerializer,
        },
    )
    def create(self, request, *args, **kwargs):
        request_serializer = RepositoryCreateRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return _error_response(
                "invalid_repository_request",
                f"Dados inválidos: {request_serializer.errors}",
                status.HTTP_400_BAD_REQUEST,
            )
        request_data = request_serializer.validated_data
        project_id = request_data.get("project_id")
        url_input = request_data.get("url") or request_data.get("repository_url") or ""
        owner = request_data.get("owner", "").strip()
        name = request_data.get("name", "").strip()
        token = request_data.get("token")
        raw_secret = request_data["webhook_secret"].strip()
        expires_at = request_data.get("webhook_secret_expires_at")

        if settings.MODULE1_AUTH_REQUIRED:
            if not project_id:
                return _error_response(
                    "project_required",
                    "Selecione um projeto do Módulo 1.",
                    status.HTTP_400_BAD_REQUEST,
                )
            try:
                project = get_project(request.auth, project_id)
            except PlatformServiceError as exc:
                return _platform_error_response(exc)
            if str(project.get("id")) != str(project_id) or str(project.get("owner_id")) != str(request.user.id):
                return _error_response(
                    "project_access_denied",
                    "O projeto não pertence ao usuário autenticado.",
                    status.HTTP_403_FORBIDDEN,
                )

        if url_input:
            from urllib.parse import urlparse

            cleaned = url_input.strip().rstrip("/")
            if "github.com" in cleaned:
                parsed = urlparse(cleaned if "://" in cleaned else f"https://{cleaned}")
                if parsed.netloc not in ("github.com", "www.github.com"):
                    return _error_response(
                        "invalid_repository_url",
                        "A URL precisa ser do domínio oficial github.com.",
                        status.HTTP_400_BAD_REQUEST,
                    )
                parts = [p for p in parsed.path.strip("/").split("/") if p]
                if len(parts) >= 2:
                    owner, name = parts[0], parts[1].removesuffix(".git")
            elif "/" in cleaned:
                parts = [p for p in cleaned.split("/") if p]
                if len(parts) == 2:
                    owner, name = parts[0], parts[1]

        if not owner or not name:
            return _error_response(
                "invalid_repository_reference",
                "Informe uma URL válida do GitHub (ex: https://github.com/owner/repo) ou o owner e o name.",
                status.HTTP_400_BAD_REQUEST,
            )
        try:
            client = GitHubClient(token=token)
            repo_data = client.get_repository(owner, name)
        except GitHubRateLimitError as exc:
            retry_hint = f" Tente novamente em aproximadamente {exc.retry_after} segundos." if exc.retry_after else ""
            return _error_response(
                "github_rate_limit_exceeded",
                "O limite de consultas da API do GitHub foi atingido. Informe um PAT ou tente novamente mais tarde."
                + retry_hint,
                status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except requests.HTTPError as exc:
            code = exc.response.status_code if exc.response is not None else 502
            response_status = code if code in (401, 403, 404) else status.HTTP_502_BAD_GATEWAY
            if code == 401:
                detail = "O GitHub recusou o token informado. Verifique se ele é válido e possui acesso de leitura."
            elif code == 403:
                detail = (
                    "O GitHub recusou o acesso ao repositório. "
                    "Verifique as permissões do PAT ou tente novamente mais tarde."
                )
            elif code == 404:
                detail = "O repositório não foi encontrado ou não está visível para a credencial informada."
            else:
                detail = f"Não foi possível consultar o repositório no GitHub (HTTP {code})."
            return _error_response(
                "github_repository_lookup_failed",
                detail,
                response_status,
            )
        except Exception:
            logger.exception("github_repository_lookup_failed", extra={"owner": owner, "repository": name})
            return _error_response(
                "github_repository_lookup_failed",
                "Não foi possível consultar o repositório no GitHub.",
                status.HTTP_502_BAD_GATEWAY,
            )

        actor = request.user.get_username() if request.user and request.user.is_authenticated else "module-api"
        try:
            repository, _created = store_repository_credential(
                repo_data,
                raw_secret,
                expires_at,
                actor,
                project_id=project_id,
                platform_user_id=request.user.id if settings.MODULE1_AUTH_REQUIRED else None,
            )
        except PermissionError:
            return _error_response(
                "repository_access_denied",
                "Este repositório já está associado a outro usuário ou projeto.",
                status.HTTP_403_FORBIDDEN,
            )
        except RuntimeError:
            logger.exception("repository_credential_store_unavailable", extra={"owner": owner, "repository": name})
            return _error_response(
                "credential_store_unavailable",
                "O armazenamento seguro de credenciais está temporariamente indisponível.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        sync_status = "completed"
        sync_detail = None
        try:
            sync_repository_from_github(repository, token=token)
        except Exception as exc:
            sync_status = "failed"
            sync_detail = "Repositório cadastrado, mas a sincronização inicial falhou. Tente sincronizar novamente."
            logger.warning(
                "initial_repository_sync_failed",
                extra={"repository_id": repository.pk, "repository": str(repository)},
                exc_info=exc,
            )

        serializer = self.get_serializer(repository)
        response_data = {**serializer.data, "initial_sync_status": sync_status}
        if sync_detail:
            response_data["initial_sync_detail"] = sync_detail
        return Response(response_data, status=status.HTTP_201_CREATED)


class RepositoryDetailView(DestroyAPIView):
    """Remove a vinculação local do Módulo 2 e seus dados derivados.

    O projeto da plataforma continua intacto no Módulo 1. O queryset com
    escopo de proprietário mantém a existência de repositórios de terceiros
    indistinguível para o chamador.
    """

    permission_classes = (Module1AccessPermission,)

    def get_queryset(self):
        return _owned_repositories(self.request)

    @extend_schema(responses={204: None, 404: ErrorSerializer})
    def delete(self, request, *args, **kwargs):
        repository = self.get_object()
        logger.info("repository_unlinked", extra={"repository_id": repository.pk})
        repository.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WebhookDeliveryListView(ListAPIView):
    serializer_class = WebhookDeliverySerializer
    pagination_class = None
    permission_classes = (Module1AccessPermission,)

    def get_queryset(self):
        queryset = WebhookDelivery.objects.filter(repository__in=_owned_repositories(self.request)).select_related(
            "repository"
        ).order_by("-received_at")
        repository_id = self.request.query_params.get("repository_id")
        if repository_id:
            queryset = queryset.filter(repository_id=repository_id)
        return queryset[:15]
