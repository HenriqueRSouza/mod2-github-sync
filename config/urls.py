from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.github_sync.views import dashboard_page, github_webhook, login_page, logout_page

urlpatterns = [
    path("", RedirectView.as_view(pattern_name="dashboard"), name="home"),
    path("admin/", admin.site.urls),
    path("dashboard/", dashboard_page, name="dashboard"),
    path("login/", login_page, name="login"),
    path("logout/", logout_page, name="logout"),
    path("webhooks/github", github_webhook, name="github-webhook-unversioned"),
    path("api/v1/", include("apps.github_sync.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
