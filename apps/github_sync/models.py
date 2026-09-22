from django.db import models


class Repository(models.Model):
    github_id = models.PositiveBigIntegerField(unique=True)
    owner = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    default_branch = models.CharField(max_length=255, default="main")
    webhook_secret = models.BinaryField(help_text="Segredo criptografado com AES-256-GCM")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("owner", "name"), name="unique_repository_name")]

    def __str__(self):
        return f"{self.owner}/{self.name}"


class Contributor(models.Model):
    github_id = models.PositiveBigIntegerField(null=True, blank=True, unique=True)
    login = models.CharField(max_length=255, db_index=True)
    display_name = models.CharField(max_length=255, blank=True)
    is_bot = models.BooleanField(default=False)

    def __str__(self):
        return self.login


class ContributorEmail(models.Model):
    contributor = models.ForeignKey(Contributor, related_name="emails", on_delete=models.CASCADE)
    email = models.EmailField(unique=True)


class Branch(models.Model):
    repository = models.ForeignKey(Repository, related_name="branches", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("repository", "name"), name="unique_repository_branch")]


class Commit(models.Model):
    repository = models.ForeignKey(Repository, related_name="commits", on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, related_name="commits", null=True, on_delete=models.SET_NULL)
    author = models.ForeignKey(Contributor, related_name="commits", null=True, on_delete=models.SET_NULL)
    sha = models.CharField(max_length=40)
    message = models.TextField()
    authored_at = models.DateTimeField(db_index=True)
    url = models.URLField(max_length=500, blank=True)
    forced_push = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("repository", "sha"), name="unique_repository_commit")]
        indexes = [
            models.Index(fields=("repository", "authored_at")),
            models.Index(fields=("author", "authored_at")),
        ]


class CommitFile(models.Model):
    class ChangeType(models.TextChoices):
        ADDED = "added", "Added"
        MODIFIED = "modified", "Modified"
        REMOVED = "removed", "Removed"

    commit = models.ForeignKey(Commit, related_name="files", on_delete=models.CASCADE)
    path = models.TextField()
    change_type = models.CharField(max_length=10, choices=ChangeType.choices)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("commit", "path"), name="unique_commit_file")]


class PullRequest(models.Model):
    repository = models.ForeignKey(Repository, related_name="pull_requests", on_delete=models.CASCADE)
    author = models.ForeignKey(Contributor, null=True, on_delete=models.SET_NULL)
    number = models.PositiveIntegerField()
    title = models.CharField(max_length=500)
    state = models.CharField(max_length=20)
    opened_at = models.DateTimeField()
    closed_at = models.DateTimeField(null=True, blank=True)
    merged_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=("repository", "number"), name="unique_repository_pr")]


class WebhookDelivery(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    delivery_id = models.UUIDField(unique=True)
    repository = models.ForeignKey(Repository, related_name="deliveries", on_delete=models.CASCADE)
    event = models.CharField(max_length=100)
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    error = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
