import logging


def create_audit_log(
    event_type: str,
    actor=None,
    organization=None,
    target_type: str = "",
    target_id: int = 0,
    old_value: dict | None = None,
    new_value: dict | None = None,
    metadata: dict | None = None,
) -> None:
    """Создать запись AuditLog. Безопасно при ошибках — не бросает исключений."""
    try:
        from apps.payments.models import AuditLog

        AuditLog.objects.create(
            event_type=event_type,
            actor=actor,
            organization=organization,
            target_type=target_type,
            target_id=target_id or 0,
            old_value=old_value or {},
            new_value=new_value or {},
            metadata=metadata or {},
        )
    except Exception:
        logging.getLogger("apps.core").error("Failed to create AuditLog", exc_info=True)
