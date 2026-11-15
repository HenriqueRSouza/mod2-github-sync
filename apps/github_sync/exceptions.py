from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None or not isinstance(response.data, dict) or "detail" not in response.data:
        return response
    if "code" not in response.data:
        response.data = {
            "code": getattr(exc, "default_code", "api_error"),
            **response.data,
        }
    return response
