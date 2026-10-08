"""Configure a repository test webhook using existing Docker and gh sessions."""

import argparse
import json
import os
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPOSITORY = "HenriqueRSouza/mod2-github-sync"
COMPOSE = ["docker", "compose", "-f", "compose.yaml", "-f", "compose.webhook-test.yaml"]


def run(args, **kwargs):
    return subprocess.check_output(args, cwd=ROOT, text=True, **kwargs).strip()


def main():
    parser = argparse.ArgumentParser(description="Configure a GitHub repository for local webhook analysis")
    parser.add_argument("--repository", default=DEFAULT_REPOSITORY, help="GitHub owner/repository")
    repository_name = parser.parse_args().repository
    env = os.environ.copy()
    env["GH_TOKEN"] = run([
        "gh", "auth", "token", "--hostname", "github.com", "--user", "HenriqueRSouza",
    ])

    def api(path, method="GET", payload=None):
        args = ["gh", "api", path, "--method", method]
        kwargs = {"env": env}
        if payload is not None:
            args += ["--input", "-"]
            kwargs["input"] = json.dumps(payload)
        result = run(args, **kwargs)
        return json.loads(result) if result else None

    metadata = api(f"repos/{repository_name}")
    if not metadata["permissions"]["admin"]:
        raise RuntimeError("Repository administrator permission is required")
    repository_name = metadata["full_name"]
    owner = metadata["owner"]["login"]
    name = metadata["name"]
    hooks = api(f"repos/{repository_name}/hooks")
    subprocess.run(COMPOSE + ["up", "-d"], cwd=ROOT, check=True)
    public_url = None
    for _ in range(30):
        logs = run(COMPOSE + ["logs", "--no-color", "webhook-tunnel"])
        urls = re.findall(r"https://[a-z0-9-]+\.trycloudflare\.com", logs)
        if urls:
            public_url = urls[-1]
            break
        time.sleep(2)
    if public_url is None:
        raise RuntimeError("Tunnel did not provide a public URL; inspect its Docker logs")

    # Keep the existing secret. Never print secrets or persist them to source files.
    code = (
        "import json,secrets; from django.core.management import call_command; "
        "from apps.github_sync.models import Repository; "
        "from apps.github_sync.services.crypto import decrypt_secret; "
        f"repo=Repository.objects.filter(github_id={metadata['id']}).first(); "
        "secret=decrypt_secret(repo.webhook_secret) if repo else secrets.token_urlsafe(32); "
        f"call_command('register_repository',github_id={metadata['id']},"
        f"owner={owner!r},name={name!r},"
        f"default_branch={metadata['default_branch']!r},webhook_secret=secret); "
        "print(json.dumps({'secret':secret}))"
    )
    output = run(COMPOSE + ["exec", "-T", "app", "python", "manage.py", "shell", "-c", code])
    secret = json.loads(output.splitlines()[-1])["secret"]
    webhook_url = public_url + "/webhooks/github"
    payload = {
        "name": "web", "active": True, "events": ["push", "pull_request"],
        "config": {"url": webhook_url, "content_type": "json", "secret": secret, "insecure_ssl": "0"},
    }
    # Update only our test tunnel hook; leave other integrations untouched.
    existing = next((hook for hook in hooks if
                     hook.get("config", {}).get("url", "").endswith(".trycloudflare.com/webhooks/github")), None)
    path = f"repos/{repository_name}/hooks"
    if existing:
        path += f"/{existing['id']}"
    hook = api(path, "PATCH" if existing else "POST", payload)
    hook_path = f"repos/{repository_name}/hooks/{hook['id']}"
    previous_deliveries = {delivery["id"] for delivery in api(hook_path + "/deliveries")}
    api(hook_path + "/pings", "POST")
    for _ in range(30):
        deliveries = api(hook_path + "/deliveries")
        successful = next((delivery for delivery in deliveries
                           if delivery["id"] not in previous_deliveries
                           and delivery["event"] == "ping" and delivery["status_code"] == 202), None)
        if successful:
            print(json.dumps({"repository": repository_name, "hook_id": hook["id"],
                              "webhook_url": webhook_url, "ping_status": 202}, indent=2))
            return
        time.sleep(2)
    raise RuntimeError("Webhook created, but no successful ping yet. Inspect GitHub deliveries and Docker logs.")


if __name__ == "__main__":
    main()
