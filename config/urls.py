from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.github_sync.views import github_webhook

urlpatterns = [
    path("admin/", admin.site.urls),
    path("webhooks/github", github_webhook, name="github-webhook-unversioned"),
    path("api/v1/", include("apps.github_sync.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
