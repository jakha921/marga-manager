from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command


@pytest.mark.django_db
class TestPgBackupCommand:
    def test_pg_backup_command_exists(self):
        try:
            call_command("pg_backup", "--help", stdout=StringIO())
        except SystemExit:
            pass  # --help завершается с SystemExit(0)

    def test_pg_backup_skips_without_pg_dump(self):
        err = StringIO()
        with patch("shutil.which", return_value=None):
            call_command("pg_backup", stderr=err)
        assert "pg_dump не найден" in err.getvalue()
