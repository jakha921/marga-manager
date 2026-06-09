class OrganizationMiddleware:
    """Устанавливает request.organization из user.organization."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = None
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if hasattr(request, "user") and request.user.is_authenticated:
            request.organization = getattr(request.user, "organization", None)
        return None
