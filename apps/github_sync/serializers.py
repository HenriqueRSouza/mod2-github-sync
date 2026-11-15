from rest_framework import serializers

from .models import Branch, Commit, CommitFile, PullRequest, Repository, WebhookDelivery


class PlatformRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=320)
    display_name = serializers.CharField(min_length=1, max_length=120)
    password = serializers.CharField(min_length=12, max_length=128, write_only=True)


class PlatformTokenRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=320)
    password = serializers.CharField(max_length=128, write_only=True)


class PlatformTokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField(min_value=1)


class PlatformProjectDraftSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1, max_length=120)
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class HandshakeRequestSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=255)


class ErrorSerializer(serializers.Serializer):
    code = serializers.CharField()
    detail = serializers.CharField()


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField(help_text="healthy ou unhealthy")
    database = serializers.CharField(help_text="up ou down")


class ReadinessSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("ready", "not_ready"))
    checks = serializers.DictField(child=serializers.DictField())


class GitHubConnectivitySerializer(serializers.Serializer):
    status = serializers.CharField(help_text="up ou down")
    latency_ms = serializers.FloatField()
    github_status = serializers.IntegerField(required=False)
    detail = serializers.CharField(required=False)


class HandshakeResponseSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    login = serializers.CharField(required=False, allow_null=True)
    name = serializers.CharField(required=False, allow_null=True)
    avatar_url = serializers.URLField(required=False, allow_null=True)
    scopes = serializers.ListField(child=serializers.CharField(), required=False)
    required_scopes = serializers.ListField(child=serializers.CharField(), required=False)
    missing_scopes = serializers.ListField(child=serializers.CharField(), required=False)
    excess_scopes = serializers.ListField(child=serializers.CharField(), required=False)
    least_privilege = serializers.BooleanField(required=False)
    detail = serializers.CharField(required=False)


class RepositoryCreateRequestSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=False)
    url = serializers.CharField(required=False, allow_blank=True)
    repository_url = serializers.CharField(required=False, allow_blank=True)
    owner = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(required=False, allow_blank=True)
    token = serializers.CharField(required=False, allow_blank=True, write_only=True)
    webhook_secret = serializers.CharField(min_length=16, write_only=True)
    webhook_secret_expires_at = serializers.DateTimeField(required=False, allow_null=True, write_only=True)


class RepositorySyncRequestSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, allow_blank=True, write_only=True)


class RepositoryContentRequestSerializer(serializers.Serializer):
    path = serializers.CharField(max_length=2000)
    ref = serializers.CharField(required=False, allow_blank=True, max_length=255)
    token = serializers.CharField(required=False, allow_blank=True, write_only=True)


class RepositoryContentResponseSerializer(serializers.Serializer):
    repository = serializers.CharField()
    path = serializers.CharField()
    ref = serializers.CharField()
    sha = serializers.CharField()
    size = serializers.IntegerField(min_value=0)
    encoding = serializers.CharField()
    content = serializers.CharField()
    source_url = serializers.URLField(allow_null=True)


class CommitDiffRequestSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, allow_blank=True, write_only=True)


class CommitDiffFileSerializer(serializers.Serializer):
    path = serializers.CharField()
    status = serializers.CharField()
    additions = serializers.IntegerField(min_value=0)
    deletions = serializers.IntegerField(min_value=0)
    changes = serializers.IntegerField(min_value=0)
    patch = serializers.CharField(allow_blank=True)
    truncated = serializers.BooleanField()


class CommitDiffResponseSerializer(serializers.Serializer):
    repository = serializers.CharField()
    sha = serializers.CharField()
    source_url = serializers.URLField(allow_null=True)
    files = CommitDiffFileSerializer(many=True)


class RepositorySyncResponseSerializer(serializers.Serializer):
    status = serializers.CharField(help_text="synced")
    repository = serializers.CharField()
    commits_synced = serializers.IntegerField(min_value=0)


class IntelligenceRepositorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class BottleneckSerializer(serializers.Serializer):
    code = serializers.CharField()
    severity = serializers.ChoiceField(choices=("info", "warning", "critical"))
    evidence = serializers.CharField()


class CommitQualitySerializer(serializers.Serializer):
    sha = serializers.CharField()
    message = serializers.CharField()
    author = serializers.CharField(allow_null=True)
    authored_at = serializers.DateTimeField()
    score = serializers.IntegerField(min_value=0, max_value=100)
    label = serializers.ChoiceField(choices=("clara", "adequada", "vaga"))
    suggestions = serializers.ListField(child=serializers.CharField())


class FrequencySerializer(serializers.Serializer):
    by_weekday = serializers.DictField(child=serializers.IntegerField(min_value=0))
    by_hour = serializers.DictField(child=serializers.IntegerField(min_value=0))
    by_author = serializers.DictField(child=serializers.IntegerField(min_value=0))


class IntelligenceIndicatorsSerializer(serializers.Serializer):
    top_author = serializers.CharField(allow_null=True)
    author_concentration_percent = serializers.FloatField(min_value=0, max_value=100)
    off_hours_percent = serializers.FloatField(min_value=0, max_value=100)
    burst_days = serializers.ListField(child=serializers.CharField())


class RepositoryIntelligenceSerializer(serializers.Serializer):
    repository = IntelligenceRepositorySerializer()
    period_days = serializers.IntegerField(min_value=1, max_value=365)
    generated_at = serializers.DateTimeField()
    analysis_mode = serializers.CharField()
    total_commits = serializers.IntegerField(min_value=0)
    average_clarity_score = serializers.FloatField(allow_null=True, min_value=0, max_value=100)
    clarity_distribution = serializers.DictField(child=serializers.IntegerField(min_value=0))
    frequency = FrequencySerializer()
    indicators = IntelligenceIndicatorsSerializer()
    bottlenecks = BottleneckSerializer(many=True)
    recommendations = serializers.ListField(child=serializers.CharField())
    recent_commit_quality = CommitQualitySerializer(many=True)


class FlowMetricAuthorSerializer(serializers.Serializer):
    author__login = serializers.CharField(allow_null=True)
    commits = serializers.IntegerField(min_value=0)


class FlowMetricsSerializer(serializers.Serializer):
    total_commits = serializers.IntegerField(min_value=0)
    commits_by_author = FlowMetricAuthorSerializer(many=True)


class DashboardRepositorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class DashboardRecentItemSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=("Commit", "Push", "PR"))
    title = serializers.CharField()
    detail = serializers.CharField()
    at = serializers.DateTimeField()
    url = serializers.URLField(allow_blank=True)


class DashboardMetricsSerializer(serializers.Serializer):
    repository = DashboardRepositorySerializer()
    period_days = serializers.IntegerField()
    since = serializers.DateTimeField()
    until = serializers.DateTimeField()
    total_commits = serializers.IntegerField(min_value=0)
    total_pushes = serializers.IntegerField(min_value=0)
    prs_opened = serializers.IntegerField(min_value=0)
    prs_merged = serializers.IntegerField(min_value=0)
    prs_open = serializers.IntegerField(min_value=0)
    prs_overdue = serializers.IntegerField(min_value=0)
    sla_hours = serializers.FloatField()
    sla_on_time = serializers.IntegerField(min_value=0)
    sla_percent = serializers.IntegerField(allow_null=True)
    median_merge_hours = serializers.FloatField(allow_null=True)
    last_processed_at = serializers.DateTimeField(allow_null=True)
    processing_within_2m_percent = serializers.IntegerField(allow_null=True)
    failed_deliveries = serializers.IntegerField(min_value=0)
    recent = DashboardRecentItemSerializer(many=True)


class RepositorySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = Repository
        fields = (
            "id",
            "project_id",
            "github_id",
            "owner",
            "name",
            "full_name",
            "default_branch",
            "webhook_secret_version",
            "webhook_secret_rotated_at",
            "webhook_secret_expires_at",
        )


class RepositoryCreateResponseSerializer(RepositorySerializer):
    initial_sync_status = serializers.CharField(help_text="completed ou failed")
    initial_sync_detail = serializers.CharField(required=False)

    class Meta(RepositorySerializer.Meta):
        fields = (*RepositorySerializer.Meta.fields, "initial_sync_status", "initial_sync_detail")


class WebhookDeliverySerializer(serializers.ModelSerializer):
    ref = serializers.SerializerMethodField()
    commits_count = serializers.SerializerMethodField()

    class Meta:
        model = WebhookDelivery
        fields = (
            "delivery_id",
            "event",
            "status",
            "attempts",
            "error",
            "received_at",
            "processed_at",
            "ref",
            "commits_count",
        )

    def get_ref(self, obj) -> str:
        return (obj.payload or {}).get("ref", "").removeprefix("refs/heads/")

    def get_commits_count(self, obj) -> int:
        return len((obj.payload or {}).get("commits") or [])


class CommitFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommitFile
        fields = ("path", "change_type")


class CommitSerializer(serializers.ModelSerializer):
    repository = serializers.StringRelatedField()
    branch = serializers.SlugRelatedField(read_only=True, slug_field="name")
    author = serializers.SlugRelatedField(read_only=True, slug_field="login")
    files = CommitFileSerializer(many=True, read_only=True)

    class Meta:
        model = Commit
        fields = ("sha", "repository", "branch", "author", "message", "authored_at", "url", "forced_push", "files")


class BranchSerializer(serializers.ModelSerializer):
    repository = serializers.StringRelatedField()

    class Meta:
        model = Branch
        fields = ("id", "repository", "name", "deleted_at")


class PullRequestSerializer(serializers.ModelSerializer):
    repository = serializers.StringRelatedField()
    author = serializers.SlugRelatedField(read_only=True, slug_field="login")

    class Meta:
        model = PullRequest
        fields = (
            "id",
            "repository",
            "number",
            "title",
            "state",
            "author",
            "opened_at",
            "closed_at",
            "merged_at",
            "updated_at",
        )
