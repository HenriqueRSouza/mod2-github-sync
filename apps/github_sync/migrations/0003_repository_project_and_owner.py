from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("github_sync", "0002_repository_webhook_secret_expires_at_and_more")]

    operations = [
        migrations.AddField(
            model_name="repository",
            name="platform_user_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="repository",
            name="project_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
    ]
