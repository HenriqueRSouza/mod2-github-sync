from rest_framework import serializers

from .models import Commit, CommitFile


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
