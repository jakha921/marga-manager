# One-Shot Prompt for AI Backend Generation

**Task:** Build a Django REST Framework backend for a multi-tenant inventory management system based on the provided `DJANGO_BACKEND_SPEC.md`.

**Instructions:**
1. **Setup:** Initialize a Django project with `djangorestframework`, `django-cors-headers`, `djangorestframework-simplejwt`, and `psycopg2-binary`.
2. **Models:** Implement the models defined in `DJANGO_BACKEND_SPEC.md`. Ensure every tenant-specific model has a `ForeignKey` to `Organization`.
3. **Multi-tenancy:** Implement a custom middleware or a base `TenantModel` that automatically filters all querysets based on the `organization_id` of the authenticated user.
4. **Serializers:** Create DRF serializers for all models.
5. **Permissions:** Implement custom permission classes:
   - `IsTenantAdmin`: Full access to all endpoints.
   - `IsKitchenUser`: Access only to `GET/POST` on `Operation` and `Product`. No `DELETE` or `PUT` access.
6. **ViewSets:** Implement ViewSets for `Kitchen`, `Product`, and `Operation`.
7. **Analytics:** Implement the `/api/analytics/dashboard/` endpoint with the logic described in the spec.
8. **Testing:** Include basic unit tests for the multi-tenancy filtering and permission logic.
9. **Documentation:** Ensure all endpoints are documented using `drf-spectacular` (OpenAPI).

**Constraint:** Do not use mock data in the backend. Use the actual PostgreSQL database.
