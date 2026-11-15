import pytest


@pytest.fixture(autouse=True)
def explicit_legacy_auth_opt_out(settings):
    """Existing endpoint tests isolate business behavior; auth has dedicated tests."""

    settings.MODULE1_AUTH_REQUIRED = False
