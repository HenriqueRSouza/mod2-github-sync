from django.conf import settings
from rest_framework.throttling import AnonRateThrottle


class PlatformAuthThrottle(AnonRateThrottle):
    """Limit anonymous login/registration attempts per client address."""

    scope = "platform_auth"

    def get_rate(self):
        return settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"][self.scope]
