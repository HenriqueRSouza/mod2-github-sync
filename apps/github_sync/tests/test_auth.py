import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def access_token(settings):
    settings.ACCESS_TOKEN = "test-token"
    settings.AUTO_LOGIN = False


def test_api_accepts_valid_bearer_token(client):
    response = client.get(reverse("dashboard-metrics"), HTTP_AUTHORIZATION="Bearer test-token")
    assert response.status_code == 404  # autenticado, mas sem repositorio cadastrado


def test_api_rejects_invalid_bearer_token(client):
    response = client.get(reverse("dashboard-metrics"), HTTP_AUTHORIZATION="Bearer wrong")
    assert response.status_code == 401
    assert response["WWW-Authenticate"] == "Bearer"


def test_api_rejects_missing_token(client):
    assert client.get(reverse("dashboard-metrics")).status_code == 401


def test_dashboard_redirects_to_login_with_next(client):
    response = client.get(reverse("dashboard"), {"days": 30})
    assert response.status_code == 302
    assert response.url == "/login/?next=%2Fdashboard%2F%3Fdays%3D30"


def test_login_form_stores_token_in_session(client):
    response = client.post(reverse("login"), {"access_token": "test-token", "next": "/dashboard/?days=30"})
    assert response.status_code == 302
    assert response.url == "/dashboard/?days=30"
    assert client.get(reverse("dashboard")).status_code == 200


def test_login_callback_accepts_token_in_query_string(client):
    response = client.get(reverse("login"), {"access_token": "test-token"})
    assert response.status_code == 302
    assert response.url == reverse("dashboard")
    assert client.get(reverse("dashboard")).status_code == 200


def test_login_rejects_invalid_token(client):
    response = client.post(reverse("login"), {"access_token": "wrong"})
    assert response.status_code == 401
    assert "Token de acesso inválido." in response.content.decode()
    assert client.get(reverse("dashboard")).status_code == 302


def test_login_ignores_external_next_url(client):
    response = client.post(reverse("login"), {"access_token": "test-token", "next": "https://evil.example.com/"})
    assert response.url == reverse("dashboard")


def test_logout_clears_session(client):
    client.post(reverse("login"), {"access_token": "test-token"})
    assert client.post(reverse("logout")).status_code == 302
    assert client.get(reverse("dashboard")).status_code == 302


def test_empty_access_token_setting_denies_everything(client, settings):
    settings.ACCESS_TOKEN = ""
    assert client.get(reverse("dashboard-metrics"), HTTP_AUTHORIZATION="Bearer ").status_code == 401
    assert client.post(reverse("login"), {"access_token": "anything"}).status_code == 401


def test_auto_login_opens_dashboard_without_token(client, settings):
    settings.AUTO_LOGIN = True
    response = client.get(reverse("dashboard"))
    assert response.status_code == 200
    assert "Sair" not in response.content.decode()


def test_auto_login_keeps_api_protected(client, settings):
    settings.AUTO_LOGIN = True
    assert client.get(reverse("dashboard-metrics")).status_code == 401
