from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from rest_framework import serializers as drf_serializers
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsKitchenUserOrAbove
from apps.kitchens.models import Kitchen

from .filters import OperationEntryFilter
from .models import OperationEntry
from .serializers import OperationEntrySerializer

ZERO = Decimal("0")


class OperationViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD операций."""

    queryset = OperationEntry.objects.select_related("kitchen", "to_kitchen", "product").all()
    serializer_class = OperationEntrySerializer
    permission_classes = [IsKitchenUserOrAbove]
    filterset_class = OperationEntryFilter
    search_fields = ["product__name"]

    @action(detail=False, url_path="last-incoming/(?P<product_id>[^/.]+)")
    def last_incoming(self, request, product_id=None):
        """Последняя цена прихода для автозаполнения."""
        entry = (
            self.get_queryset()
            .filter(
                type=OperationEntry.Type.INCOMING,
                product_id=product_id,
                price__isnull=False,
            )
            .order_by("-date", "-time")
            .first()
        )

        if entry:
            unit_price = entry.price / entry.quantity if entry.quantity else None
            return Response(
                {
                    "price": str(entry.price),
                    "unit_price": str(unit_price) if unit_price is not None else None,
                    "quantity": str(entry.quantity),
                    "unit": entry.unit,
                }
            )
        return Response({"price": None, "unit_price": None, "quantity": None, "unit": None})

    @action(detail=False, url_path="export", methods=["get"])
    def export_excel(self, request):
        """Экспорт операций в xlsx."""
        import io

        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

        qs = self.filter_queryset(self.get_queryset())

        wb = Workbook()
        ws = wb.active
        ws.title = "Operations"

        # Стили
        header_font = Font(bold=True, size=12)
        header_fill = PatternFill(start_color="CBD5E1", end_color="CBD5E1", fill_type="solid")
        thin_border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin"),
        )
        total_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        # Заголовки
        headers = ["Sana", "Mahsulot", "O'lchov", "Miqdor", "Narx za ed.", "Summa"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center")

        # Данные
        total_sum = ZERO
        for row_idx, op in enumerate(qs, 2):
            price = op.price or ZERO
            qty = op.quantity or ZERO
            unit_price = price / qty if qty else ZERO
            total_sum += price

            values = [
                str(op.date),
                op.product.name if op.product else "—",
                op.unit,
                float(qty),
                float(unit_price),
                float(price),
            ]
            for col, val in enumerate(values, 1):
                cell = ws.cell(row=row_idx, column=col, value=val)
                cell.border = thin_border
                if col >= 4:
                    cell.number_format = "#,##0"

        # Итого
        last_row = qs.count() + 2
        ws.cell(row=last_row, column=5, value="JAMI").font = Font(bold=True)
        ws.cell(row=last_row, column=5).fill = total_fill
        ws.cell(row=last_row, column=5).border = thin_border
        total_cell = ws.cell(row=last_row, column=6, value=float(total_sum))
        total_cell.font = Font(bold=True)
        total_cell.fill = total_fill
        total_cell.border = thin_border
        total_cell.number_format = "#,##0"

        # Ширина колонок
        ws.column_dimensions["A"].width = 14
        ws.column_dimensions["B"].width = 30
        ws.column_dimensions["C"].width = 10
        ws.column_dimensions["D"].width = 12
        ws.column_dimensions["E"].width = 15
        ws.column_dimensions["F"].width = 15

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        from django.http import HttpResponse

        response = HttpResponse(
            output.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = "attachment; filename=operations_export.xlsx"
        return response


class DashboardView(APIView):
    """GET /api/analytics/dashboard/ — агрегированные данные."""

    permission_classes = [IsKitchenUserOrAbove]

    def get(self, request):
        from django.utils import timezone

        today = timezone.now().date()
        user = request.user

        qs = OperationEntry.objects.all()
        if user.role != "SUPER_ADMIN" and user.organization:
            qs = qs.filter(organization=user.organization)

        today_qs = qs.filter(date=today)

        stats = {
            "today_entries": today_qs.count(),
            "incoming_total": (
                today_qs.filter(type="INCOMING").aggregate(total=Sum("quantity"))["total"] or 0
            ),
            "sales_count": today_qs.filter(type="SALE").count(),
            "sales_total": (
                today_qs.filter(type="SALE").aggregate(total=Sum("price"))["total"] or 0
            ),
            "operations_by_type": list(
                qs.values("type").annotate(count=Count("id")).order_by("type")
            ),
        }
        return Response(stats)


class ProductHistoryView(APIView):
    """GET /api/analytics/product-history/<product_id>/ — история по дням."""

    permission_classes = [IsKitchenUserOrAbove]

    def get(self, request, product_id):
        user = request.user

        qs = OperationEntry.objects.filter(product_id=product_id)
        if user.role != "SUPER_ADMIN" and user.organization:
            qs = qs.filter(organization=user.organization)

        history = (
            qs.values("date", "type")
            .annotate(total_quantity=Sum("quantity"), count=Count("id"))
            .order_by("date")
        )
        return Response(list(history))


def _get_tenant_qs(user):
    """Получить базовый queryset с фильтрацией по организации."""
    qs = OperationEntry.objects.all()
    if user.role != "SUPER_ADMIN" and user.organization:
        qs = qs.filter(organization=user.organization)
    return qs


class KitchenReportView(APIView):
    """GET /api/analytics/kitchen-report/ — финансовый отчёт по кухням."""

    permission_classes = [IsKitchenUserOrAbove]

    def get(self, request):
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if not date_from or not date_to:
            raise drf_serializers.ValidationError(
                {"detail": "Параметры date_from и date_to обязательны."}
            )

        kitchen_filter = request.query_params.get("kitchen")
        user = request.user
        qs = _get_tenant_qs(user)

        # Кухни для отчёта
        kitchens_qs = Kitchen.objects.all()
        if user.role != "SUPER_ADMIN" and user.organization:
            kitchens_qs = kitchens_qs.filter(organization=user.organization)
        if kitchen_filter:
            kitchens_qs = kitchens_qs.filter(id=kitchen_filter)

        kitchens_data = []
        totals = {
            "beginning_balance": ZERO,
            "incoming": ZERO,
            "end_balance": ZERO,
            "transfers_out": ZERO,
            "transfers_in": ZERO,
            "actual_expense": ZERO,
            "sales_revenue": ZERO,
            "markup_val": ZERO,
        }

        for kitchen in kitchens_qs:
            # Начальный остаток — DAILY на date_from
            beginning_balance = qs.filter(
                kitchen=kitchen, type=OperationEntry.Type.DAILY, date=date_from
            ).aggregate(total=Coalesce(Sum("price"), ZERO))["total"]

            # Приход за период
            incoming = qs.filter(
                kitchen=kitchen,
                type=OperationEntry.Type.INCOMING,
                date__gte=date_from,
                date__lte=date_to,
            ).aggregate(total=Coalesce(Sum("price"), ZERO))["total"]

            # Конечный остаток — DAILY на date_to
            end_balance = qs.filter(
                kitchen=kitchen, type=OperationEntry.Type.DAILY, date=date_to
            ).aggregate(total=Coalesce(Sum("price"), ZERO))["total"]

            # Перемещения из кухни
            transfers_out = qs.filter(
                kitchen=kitchen,
                type=OperationEntry.Type.TRANSFER,
                date__gte=date_from,
                date__lte=date_to,
            ).aggregate(total=Coalesce(Sum("price"), ZERO))["total"]

            # Перемещения в кухню
            transfers_in = qs.filter(
                to_kitchen=kitchen,
                type=OperationEntry.Type.TRANSFER,
                date__gte=date_from,
                date__lte=date_to,
            ).aggregate(total=Coalesce(Sum("price"), ZERO))["total"]

            # Фактический расход
            actual_expense = (
                beginning_balance + incoming + transfers_in - transfers_out - end_balance
            )

            # Выручка от продаж
            sales_revenue = qs.filter(
                kitchen=kitchen,
                type=OperationEntry.Type.SALE,
                date__gte=date_from,
                date__lte=date_to,
            ).aggregate(total=Coalesce(Sum("price"), ZERO))["total"]

            markup_val = sales_revenue - actual_expense
            markup_percent = (
                (markup_val / actual_expense * 100) if actual_expense > 0 else Decimal("0")
            )

            entry = {
                "kitchen_id": kitchen.id,
                "kitchen_name": kitchen.name,
                "beginning_balance": beginning_balance,
                "incoming": incoming,
                "end_balance": end_balance,
                "transfers_out": transfers_out,
                "transfers_in": transfers_in,
                "actual_expense": actual_expense,
                "sales_revenue": sales_revenue,
                "markup_val": markup_val,
                "markup_percent": round(markup_percent, 1),
            }
            kitchens_data.append(entry)

            # Аккумулируем итоги
            for key in totals:
                totals[key] += entry[key]

        totals["markup_percent"] = (
            round(totals["markup_val"] / totals["actual_expense"] * 100, 1)
            if totals["actual_expense"] > 0
            else Decimal("0")
        )

        # Проверяем, нужен ли xlsx export
        fmt = request.query_params.get("format")
        if fmt == "xlsx":
            return self._export_xlsx(kitchens_data, totals, date_from, date_to)

        return Response({"kitchens": kitchens_data, "totals": totals})

    def _export_xlsx(self, kitchens_data, totals, date_from, date_to):
        """Экспорт kitchen report в xlsx."""
        import io

        from django.http import HttpResponse
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

        wb = Workbook()
        ws = wb.active
        ws.title = "Kitchen Report"

        header_font = Font(bold=True, size=11)
        header_fill = PatternFill(start_color="CBD5E1", end_color="CBD5E1", fill_type="solid")
        total_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        thin_border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin"),
        )

        # Заголовок
        ws.merge_cells("A1:H1")
        title_cell = ws.cell(row=1, column=1, value="Asosiy Moliyaviy Hisobot")
        title_cell.font = Font(bold=True, size=14)
        title_cell.alignment = Alignment(horizontal="center")

        ws.cell(row=2, column=1, value=f"Davr: {date_from} — {date_to}").font = Font(italic=True)

        headers = [
            "Bo'lim",
            "Bosh. Qoldiq",
            "Kirim",
            "Xarajat",
            "Oxir. Qoldiq",
            "Sotuv",
            "Foyda",
            "%",
        ]
        for col, h in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="center")

        for i, k in enumerate(kitchens_data, 5):
            vals = [
                k["kitchen_name"],
                float(k["beginning_balance"]),
                float(k["incoming"]),
                float(k["actual_expense"]),
                float(k["end_balance"]),
                float(k["sales_revenue"]),
                float(k["markup_val"]),
                f"{k['markup_percent']}%",
            ]
            for col, v in enumerate(vals, 1):
                cell = ws.cell(row=i, column=col, value=v)
                cell.border = thin_border
                if isinstance(v, float):
                    cell.number_format = "#,##0"

        total_row = len(kitchens_data) + 5
        total_vals = [
            "JAMI (ITOGO)",
            float(totals["beginning_balance"]),
            float(totals["incoming"]),
            float(totals["actual_expense"]),
            float(totals["end_balance"]),
            float(totals["sales_revenue"]),
            float(totals["markup_val"]),
            f"{totals['markup_percent']}%",
        ]
        for col, v in enumerate(total_vals, 1):
            cell = ws.cell(row=total_row, column=col, value=v)
            cell.font = Font(bold=True)
            cell.fill = total_fill
            cell.border = thin_border
            if isinstance(v, float):
                cell.number_format = "#,##0"

        for letter, width in [
            ("A", 20),
            ("B", 15),
            ("C", 15),
            ("D", 15),
            ("E", 15),
            ("F", 15),
            ("G", 15),
            ("H", 10),
        ]:
            ws.column_dimensions[letter].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = "attachment; filename=kitchen_report.xlsx"
        return response


class OperationsSummaryView(APIView):
    """GET /api/analytics/operations-summary/ — итоги для QuickInput."""

    permission_classes = [IsKitchenUserOrAbove]

    def get(self, request):
        qs = _get_tenant_qs(request.user)

        # Фильтры
        op_type = request.query_params.get("type")
        kitchen = request.query_params.get("kitchen")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        search = request.query_params.get("search")

        if op_type:
            qs = qs.filter(type=op_type)
        if kitchen:
            qs = qs.filter(kitchen_id=kitchen)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(product__name__icontains=search)

        total_amount = qs.aggregate(total=Coalesce(Sum("price"), ZERO))["total"]
        count = qs.count()

        # Группировка quantity по unit
        unit_groups = qs.values("unit").annotate(total_qty=Sum("quantity")).order_by("unit")
        total_quantities = {g["unit"]: g["total_qty"] for g in unit_groups}

        return Response(
            {
                "total_amount": total_amount,
                "total_quantities": total_quantities,
                "count": count,
            }
        )
