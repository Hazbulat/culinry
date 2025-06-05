-- Create database
CREATE DATABASE IF NOT EXISTS culinary_db;
USE culinary_db;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS recipe_favorites;
DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS recipe_steps;
DROP TABLE IF EXISTS shopping_lists;
DROP TABLE IF EXISTS favorite_recipes;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS user_class_registrations;
DROP TABLE IF EXISTS class_certificates;
DROP TABLE IF EXISTS masterclasses;
DROP TABLE IF EXISTS chef_subscribers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS chef_certificates;
DROP TABLE IF EXISTS chef_cuisines;
DROP TABLE IF EXISTS chefs;
DROP TABLE IF EXISTS cuisines;

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    preferences TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create masterclasses table
CREATE TABLE masterclasses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    chef_id INT,
    cuisine VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    date DATETIME NOT NULL,
    duration INT NOT NULL,
    max_participants INT NOT NULL,
    current_participants INT DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chef_id) REFERENCES users(id),
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled'))
);

-- Create cuisines table
CREATE TABLE cuisines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chefs table
CREATE TABLE chefs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    experience INT NOT NULL,
    bio TEXT NOT NULL,
    education TEXT NOT NULL,
    achievements TEXT,
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create chef_certificates table
CREATE TABLE chef_certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chef_id INT NOT NULL,
    certificate_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chef_id) REFERENCES chefs(id) ON DELETE CASCADE
);

-- Create chef_cuisines table
CREATE TABLE chef_cuisines (
    chef_id INT NOT NULL,
    cuisine_id INT NOT NULL,
    PRIMARY KEY (chef_id, cuisine_id),
    FOREIGN KEY (chef_id) REFERENCES chefs(id) ON DELETE CASCADE,
    FOREIGN KEY (cuisine_id) REFERENCES cuisines(id) ON DELETE CASCADE
);

-- Create recipes table
CREATE TABLE recipes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chef_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cuisine VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    cooking_time INT NOT NULL,
    video_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chef_id) REFERENCES chefs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create recipe_ingredients table
CREATE TABLE recipe_ingredients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    unit ENUM('g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp') NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create recipe_steps table
CREATE TABLE recipe_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_id INT NOT NULL,
    step_number INT NOT NULL,
    description TEXT NOT NULL,
    tip TEXT,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create user_class_registrations table
CREATE TABLE user_class_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    class_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'registered',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES masterclasses(id),
    CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
    UNIQUE KEY unique_registration (user_id, class_id)
);

-- Create class_certificates table
CREATE TABLE class_certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    class_id INT NOT NULL,
    certificate_url VARCHAR(255) NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES masterclasses(id),
    UNIQUE KEY unique_certificate (user_id, class_id)
);

-- Create favorite_recipes table
CREATE TABLE favorite_recipes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    UNIQUE KEY unique_favorite (user_id, recipe_id)
);

-- Create shopping_lists table
CREATE TABLE shopping_lists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    ingredients JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Create recipe_favorites table
CREATE TABLE recipe_favorites (
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Create chef_subscribers table
CREATE TABLE chef_subscribers (
    chef_id INT NOT NULL,
    subscriber_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chef_id, subscriber_id),
    FOREIGN KEY (chef_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscriber_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert sample user types (admin/chef/student)
INSERT INTO users (name, email, password_hash, phone, preferences) VALUES
('Admin User', 'admin@culinarypro.com', '$2y$10$example_hash', '+7 (999) 123-45-67', '["administration"]'),
('Chef Gordon', 'chef@culinarypro.com', '$2y$10$example_hash', '+7 (999) 234-56-78', '["French cuisine", "Italian cuisine"]'),
('Student User', 'student@culinarypro.com', '$2y$10$example_hash', '+7 (999) 345-67-89', '["Desserts", "Vegetarian"]');

-- Insert sample masterclasses
INSERT INTO masterclasses (title, description, chef_id, cuisine, type, difficulty, date, duration, max_participants, price) VALUES
('Итальянская паста с нуля', 'Научитесь готовить настоящую итальянскую пасту', 2, 'italian', 'main', 'intermediate', 
 DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY), 120, 10, 3500),
('Французские десерты', 'Секреты приготовления классических французских десертов', 2, 'french', 'dessert', 'advanced',
 DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 14 DAY), 180, 8, 4500);

-- Insert sample cuisines first
INSERT INTO cuisines (name) VALUES
('Итальянская'),
('Японская'),
('Французская'),
('Русская'),
('Средиземноморская'),
('Азиатская'),
('Европейская');

-- Insert sample chef
INSERT INTO chefs (name, specialization, experience, bio, education, achievements) VALUES
('Шеф Гордон', 'Итальянская и французская кухня', 15, 
 'Опытный шеф-повар с международным опытом работы. Обучался в лучших ресторанах Италии и Франции.',
 'Кулинарная академия Le Cordon Bleu, стажировка в мишленовских ресторанах',
 'Победитель международных кулинарных конкурсов, автор книги по итальянской кухне');

-- Link chef with cuisines
INSERT INTO chef_cuisines (chef_id, cuisine_id)
SELECT 1, id FROM cuisines WHERE name IN ('Итальянская', 'Французская');

-- Insert sample recipe
INSERT INTO recipes (chef_id, title, description, cuisine, type, difficulty, cooking_time)
SELECT 1, -- используем id шефа, которого мы только что создали
    'Паста Карбонара',
    'Классическая итальянская паста с соусом из яиц, сыра пекорино романо и гуанчиале',
    'Итальянская',
    'main',
    'intermediate',
    30
FROM cuisines c
WHERE c.name = 'Итальянская'
LIMIT 1;

-- Now we can safely insert recipe ingredients
INSERT INTO recipe_ingredients (recipe_id, name, amount, unit) VALUES
(1, 'Спагетти', 400, 'g'),
(1, 'Гуанчиале', 150, 'g'),
(1, 'Яйца', 4, 'pcs'),
(1, 'Пекорино Романо', 100, 'g'),
(1, 'Черный перец', 2, 'tsp');

-- And recipe steps
INSERT INTO recipe_steps (recipe_id, step_number, description, tip) VALUES
(1, 1, 'Нарежьте гуанчиале кубиками', 'Для лучшего вкуса используйте охлажденное мясо'),
(1, 2, 'Отварите спагетти в подсоленной воде до состояния аль денте', 'Сохраните немного воды от пасты'),
(1, 3, 'Обжарьте гуанчиале до золотистой корочки', 'Не пережарьте, чтобы не стало слишком сухим'),
(1, 4, 'Смешайте яйца с тертым сыром и перцем', 'Яйца должны быть комнатной температуры'),
(1, 5, 'Соедините пасту с гуанчиале и яичной смесью', 'Перемешивайте быстро, чтобы яйца не свернулись');

-- Add more sample recipes
INSERT INTO recipes (chef_id, title, description, cuisine, type, difficulty, cooking_time)
SELECT 1,
    'Тирамису',
    'Классический итальянский десерт с кофе и маскарпоне',
    'Итальянская',
    'dessert',
    'intermediate',
    40
FROM cuisines c
WHERE c.name = 'Итальянская'
LIMIT 1;

INSERT INTO recipe_ingredients (recipe_id, name, amount, unit) VALUES
(2, 'Маскарпоне', 500, 'g'),
(2, 'Яйца', 6, 'pcs'),
(2, 'Савоярди', 300, 'g'),
(2, 'Кофе эспрессо', 300, 'ml'),
(2, 'Какао-порошок', 50, 'g');

INSERT INTO recipe_steps (recipe_id, step_number, description, tip) VALUES
(2, 1, 'Приготовьте крепкий кофе и остудите его', 'Можно добавить ложку ликера для аромата'),
(2, 2, 'Разделите яйца на белки и желтки', 'Яйца должны быть комнатной температуры'),
(2, 3, 'Взбейте желтки с половиной сахара до белого цвета', 'Масса должна увеличиться в объеме'),
(2, 4, 'Смешайте маскарпоне с желтковой массой', 'Маскарпоне должен быть комнатной температуры'),
(2, 5, 'Взбейте белки с оставшимся сахаром в крепкую пену', 'Белки должны держать пик'),
(2, 6, 'Аккуратно соедините белковую и желтковую массы', 'Вмешивайте белки частями, чтобы сохранить воздушность'),
(2, 7, 'Окуните печенье в кофе и выложите первый слой', 'Печенье должно быть пропитано, но не размокшим'),
(2, 8, 'Нанесите слой крема', 'Распределяйте равномерно'),
(2, 9, 'Повторите слои', 'Завершите слоем крема'),
(2, 10, 'Посыпьте какао и поставьте в холодильник', 'Оставьте минимум на 4 часа, лучше на ночь');

-- Create indexes for better performance
CREATE INDEX idx_masterclasses_date ON masterclasses(date);
CREATE INDEX idx_recipes_chef ON recipes(chef_id);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_chef_cuisines_chef ON chef_cuisines(chef_id);
CREATE INDEX idx_chef_cuisines_cuisine ON chef_cuisines(cuisine_id);
CREATE INDEX idx_user_registrations_status ON user_class_registrations(status);

-- Insert additional chefs
INSERT INTO chefs (name, specialization, experience, bio, education, achievements) VALUES
('Марко Росси', 'Итальянская кухня', 15, 
 'Известный шеф-повар с более чем 15-летним опытом в итальянской кухне. Обучался в лучших ресторанах Рима и Милана.',
 'Кулинарная академия в Риме, стажировка в ресторане "La Pergola"',
 'Победитель конкурса "Лучший шеф Италии 2020"'),
 
('Хироши Танака', 'Японская кухня', 20,
 'Мастер японской кухни с 20-летним стажем. Специализируется на суши и традиционных японских блюдах.',
 'Токийская школа кулинарного искусства',
 'Обладатель двух звезд Мишлен'),
 
('Пьер Дюбуа', 'Французская кухня', 18,
 'Виртуоз французской кухни, известный своими инновационными подходами к классическим рецептам.',
 'Le Cordon Bleu, Париж',
 'Шеф-повар года по версии Guide Michelin 2019');

-- Link additional chefs with cuisines
INSERT INTO chef_cuisines (chef_id, cuisine_id)
SELECT 2, id FROM cuisines WHERE name IN ('Японская', 'Азиатская');

INSERT INTO chef_cuisines (chef_id, cuisine_id)
SELECT 3, id FROM cuisines WHERE name IN ('Французская', 'Европейская');

-- Insert additional recipes
INSERT INTO recipes (chef_id, title, description, cuisine, type, difficulty, cooking_time)
SELECT 2,
    'Суши с лососем',
    'Классические японские суши с лососем',
    'Японская',
    'main',
    'intermediate',
    30
FROM cuisines c
WHERE c.name = 'Японская'
LIMIT 1;

INSERT INTO recipe_ingredients (recipe_id, name, amount, unit) VALUES
(3, 'Лосось', 200, 'g'),
(3, 'Рис', 200, 'g'),
(3, 'Унаги', 10, 'pcs'),
(3, 'Унаги-соус', 50, 'ml'),
(3, 'Соевый соус', 20, 'ml');

INSERT INTO recipe_steps (recipe_id, step_number, description, tip) VALUES
(3, 1, 'Приготовьте рис', 'Рис должен быть промыт и отварен'),
(3, 2, 'Нарежьте лосося на тонкие ломтики', 'Лосось должен быть свежим'),
(3, 3, 'Нанесите унаги-соус на ломтики лосося', 'Соус должен быть холодным'),
(3, 4, 'Сложите ломтики лосося на рис', 'Ломтики лосося должны быть равномерно распределены по рис'),
(3, 5, 'Нанесите соевый соус', 'Соевый соус должен быть холодным');

INSERT INTO recipes (chef_id, title, description, cuisine, type, difficulty, cooking_time)
SELECT 3,
    'Брускетта с томатами',
    'Классическая итальянская брускетта с томатами',
    'Европейская',
    'main',
    'beginner',
    15
FROM cuisines c
WHERE c.name = 'Европейская'
LIMIT 1;

INSERT INTO recipe_ingredients (recipe_id, name, amount, unit) VALUES
(4, 'Брускетта', 200, 'g'),
(4, 'Томаты', 100, 'g'),
(4, 'Чеснок', 2, 'pcs'),
(4, 'Оливковое масло', 50, 'ml'),
(4, 'Соль', 1, 'tsp'),
(4, 'Перец', 0.5, 'tsp');

INSERT INTO recipe_steps (recipe_id, step_number, description, tip) VALUES
(4, 1, 'Нарежьте брускетту на тонкие ломтики', 'Брускетта должна быть свежей'),
(4, 2, 'Нарежьте томаты на тонкие ломтики', 'Томаты должны быть свежими'),
(4, 3, 'Нарежьте чеснок на тонкие дольки', 'Чеснок должен быть свежим'),
(4, 4, 'Обжарьте брускетту и томаты в оливковом масле', 'Масло должно быть горячим'),
(4, 5, 'Нанесите соль и перец', 'Соль и перец должны быть холодными');

-- Create new indexes for additional recipes
CREATE INDEX idx_recipes_chef_additional ON recipes(chef_id);
CREATE INDEX idx_recipes_cuisine_additional ON recipes(cuisine);
CREATE INDEX idx_recipe_steps_recipe_additional ON recipe_steps(recipe_id);
CREATE INDEX idx_recipe_ingredients_recipe_additional ON recipe_ingredients(recipe_id);
CREATE INDEX idx_chef_cuisines_chef_additional ON chef_cuisines(chef_id);
CREATE INDEX idx_chef_cuisines_cuisine_additional ON chef_cuisines(cuisine_id); 