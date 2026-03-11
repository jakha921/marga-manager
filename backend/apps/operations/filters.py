import django_filters

from .models import OperationEntry


class OperationEntryFilter(django_filters.FilterSet):
    """Фильтры для операций."""

    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = OperationEntry
        fields = ["type", "kitchen", "date_from", "date_to"]
