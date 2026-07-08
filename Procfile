web: gunicorn desko_backend.wsgi --log-file -
release: python manage.py migrate && python manage.py seed_ai_model
