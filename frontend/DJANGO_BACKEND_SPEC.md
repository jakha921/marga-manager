# Django Backend Specification for Marga Manager

## 1. Project Overview
This document provides a comprehensive specification for building a Django REST Framework (DRF) backend for the Marga Manager application. The system is a multi-tenant (SaaS) inventory and financial management system.

## 2. Core Architecture
- **Framework:** Django + Django REST Framework (DRF).
- **Database:** PostgreSQL.
- **Multi-tenancy:** Strict isolation by `organization_id`. Every request must be scoped to the organization of the authenticated user.
- **Authentication:** JWT (using `djangorestframework-simplejwt`).

## 3. Database Models (Django ORM)

All tenant-specific models MUST have an `organization` foreign key.

### Organization
```python
class Organization(models.Model):
    name = models.CharField(max_length=255)
    plan = models.CharField(max_length=20, choices=[('BASIC', 'Basic'), ('PRO', 'Pro'), ('ENTERPRISE', 'Enterprise')])
    status = models.CharField(max_length=20, choices=[('ACTIVE', 'Active'), ('SUSPENDED', 'Suspended')])
    max_kitchens = models.IntegerField()
    max_users = models.IntegerField()
    currency = models.CharField(max_length=3, default='UZS')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    low_stock_threshold = models.IntegerField(default=10)
```

### User
```python
class User(AbstractUser):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[('SUPER_ADMIN', 'Super Admin'), ('TENANT_ADMIN', 'Manager'), ('KITCHEN_USER', 'Kitchen Staff')])
```

### Kitchen
```python
class Kitchen(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
```

### Product
```python
class Product(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    unit = models.CharField(max_length=20) # 'kg', 'pcs', etc.
    
    class Meta:
        unique_together = ('organization', 'code')
```

### Operation
```python
class Operation(models.Model):
    TYPE_CHOICES = [('INCOMING', 'Incoming'), ('DAILY', 'Daily'), ('TRANSFER', 'Transfer'), ('SALE', 'Sale')]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date = models.DateField()
    time = models.TimeField()
    kitchen = models.ForeignKey(Kitchen, on_delete=models.CASCADE, related_name='source_operations')
    to_kitchen = models.ForeignKey(Kitchen, on_delete=models.CASCADE, related_name='destination_operations', null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
```

## 4. Multi-tenancy Implementation
Implement a custom middleware or use a base `TenantModel` that automatically filters querysets based on `request.user.organization_id`.

```python
# Example for ViewSets
class TenantViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return self.queryset.filter(organization=self.request.user.organization)
```

## 5. API Endpoints (DRF ViewSets)

| Endpoint | Method | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `/api/kitchens/` | GET/POST | List/Create | Admin/Kitchen |
| `/api/products/` | GET/POST | List/Create | Admin/Kitchen |
| `/api/operations/` | GET/POST | List/Create | Admin/Kitchen |
| `/api/operations/:id` | PUT/DELETE | Update/Delete | Admin only |

## 6. Business Logic & Analytics (Backend)

The backend MUST perform these calculations instead of the frontend:

### Dashboard Analytics Endpoint (`/api/analytics/dashboard/`)
- **Inputs:** `start_date`, `end_date`, `kitchen_id` (optional).
- **Calculations:**
    - **Sales Revenue:** Sum of `price` where `type='SALE'`.
    - **Actual Expense (Consumption):** 
      `Beginning Balance + Incoming + TransfersIn - TransfersOut - End Balance`.
      *Note: This requires fetching DAILY operations for start/end dates.*
    - **Markup:** `Sales Revenue - Actual Expense`.

## 7. Security & Permissions
- `SUPER_ADMIN`: Access to all organizations.
- `TENANT_ADMIN`: Access to all endpoints within their organization.
- `KITCHEN_USER`: Access to `GET/POST` on `/api/operations/` and `GET/POST` on `/api/products/`. **NO DELETE/UPDATE** permissions on operations or products.
