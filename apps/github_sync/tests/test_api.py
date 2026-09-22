import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


def test_health_check(client):
    response = client.get(reverse("health"))

    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "up"}


def test_commit_list_is_paginated(client):
    response = client.get(reverse("commit-list"))

    assert response.status_code == 200
    assert response.json() == {"count": 0, "next": None, "previous": None, "results": []}
