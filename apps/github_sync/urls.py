from django.urls import path

from .views import CommitListView, dashboard_metrics, flow_metrics, github_connectivity, github_webhook, health

urlpatterns = [
    path("health", health, name="health"),
    path("health/github-connectivity", github_connectivity, name="github-connectivity"),
    path("webhooks/github", github_webhook, name="github-webhook"),
    path("commits", CommitListView.as_view(), name="commit-list"),
    path("metrics/flow", flow_metrics, name="flow-metrics"),
    path("metrics/dashboard", dashboard_metrics, name="dashboard-metrics"),
]
