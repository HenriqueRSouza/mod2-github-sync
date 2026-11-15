import json
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from django.urls import reverse

from apps.github_sync.models import Branch, Commit, Contributor, PullRequest, Repository, WebhookDelivery

pytestmark = pytest.mark.django_db


@pytest.fixture
def tenant_context(settings):
    settings.MODULE1_AUTH_REQUIRED = True
    settings.MODULE1_JWT_ISSUER = "https://mod1-auth.whitemeadow-deba1090.brazilsouth.azurecontainerapps.io"
    settings.MODULE1_JWT_AUDIENCE = "engenharia-software-api"

    signing_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    owner_id = uuid4()
    other_owner_id = uuid4()
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(owner_id),
            "iss": settings.MODULE1_JWT_ISSUER,
            "aud": settings.MODULE1_JWT_AUDIENCE,
            "iat": now,
            "exp": now + timedelta(minutes=30),
            "jti": str(uuid4()),
        },
        signing_key,
        algorithm="RS256",
        headers={"kid": "tenant-isolation-test-key"},
    )

    own_repository = Repository.objects.create(
        project_id=uuid4(),
        platform_user_id=owner_id,
        github_id=9101,
        owner="student-a",
        name="owned-repository",
        webhook_secret=b"encrypted-own-secret",
    )
    other_repository = Repository.objects.create(
        project_id=uuid4(),
        platform_user_id=other_owner_id,
        github_id=9102,
        owner="student-b",
        name="private-repository",
        webhook_secret=b"encrypted-other-secret",
    )
    contributor = Contributor.objects.create(github_id=9103, login="other-student")

    own_branch = Branch.objects.create(repository=own_repository, name="main")
    other_branch = Branch.objects.create(repository=other_repository, name="main")
    Commit.objects.create(
        repository=own_repository,
        branch=own_branch,
        author=contributor,
        sha="a" * 40,
        message="Owned commit",
        authored_at=now,
    )
    Commit.objects.create(
        repository=other_repository,
        branch=other_branch,
        author=contributor,
        sha="b" * 40,
        message="Private commit",
        authored_at=now,
    )
    PullRequest.objects.create(
        repository=own_repository,
        author=contributor,
        number=1,
        title="Owned PR",
        state="open",
        opened_at=now,
        updated_at=now,
    )
    PullRequest.objects.create(
        repository=other_repository,
        author=contributor,
        number=2,
        title="Private PR",
        state="open",
        opened_at=now,
        updated_at=now,
    )
    own_delivery = WebhookDelivery.objects.create(
        delivery_id=uuid4(),
        repository=own_repository,
        event="push",
        payload={"ref": "refs/heads/main", "commits": []},
        status=WebhookDelivery.Status.FAILED,
    )
    other_delivery = WebhookDelivery.objects.create(
        delivery_id=uuid4(),
        repository=other_repository,
        event="push",
        payload={"ref": "refs/heads/main", "commits": []},
        status=WebhookDelivery.Status.FAILED,
    )

    jwks_client = SimpleNamespace(
        get_signing_key_from_jwt=lambda supplied_token: SimpleNamespace(key=signing_key.public_key())
    )
    return SimpleNamespace(
        token=token,
        owner_id=owner_id,
        own_repository=own_repository,
        other_repository=other_repository,
        own_delivery=own_delivery,
        other_delivery=other_delivery,
        jwks_client=jwks_client,
    )


def _request(client, method, url, token=None, payload=None):
    headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"} if token else {}
    if method == "get":
        return client.get(url, **headers)
    if method == "delete":
        return client.delete(url, **headers)
    return client.post(
        url,
        data=json.dumps(payload or {}),
        content_type="application/json",
        **headers,
    )


def _protected_endpoints(context):
    repository_id = context.other_repository.pk
    return (
        ("get", reverse("repository-list"), None),
        ("post", reverse("repository-list"), {"url": "student-b/private-repository", "webhook_secret": "secret"}),
        ("delete", reverse("repository-detail", args=[repository_id]), None),
        ("get", reverse("commit-list"), None),
        ("get", reverse("branch-list"), None),
        ("get", reverse("pull-request-list"), None),
        ("get", reverse("flow-metrics"), None),
        ("get", reverse("dashboard-metrics"), None),
        ("post", reverse("repository-sync", args=[repository_id]), None),
        ("get", reverse("repository-insights", args=[repository_id]), None),
        ("post", reverse("repository-content", args=[repository_id]), {"path": "README.md"}),
        ("post", reverse("repository-commit-diff", args=[repository_id, "b" * 40]), None),
        ("get", reverse("webhook-deliveries"), None),
        ("post", reverse("webhook-delivery-replay", args=[context.other_delivery.delivery_id]), None),
    )


def test_all_tenant_endpoints_reject_requests_without_a_token(client, tenant_context):
    for method, url, payload in _protected_endpoints(tenant_context):
        response = _request(client, method, url, payload=payload)
        assert response.status_code == 401, f"{method.upper()} {url} returned {response.status_code}"


def test_cross_tenant_collection_endpoints_only_return_owned_data(client, tenant_context):
    context = tenant_context
    headers = {"HTTP_AUTHORIZATION": f"Bearer {context.token}"}

    with patch("apps.github_sync.authentication._jwks_client", return_value=context.jwks_client):
        repositories = client.get(reverse("repository-list"), **headers)
        commits = client.get(reverse("commit-list"), **headers)
        branches = client.get(reverse("branch-list"), **headers)
        pull_requests = client.get(reverse("pull-request-list"), **headers)
        flow = client.get(reverse("flow-metrics"), **headers)
        deliveries = client.get(reverse("webhook-deliveries"), **headers)

    assert repositories.status_code == 200
    assert [item["id"] for item in repositories.json()] == [context.own_repository.pk]

    assert commits.status_code == 200
    assert [item["sha"] for item in commits.json()["results"]] == ["a" * 40]

    assert branches.status_code == 200
    assert [item["repository"] for item in branches.json()["results"]] == [str(context.own_repository)]

    assert pull_requests.status_code == 200
    assert [item["title"] for item in pull_requests.json()["results"]] == ["Owned PR"]

    assert flow.status_code == 200
    assert flow.json()["total_commits"] == 1

    assert deliveries.status_code == 200
    assert [item["delivery_id"] for item in deliveries.json()] == [str(context.own_delivery.delivery_id)]


def test_cross_tenant_repository_operations_are_hidden(client, tenant_context):
    context = tenant_context
    token = context.token
    other_repository_id = context.other_repository.pk
    cases = (
        ("get", reverse("dashboard-metrics") + f"?repository_id={other_repository_id}", None, 400),
        ("post", reverse("repository-sync", args=[other_repository_id]), None, 404),
        ("delete", reverse("repository-detail", args=[other_repository_id]), None, 404),
        ("get", reverse("repository-insights", args=[other_repository_id]), None, 404),
        ("post", reverse("repository-content", args=[other_repository_id]), {"path": "README.md"}, 404),
        ("post", reverse("repository-commit-diff", args=[other_repository_id, "b" * 40]), None, 404),
        ("post", reverse("webhook-delivery-replay", args=[context.other_delivery.delivery_id]), None, 404),
    )

    with patch("apps.github_sync.authentication._jwks_client", return_value=context.jwks_client):
        for method, url, payload, expected_status in cases:
            response = _request(client, method, url, token=token, payload=payload)
            assert response.status_code == expected_status, (
                f"{method.upper()} {url} returned {response.status_code}, expected {expected_status}"
            )

    context.other_delivery.refresh_from_db()
    assert context.other_delivery.status == WebhookDelivery.Status.FAILED


def test_owner_can_unlink_own_repository_and_derived_records(client, tenant_context):
    context = tenant_context
    with patch("apps.github_sync.authentication._jwks_client", return_value=context.jwks_client):
        response = _request(
            client,
            "delete",
            reverse("repository-detail", args=[context.own_repository.pk]),
            token=context.token,
        )

    assert response.status_code == 204
    assert not Repository.objects.filter(pk=context.own_repository.pk).exists()
    assert Repository.objects.filter(pk=context.other_repository.pk).exists()
