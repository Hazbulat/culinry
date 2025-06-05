-- MySQL dump
-- Создание базы данных
CREATE DATABASE IF NOT EXISTS volunteer_db;
USE volunteer_db;

-- Удаление существующих таблиц, если они есть
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS participations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS volunteers;
DROP TABLE IF EXISTS organizers;

-- Таблица организаторов
CREATE TABLE IF NOT EXISTS organizers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    organization VARCHAR(100),
    phone VARCHAR(20)
);

-- Таблица волонтеров
CREATE TABLE IF NOT EXISTS volunteers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    skills JSON
);

-- Таблица мероприятий
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    event_date DATETIME NOT NULL,
    address VARCHAR(200),
    max_participants INT NOT NULL,
    organizer_id INT,
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image_url VARCHAR(255),
    location VARCHAR(255),
    FOREIGN KEY (organizer_id) REFERENCES organizers(id),
    CHECK (max_participants > 0),
    CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled'))
);

-- Таблица участия в мероприятиях
CREATE TABLE IF NOT EXISTS participations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT,
    event_id INT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    UNIQUE KEY unique_participation (volunteer_id, event_id),
    CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show'))
);

-- Таблица отчетов
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT,
    volunteer_id INT,
    hours_worked DECIMAL(6,2) NOT NULL,
    description TEXT NOT NULL,
    rating INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    approved_by INT,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id),
    FOREIGN KEY (approved_by) REFERENCES volunteers(id),
    CHECK (hours_worked > 0),
    CHECK (rating >= 1 AND rating <= 5)
);

-- Добавление тестового организатора
INSERT INTO organizers (name, email, organization, phone)
VALUES ('Admin', 'admin@example.com', 'Volunteer Organization', '+1234567890');

-- Создание индексов для оптимизации запросов
ALTER TABLE events ADD INDEX idx_events_date (event_date);
ALTER TABLE events ADD INDEX idx_events_status (status);
ALTER TABLE participations ADD INDEX idx_participations_status (status);
ALTER TABLE volunteers ADD INDEX idx_volunteers_email (email); 