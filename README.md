# Volunteer Backend Application

## Развертывание проекта

### Предварительные требования

1. Аккаунт на GitHub
2. Аккаунт на Heroku
3. База данных MySQL (можно использовать ClearDB на Heroku или внешний хостинг)

### Шаги по развертыванию

1. Форкните репозиторий на GitHub

2. Настройте переменные окружения в GitHub Secrets:
   - DB_HOST - хост базы данных
   - DB_USER - пользователь базы данных
   - DB_PASSWORD - пароль базы данных
   - DB_NAME - имя базы данных
   - JWT_SECRET - секретный ключ для JWT
   - HEROKU_API_KEY - API ключ Heroku
   - HEROKU_APP_NAME - название приложения на Heroku
   - HEROKU_EMAIL - email аккаунта Heroku

3. Создайте новое приложение на Heroku

4. Настройте базу данных:
   - Создайте базу данных MySQL
   - Импортируйте схему из файла database.sql
   - Добавьте addon ClearDB MySQL в ваше приложение Heroku

5. Запустите деплой:
   - Запушьте изменения в ветку main
   - GitHub Actions автоматически задеплоит приложение на Heroku

### Локальная разработка

1. Клонируйте репозиторий
```bash
git clone <your-repo-url>
cd volunteer-backend
```

2. Установите зависимости
```bash
npm install
```

3. Создайте файл .env в корне проекта:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=volunteer_db
JWT_SECRET=your_secret
```

4. Запустите приложение
```bash
npm run dev
```

## Структура проекта

- `/api` - API endpoints
- `/config` - Конфигурационные файлы
- `/middleware` - Middleware функции
- `server.js` - Основной файл сервера
- `database.sql` - Схема базы данных
