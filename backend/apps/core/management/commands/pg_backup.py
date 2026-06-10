import os
import shutil
import subprocess
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Создать pg_dump бэкап PostgreSQL базы данных"

    def add_arguments(self, parser):
        parser.add_argument("--output-dir", default="backups", help="Директория для бэкапа")

    def handle(self, *args, **options):
        if not shutil.which("pg_dump"):
            self.stderr.write("pg_dump не найден")
            return
        output_dir = options["output_dir"]
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{output_dir}/backup_{timestamp}.sql.gz"
        db = settings.DATABASES["default"]
        env = os.environ.copy()
        env["PGPASSWORD"] = db.get("PASSWORD", "") or ""
        cmd = [
            "pg_dump",
            "-h",
            db.get("HOST", "localhost"),
            "-p",
            str(db.get("PORT", 5432)),
            "-U",
            db.get("USER", ""),
            "-d",
            db.get("NAME", ""),
            "-Fc",
            "-Z9",
            "-f",
            filename,
        ]
        result = subprocess.run(cmd, env=env, capture_output=True)
        if result.returncode == 0:
            self.stdout.write(self.style.SUCCESS(f"Бэкап сохранён: {filename}"))
        else:
            self.stderr.write(f"Ошибка pg_dump: {result.stderr.decode()}")
