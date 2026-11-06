import json
import re
from collections import Counter
from statistics import mean

import requests
from django.conf import settings
from django.utils import timezone

from ..models import Commit, Repository

_CONVENTIONAL_COMMIT = re.compile(r"^(feat|fix|docs|test|refactor|perf|build|ci|chore)(\([^)]+\))?!?:\s+\S+", re.I)
_ISSUE_REFERENCE = re.compile(r"(?:[A-Z][A-Z0-9]+-\d+|#\d+|US\d+)", re.I)
_VAGUE_MESSAGES = {
    "ajustes",
    "ajustes finais",
    "alterações",
    "changes",
    "fix",
    "fixes",
    "update",
    "updates",
    "wip",
}


def score_commit_message(message: str) -> dict:
    subject = (message or "").splitlines()[0].strip()
    normalized = subject.casefold()
    score = 0
    signals = []
    suggestions = []

    if _CONVENTIONAL_COMMIT.match(subject):
        score += 30
        signals.append("conventional_commit")
    else:
        suggestions.append("Use um tipo objetivo, como feat:, fix:, docs: ou test:.")

    if 12 <= len(subject) <= 72:
        score += 25
        signals.append("useful_length")
    elif len(subject) < 12:
        suggestions.append("Explique a mudança com mais contexto.")
    else:
        suggestions.append("Mantenha a primeira linha com no máximo 72 caracteres.")

    if normalized not in _VAGUE_MESSAGES and len(subject.split()) >= 3:
        score += 25
        signals.append("specific_subject")
    else:
        suggestions.append("Evite mensagens vagas; descreva o efeito da mudança.")

    if _ISSUE_REFERENCE.search(subject):
        score += 10
        signals.append("work_item_reference")

    if subject and subject[-1] != ".":
        score += 5
        signals.append("concise_subject")

    if "\n\n" in (message or "") and len((message or "").splitlines()) > 2:
        score += 5
        signals.append("descriptive_body")

    score = min(score, 100)
    label = "clara" if score >= 75 else "adequada" if score >= 50 else "vaga"
    return {
        "score": score,
        "label": label,
        "signals": signals,
        "suggestions": suggestions,
    }


def _provider_recommendations(summary: dict) -> tuple[list[str], str]:
    if not settings.AI_INSIGHTS_ENABLED or not settings.AI_PROVIDER_URL:
        return [], "deterministic-v1"
    response = requests.post(
        settings.AI_PROVIDER_URL,
        headers={
            "Authorization": f"Bearer {settings.AI_PROVIDER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.AI_PROVIDER_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Analise apenas os indicadores agregados de fluxo Git. "
                        "Responda JSON com a chave recommendations contendo no máximo 3 strings curtas em português."
                    ),
                },
                {"role": "user", "content": json.dumps(summary, ensure_ascii=False)},
            ],
            "temperature": 0.1,
        },
        timeout=settings.AI_PROVIDER_TIMEOUT,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    data = json.loads(content)
    recommendations = [str(item)[:300] for item in data.get("recommendations", [])[:3]]
    return recommendations, f"provider:{settings.AI_PROVIDER_MODEL}"


def repository_intelligence(repository: Repository, days: int = 30) -> dict:
    since = timezone.now() - timezone.timedelta(days=days)
    commits = list(
        Commit.objects.filter(repository=repository, authored_at__gte=since)
        .select_related("author")
        .order_by("-authored_at")
    )
    scored = [{"commit": commit, **score_commit_message(commit.message)} for commit in commits]
    weekday_counts = Counter(commit.authored_at.strftime("%A").lower() for commit in commits)
    hour_counts = Counter(commit.authored_at.hour for commit in commits)
    author_counts = Counter((commit.author.login if commit.author else "unknown") for commit in commits)
    daily_counts = Counter(commit.authored_at.date().isoformat() for commit in commits)
    average_score = round(mean(item["score"] for item in scored), 1) if scored else None
    top_author, top_author_commits = author_counts.most_common(1)[0] if author_counts else (None, 0)
    concentration = round(top_author_commits / len(commits) * 100, 1) if commits else 0
    off_hours = sum(count for hour, count in hour_counts.items() if hour < 7 or hour >= 22)
    off_hours_percent = round(off_hours / len(commits) * 100, 1) if commits else 0
    average_daily = mean(daily_counts.values()) if daily_counts else 0
    burst_days = [day for day, count in daily_counts.items() if count >= max(3, average_daily * 2)]

    bottlenecks = []
    recommendations = []
    if concentration >= 60 and len(commits) >= 5:
        bottlenecks.append(
            {
                "code": "author_concentration",
                "severity": "warning",
                "evidence": f"{concentration}% dos commits no período são de {top_author}.",
            }
        )
        recommendations.append("Distribua revisão e conhecimento das áreas alteradas entre mais integrantes.")
    if off_hours_percent >= 30 and len(commits) >= 5:
        bottlenecks.append(
            {
                "code": "off_hours_activity",
                "severity": "info",
                "evidence": f"{off_hours_percent}% dos commits ocorreram entre 22h e 7h.",
            }
        )
        recommendations.append(
            "Revise a cadência de entrega para reduzir concentração de trabalho fora do horário esperado."
        )
    if burst_days:
        bottlenecks.append(
            {
                "code": "commit_bursts",
                "severity": "info",
                "evidence": f"Picos de commits identificados em {len(burst_days)} dia(s) do período.",
            }
        )
        recommendations.append("Prefira lotes menores e contínuos para facilitar revisão e recuperação de falhas.")
    if average_score is not None and average_score < 60:
        bottlenecks.append(
            {
                "code": "commit_message_clarity",
                "severity": "warning",
                "evidence": f"A clareza média das mensagens foi {average_score}/100.",
            }
        )
        recommendations.append("Adote Conventional Commits e inclua efeito, escopo e referência da história.")
    if not commits:
        recommendations.append("Sincronize commits do período para habilitar a análise do fluxo Git.")

    aggregate_summary = {
        "period_days": days,
        "total_commits": len(commits),
        "average_clarity_score": average_score,
        "author_concentration_percent": concentration,
        "off_hours_percent": off_hours_percent,
        "burst_days_count": len(burst_days),
        "bottleneck_codes": [item["code"] for item in bottlenecks],
    }
    try:
        provider_recommendations, analysis_mode = _provider_recommendations(aggregate_summary)
        recommendations.extend(provider_recommendations)
    except (requests.RequestException, KeyError, ValueError, TypeError, json.JSONDecodeError):
        analysis_mode = "deterministic-v1-provider-unavailable"

    unique_recommendations = list(dict.fromkeys(recommendations))[:5]
    return {
        "repository": {"id": repository.pk, "name": str(repository)},
        "period_days": days,
        "generated_at": timezone.now(),
        "analysis_mode": analysis_mode,
        "total_commits": len(commits),
        "average_clarity_score": average_score,
        "clarity_distribution": dict(Counter(item["label"] for item in scored)),
        "frequency": {
            "by_weekday": dict(sorted(weekday_counts.items())),
            "by_hour": {str(hour): count for hour, count in sorted(hour_counts.items())},
            "by_author": dict(author_counts.most_common()),
        },
        "indicators": {
            "top_author": top_author,
            "author_concentration_percent": concentration,
            "off_hours_percent": off_hours_percent,
            "burst_days": sorted(burst_days),
        },
        "bottlenecks": bottlenecks,
        "recommendations": unique_recommendations,
        "recent_commit_quality": [
            {
                "sha": item["commit"].sha,
                "message": item["commit"].message.splitlines()[0],
                "author": item["commit"].author.login if item["commit"].author else None,
                "authored_at": item["commit"].authored_at,
                "score": item["score"],
                "label": item["label"],
                "suggestions": item["suggestions"],
            }
            for item in scored[:20]
        ],
    }
