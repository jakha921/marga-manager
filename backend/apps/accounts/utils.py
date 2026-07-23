def normalize_phone(value: str) -> str:
    """Оставляет только цифры телефона: '+998 90 123 45 67' -> '998901234567'."""
    return "".join(ch for ch in str(value) if ch.isdigit())


def looks_like_phone(value: str) -> bool:
    """True, если строка состоит только из телефонных символов (не логин вроде 'admin')."""
    s = str(value).strip()
    return bool(s) and all(ch.isdigit() or ch in "+-() " for ch in s)
