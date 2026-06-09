# Tenant Isolation

## Architecture

Marga Manager uses **shared-database, shared-schema** multi-tenancy. Every data model inherits `TenantModel` which adds an `organization` FK. Isolation is enforced at three layers.

## Three Layers

### 1. OrganizationMiddleware (`apps/core/middleware.py`)

Sets `request.organization` from the authenticated user:

```python
request.organization = getattr(request.user, "organization", None)
```

Runs after `AuthenticationMiddleware` so `request.user` is always available.

### 2. TenantQuerySetMixin (`apps/core/mixins.py`)

Auto-filters querysets by organization on every GET:

- `SUPER_ADMIN` → returns unfiltered queryset (sees all orgs)
- Non-SUPER_ADMIN with `organization=None` → returns `qs.none()` (logs warning)
- Non-SUPER_ADMIN with org → filters by `organization=user.organization`

`TenantCreateMixin.perform_create()` auto-sets `organization` on create:

- `SUPER_ADMIN` can override via `organization` field in request body
- Regular users → org set from `request.user.organization`
- No org → saves without organization (logs warning)

### 3. Permission Classes (`apps/core/permissions.py`)

| Class | Access |
|-------|--------|
| `IsSuperAdmin` | SUPER_ADMIN only |
| `IsTenantAdmin` | TENANT_ADMIN and above |
| `IsTenantAdminOrReadOnly` | Read for all authenticated, write for TENANT_ADMIN+ |
| `IsKitchenUserOrAbove` | All authenticated roles |

## SUPER_ADMIN Bypass

`SUPER_ADMIN` skips tenant filtering entirely:
- Sees all organizations, kitchens, products, operations
- Can create objects in any org by specifying `organization` in request body
- Analytics endpoints also bypass tenant filter

## Null-Org Users

A user with `organization=None` (rare but possible):
- **Analytics endpoints** (`_get_tenant_qs`, `DashboardView`, `ProductHistoryView`): raises `PermissionDenied` (403)
- **CRUD endpoints** (via `TenantQuerySetMixin`): returns `qs.none()` — empty list (200)

## Cross-FK Validation

`OperationEntrySerializer.validate()` checks that referenced objects belong to the user's org:
- `kitchen.organization_id != user.organization_id` → 400
- `to_kitchen.organization_id != user.organization_id` → 400
- `product.organization_id != user.organization_id` → 400

SUPER_ADMIN bypasses this check.

## Adding a New Tenant-Aware ViewSet

```python
class MyViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    queryset = MyModel.objects.select_related("organization").all()
    permission_classes = [IsTenantAdminOrReadOnly]
    # That's it — filtering and create are handled by the mixins
```

Requirements:
- Model must have `organization` FK
- Model should inherit `TenantModel` from `apps.core.models`
