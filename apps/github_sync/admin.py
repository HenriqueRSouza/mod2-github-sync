from django.contrib import admin

from .models import Branch, Commit, CommitFile, Contributor, ContributorEmail, PullRequest, Repository, WebhookDelivery

admin.site.register(
    (Repository, Contributor, ContributorEmail, Branch, Commit, CommitFile, PullRequest, WebhookDelivery)
)
