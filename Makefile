.PHONY: dev migrate seed test build up down logs

dev:
	docker-compose up --build

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose -f docker-compose.prod.yml build

migrate:
	cd backend && uv run python manage.py migrate

makemigrations:
	cd backend && uv run python manage.py makemigrations

seed:
	cd backend && uv run python manage.py seed_data

test:
	cd backend && uv run pytest -v

shell:
	cd backend && uv run python manage.py shell

createsuperuser:
	cd backend && uv run python manage.py createsuperuser

logs:
	docker-compose logs -f

prod:
	docker-compose -f docker-compose.prod.yml up --build -d
