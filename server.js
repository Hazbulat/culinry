require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const chefsRouter = require('./api/chefs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'culinary_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Настройка почтового сервиса
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Расписание для уведомлений
cron.schedule('0 9 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  try {
    const [events] = await pool.query(`
    SELECT e.title, e.event_date, e.location, 
             GROUP_CONCAT(v.email) AS emails
    FROM events e
    JOIN participations p ON e.id = p.event_id
    JOIN volunteers v ON p.volunteer_id = v.id
      WHERE DATE(e.event_date) = DATE(?)
    AND p.status = 'registered'
    GROUP BY e.id
  `, [tomorrow]);

    events.forEach(event => {
      const emailList = event.emails.split(',');
    transporter.sendMail({
        to: emailList.join(', '),
      subject: `Напоминание: ${event.title}`,
      html: `
        <h2>${event.title}</h2>
        <p><strong>Когда:</strong> ${new Date(event.event_date).toLocaleString()}</p>
        <p><strong>Где:</strong> ${event.location}</p>
        <p>Не забудьте прийти!</p>
      `
    });
  });
  } catch (err) {
    console.error('Ошибка отправки уведомлений:', err);
  }
});

// Middleware аутентификации
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Чат-бот
app.post('/api/chatbot', (req, res) => {
  const { message } = req.body;
  const lowerMessage = message.toLowerCase();
  
  const responses = {
    "привет": "Привет! Чем могу помочь?",
    "регистрация": "Для регистрации заполните форму на главной странице, указав ваше имя, email и пароль.",
    "мероприятие": "Вы можете просмотреть доступные мероприятия на главной странице после регистрации.",
    "помощь": "Я могу помочь с вопросами о регистрации, мероприятиях и вашем профиле.",
    "как": "Чтобы начать, зарегистрируйтесь на сайте. После этого вы сможете просматривать мероприятия и записываться на них.",
    "default": "Извините, я не понял ваш вопрос. Попробуйте спросить о регистрации, мероприятиях или как начать участвовать."
  };
  
  for (const [keyword, response] of Object.entries(responses)) {
    if (lowerMessage.includes(keyword)) {
      return res.json({ response });
    }
  }
  
  res.json({ response: responses.default });
});

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password, confirmPassword, preferences } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Необходимо заполнить все обязательные поля' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Пароли не совпадают' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const preferencesJson = JSON.stringify(preferences || []);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, preferences)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone || null, hashedPassword, preferencesJson]
    );

    const [newUser] = await pool.query(
      'SELECT id, name, email, phone, preferences FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Отмена участия в мероприятии
app.delete('/api/participate/:eventId', authenticate, async (req, res) => {
  try {
    const [participation] = await pool.query(
      `SELECT * FROM participations 
       WHERE volunteer_id = ? AND event_id = ? AND status = 'registered'`,
      [req.user.id, req.params.eventId]
    );

    if (participation.length === 0) {
      return res.status(404).json({ error: 'Запись на мероприятие не найдена' });
    }

    await pool.query(
      `DELETE FROM participations 
       WHERE volunteer_id = ? AND event_id = ?`,
      [req.user.id, req.params.eventId]
    );

    res.json({ message: 'Участие отменено успешно' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание мероприятия
app.post('/api/events', authenticate, async (req, res) => {
  const { title, description, event_date, address, max_participants } = req.body;

  if (!title || !description || !event_date || !address || !max_participants) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO events (title, description, event_date, address, max_participants, organizer_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, event_date, address, max_participants, req.user.id]
    );

    const [newEvent] = await pool.query(
      'SELECT * FROM events WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newEvent[0]);
  } catch (err) {
    console.error('Ошибка базы данных:', err);
    res.status(500).json({ 
      error: 'Ошибка при создании мероприятия',
      details: err.message
    });
  }
});

// Получение доступных мероприятий
app.get('/api/available-events', authenticate, async (req, res) => {
  try {
    const [events] = await pool.query(`
      SELECT e.*, o.name AS organizer_name,
        (SELECT COUNT(*) FROM participations p 
         WHERE p.event_id = e.id AND p.status = 'registered') AS participants_count
      FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      WHERE e.id NOT IN (
        SELECT event_id FROM participations 
        WHERE volunteer_id = ? AND status = 'registered'
      )
      ORDER BY e.event_date
    `, [req.user.id]);
    
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Аутентификация
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0 || !await bcrypt.compare(password, users[0].password_hash)) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const token = jwt.sign(
      { id: users[0].id }, 
      process.env.JWT_SECRET || 'your-secret-key', 
      { expiresIn: '24h' }
    );
    
    // Преобразуем preferences в массив для ответа
    const userData = {
      id: users[0].id,
      name: users[0].name,
      email: users[0].email,
      preferences: JSON.parse(users[0].preferences || '[]')
    };
    
    res.json({ token, user: userData });
  } catch (err) {
    console.error('Ошибка аутентификации:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение всех мероприятий
app.get('/api/events', async (req, res) => {
  try {
    const [events] = await pool.query(`
      SELECT e.*, o.name AS organizer_name, 
             (SELECT COUNT(*) FROM participations p 
              WHERE p.event_id = e.id AND p.status = 'registered') AS participants_count
      FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      ORDER BY e.event_date
    `);
    
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Участие в мероприятии
app.post('/api/participate/:eventId', authenticate, async (req, res) => {
  try {
    const [[event]] = await pool.query(
      'SELECT max_participants FROM events WHERE id = ?', 
      [req.params.eventId]
    );

    if (!event) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) as count FROM participations 
       WHERE event_id = ? AND status = 'registered'`,
      [req.params.eventId]
    );

    if (count >= event.max_participants) {
      return res.status(400).json({ error: 'Мероприятие уже заполнено' });
    }

    await pool.query(
      `INSERT INTO participations (volunteer_id, event_id, status)
       VALUES (?, ?, 'registered')`,
      [req.user.id, req.params.eventId]
    );

    res.json({ message: 'Вы успешно записались на мероприятие' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение статистики
app.get('/api/statistics', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM volunteers) as total_volunteers,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM participations WHERE status = 'registered') as total_participations
    `);
    
    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение отчета по мероприятиям
app.get('/api/report', authenticate, async (req, res) => {
  try {
    const [report] = await pool.query(`
      SELECT e.title, e.event_date, e.address,
             COUNT(p.id) as participants_count
      FROM events e
      LEFT JOIN participations p ON e.id = p.event_id
      WHERE p.status = 'registered'
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `);
    
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение профиля пользователя
app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const [user] = await pool.query(
      'SELECT id, name, email, phone, preferences FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Преобразуем preferences из JSON строки в массив
    const userData = {
      ...user[0],
      preferences: JSON.parse(user[0].preferences || '[]')
    };

    res.json(userData);
  } catch (err) {
    console.error('Ошибка получения профиля:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление профиля
app.put('/api/profile', authenticate, async (req, res) => {
  const { name, phone, preferences } = req.body;
  try {
    // Преобразуем preferences в JSON строку перед сохранением
    const preferencesJson = JSON.stringify(preferences || []);

    await pool.query(
      `UPDATE users 
       SET name = ?, phone = ?, preferences = ?
       WHERE id = ?`,
      [name, phone, preferencesJson, req.user.id]
    );

    const [updatedUser] = await pool.query(
      'SELECT id, name, email, phone, preferences FROM users WHERE id = ?',
      [req.user.id]
    );

    // Преобразуем preferences обратно в массив для ответа
    const userData = {
      ...updatedUser[0],
      preferences: JSON.parse(updatedUser[0].preferences || '[]')
    };

    res.json(userData);
  } catch (err) {
    console.error('Ошибка обновления профиля:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание мастер-класса
app.post('/api/classes', authenticate, async (req, res) => {
  const { title, description, cuisine, type, difficulty, date, duration, maxParticipants, price } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO masterclasses 
       (title, description, chef_id, cuisine, type, difficulty, date, duration, max_participants, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, req.user.id, cuisine, type, difficulty, date, duration, maxParticipants, price]
    );

    const [newClass] = await pool.query(
      'SELECT * FROM masterclasses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newClass[0]);
  } catch (err) {
    console.error('Ошибка создания мастер-класса:', err);
    res.status(500).json({ error: 'Ошибка при создании мастер-класса' });
  }
});

// Получение списка мастер-классов
app.get('/api/classes', authenticate, async (req, res) => {
  try {
    const [classes] = await pool.query(`
      SELECT m.*, 
             u.name as chef_name,
             (SELECT COUNT(*) FROM user_class_registrations 
              WHERE class_id = m.id AND status = 'registered') as current_participants,
             EXISTS(SELECT 1 FROM user_class_registrations 
                    WHERE user_id = ? AND class_id = m.id) as is_registered
      FROM masterclasses m
      JOIN users u ON m.chef_id = u.id
      ORDER BY m.date
    `, [req.user.id]);

    res.json(classes.map(cls => ({
      ...cls,
      canRegister: !cls.is_registered && 
                   cls.current_participants < cls.max_participants &&
                   new Date(cls.date) > new Date()
    })));
  } catch (err) {
    console.error('Ошибка загрузки мастер-классов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение моих мастер-классов
app.get('/api/classes/my', authenticate, async (req, res) => {
  try {
    const [classes] = await pool.query(`
      SELECT m.*, 
             u.name as chef_name,
             ucr.status as registration_status,
             (SELECT COUNT(*) FROM user_class_registrations 
              WHERE class_id = m.id AND status = 'registered') as current_participants
      FROM masterclasses m
      JOIN users u ON m.chef_id = u.id
      JOIN user_class_registrations ucr ON m.id = ucr.class_id
      WHERE ucr.user_id = ? AND ucr.status = 'registered'
      ORDER BY m.date
    `, [req.user.id]);

    res.json(classes.map(cls => ({
      ...cls,
      canCancel: new Date(cls.date) > new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
    })));
  } catch (err) {
    console.error('Ошибка загрузки ваших мастер-классов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Поиск мастер-классов
app.get('/api/classes/search', authenticate, async (req, res) => {
  console.log('Получен запрос на фильтрацию мастер-классов:', req.query);
  const { cuisine, type, difficulty } = req.query;
  
  try {
    // Проверка допустимых значений
    const validCuisines = ['italian', 'japanese', 'french'];
    const validTypes = ['main', 'dessert', 'bakery'];
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];

    // Проверяем только непустые значения
    if (cuisine && !validCuisines.includes(cuisine)) {
      console.log('Недопустимое значение кухни:', cuisine);
      return res.status(400).json({ error: 'Недопустимое значение кухни' });
    }

    if (type && !validTypes.includes(type)) {
      console.log('Недопустимое значение типа:', type);
      return res.status(400).json({ error: 'Недопустимое значение типа' });
    }

    if (difficulty && !validDifficulties.includes(difficulty)) {
      console.log('Недопустимое значение сложности:', difficulty);
      return res.status(400).json({ error: 'Недопустимое значение сложности' });
    }

    let sql = `
      SELECT m.*, 
             u.name as chef_name,
             (SELECT COUNT(*) FROM user_class_registrations 
              WHERE class_id = m.id AND status = 'registered') as current_participants,
             EXISTS(SELECT 1 FROM user_class_registrations 
                    WHERE user_id = ? AND class_id = m.id AND status = 'registered') as is_registered
      FROM masterclasses m
      JOIN users u ON m.chef_id = u.id
      WHERE 1=1
    `;
    const params = [req.user.id];

    // Добавляем только непустые фильтры
    if (cuisine) {
      sql += ` AND m.cuisine = ?`;
      params.push(cuisine);
    }

    if (type) {
      sql += ` AND m.type = ?`;
      params.push(type);
    }

    if (difficulty) {
      sql += ` AND m.difficulty = ?`;
      params.push(difficulty);
    }

    sql += ` ORDER BY m.date`;

    console.log('SQL запрос:', sql);
    console.log('Параметры:', params);

    const [classes] = await pool.query(sql, params);
    console.log(`Найдено ${classes.length} мастер-классов`);

    const mappedClasses = classes.map(cls => ({
      ...cls,
      canRegister: !cls.is_registered && 
                   cls.current_participants < cls.max_participants &&
                   new Date(cls.date) > new Date()
    }));

    res.json(mappedClasses);
  } catch (err) {
    console.error('Ошибка фильтрации мастер-классов:', err);
    res.status(500).json({ error: 'Ошибка при фильтрации мастер-классов' });
  }
});

// Отмена регистрации на мастер-класс
app.delete('/api/classes/:classId/register', authenticate, async (req, res) => {
  try {
    // Проверяем существование регистрации
    const [registration] = await pool.query(
      `SELECT * FROM user_class_registrations 
       WHERE user_id = ? AND class_id = ? AND status = 'registered'`,
      [req.user.id, req.params.classId]
    );

    if (registration.length === 0) {
      return res.status(404).json({ error: 'Регистрация не найдена' });
    }

    // Проверяем, что до начала мастер-класса осталось более 24 часов
    const [masterclass] = await pool.query(
      'SELECT date FROM masterclasses WHERE id = ?',
      [req.params.classId]
    );

    if (masterclass.length === 0) {
      return res.status(404).json({ error: 'Мастер-класс не найден' });
    }

    const classDate = new Date(masterclass[0].date);
    const now = new Date();
    const hoursUntilClass = (classDate - now) / (1000 * 60 * 60);



    // Отменяем регистрацию
    await pool.query(
      `DELETE FROM user_class_registrations 
       WHERE user_id = ? AND class_id = ?`,
      [req.user.id, req.params.classId]
    );

    res.json({ message: 'Регистрация успешно отменена' });
  } catch (err) {
    console.error('Ошибка отмены регистрации:', err);
    res.status(500).json({ error: 'Ошибка при отмене регистрации' });
  }
});

// Регистрация на мастер-класс
app.post('/api/classes/:classId/register', authenticate, async (req, res) => {
  try {
    // Проверяем существование мастер-класса
    const [masterclass] = await pool.query(
      `SELECT m.*, 
              (SELECT COUNT(*) FROM user_class_registrations 
               WHERE class_id = m.id AND status = 'registered') as current_participants
       FROM masterclasses m 
       WHERE m.id = ?`,
      [req.params.classId]
    );

    if (masterclass.length === 0) {
      return res.status(404).json({ error: 'Мастер-класс не найден' });
    }

    // Проверяем, не зарегистрирован ли уже пользователь
    const [existingReg] = await pool.query(
      `SELECT * FROM user_class_registrations 
       WHERE user_id = ? AND class_id = ? AND status = 'registered'`,
      [req.user.id, req.params.classId]
    );

    if (existingReg.length > 0) {
      return res.status(400).json({ error: 'Вы уже зарегистрированы на этот мастер-класс' });
    }

    // Проверяем количество участников
    if (masterclass[0].current_participants >= masterclass[0].max_participants) {
      return res.status(400).json({ error: 'Мастер-класс уже заполнен' });
    }



    // Регистрируем пользователя
    await pool.query(
      `INSERT INTO user_class_registrations (user_id, class_id, status)
       VALUES (?, ?, 'registered')`,
      [req.user.id, req.params.classId]
    );

    res.json({ message: 'Вы успешно зарегистрированы на мастер-класс' });
  } catch (err) {
    console.error('Ошибка регистрации на мастер-класс:', err);
    res.status(500).json({ error: 'Ошибка при регистрации на мастер-класс' });
  }
});

// Создание рецепта
app.post('/api/recipes', authenticate, async (req, res) => {
  const { 
    chef_id,
    title, 
    description, 
    cuisine, 
    type, 
    difficulty, 
    cooking_time, 
    video_url, 
    ingredients, 
    steps 
  } = req.body;

  try {
    // Проверяем обязательные поля
    if (!title || !description || !cuisine || !type || !difficulty || !cooking_time || !chef_id) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    // Проверяем существование шеф-повара
    const [chefExists] = await pool.query(
      'SELECT id FROM chefs WHERE id = ?',
      [chef_id]
    );

    if (!chefExists.length) {
      return res.status(400).json({ error: 'Указанный шеф-повар не найден' });
    }

    // Создаем рецепт
    const [result] = await pool.query(
      `INSERT INTO recipes (chef_id, title, description, cuisine, type, difficulty, cooking_time, video_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [chef_id, title, description, cuisine, type, difficulty, cooking_time, video_url || null]
    );

    const recipeId = result.insertId;

    // Добавляем ингредиенты
    if (ingredients && ingredients.length > 0) {
      const ingredientValues = ingredients.map(ing => [recipeId, ing.name, ing.amount, ing.unit]);
      await pool.query(
        `INSERT INTO recipe_ingredients (recipe_id, name, amount, unit)
         VALUES ?`,
        [ingredientValues]
      );
    }

    // Добавляем шаги приготовления
    if (steps && steps.length > 0) {
      const stepValues = steps.map(step => [recipeId, step.step_number, step.description, step.tip || null]);
      await pool.query(
        `INSERT INTO recipe_steps (recipe_id, step_number, description, tip)
         VALUES ?`,
        [stepValues]
      );
    }

    // Получаем созданный рецепт со всеми данными
    const [recipe] = await pool.query(
      `SELECT r.*, c.name as chef_name, c.specialization as chef_specialization
       FROM recipes r
       JOIN chefs c ON r.chef_id = c.id
       WHERE r.id = ?`,
      [recipeId]
    );

    const [ingredients_result] = await pool.query(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = ?',
      [recipeId]
    );

    const [steps_result] = await pool.query(
      'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_number',
      [recipeId]
    );

    res.status(201).json({
      message: 'Рецепт успешно создан',
      recipe: {
        ...recipe[0],
        ingredients: ingredients_result,
        steps: steps_result
      }
    });
  } catch (err) {
    console.error('Ошибка при создании рецепта:', err);
    res.status(500).json({ error: 'Ошибка при создании рецепта' });
  }
});

// Получение списка рецептов
app.get('/api/recipes', authenticate, async (req, res) => {
  try {
    const [recipes] = await pool.query(`
      SELECT r.*, u.name as chef
      FROM recipes r
      JOIN users u ON r.chef_id = u.id
      ORDER BY r.created_at DESC
    `);

    res.json(recipes);
  } catch (err) {
    console.error('Ошибка при получении рецептов:', err);
    res.status(500).json({ error: 'Ошибка при получении рецептов' });
  }
});

// Получение деталей рецепта
app.get('/api/recipes/:id', authenticate, async (req, res) => {
  try {
    const recipeId = req.params.id;

    // Получаем основную информацию о рецепте
    const [[recipe]] = await pool.query(`
      SELECT r.*, c.name as chef_name, r.chef_id, c.specialization as chef_specialization,
             EXISTS(SELECT 1 FROM recipe_favorites WHERE user_id = ? AND recipe_id = r.id) as isFavorite,
             EXISTS(SELECT 1 FROM chef_subscribers WHERE chef_id = r.chef_id AND subscriber_id = ?) as isSubscribed
      FROM recipes r
      JOIN chefs c ON r.chef_id = c.id
      WHERE r.id = ?
    `, [req.user.id, req.user.id, recipeId]);

    if (!recipe) {
      return res.status(404).json({ error: 'Рецепт не найден' });
    }

    // Получаем статистику шеф-повара
    const [[chefStats]] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM recipes WHERE chef_id = ?) as recipes_count,
        (SELECT COUNT(*) FROM chef_subscribers WHERE chef_id = ?) as subscribers_count
    `, [recipe.chef_id, recipe.chef_id]);

    recipe.chef_stats = chefStats;

    // Получаем ингредиенты
    const [ingredients] = await pool.query(`
      SELECT name, amount, unit
      FROM recipe_ingredients
      WHERE recipe_id = ?
      ORDER BY id
    `, [recipeId]);

    // Получаем шаги приготовления
    const [steps] = await pool.query(`
      SELECT step_number, description, tip
      FROM recipe_steps
      WHERE recipe_id = ?
      ORDER BY step_number
    `, [recipeId]);

    // Объединяем все данные
    recipe.ingredients = ingredients;
    recipe.steps = steps;

    res.json(recipe);
  } catch (err) {
    console.error('Ошибка при загрузке деталей рецепта:', err);
    res.status(500).json({ error: 'Ошибка при загрузке деталей рецепта' });
  }
});

// Получение профиля шеф-повара
app.get('/api/chefs/:id', authenticate, async (req, res) => {
  try {
    const [[chef]] = await pool.query(`
      SELECT u.id, u.name,
             (SELECT COUNT(*) FROM recipes WHERE chef_id = u.id) as recipes_count,
             (SELECT COUNT(*) FROM chef_subscribers WHERE chef_id = u.id) as subscribers_count,
             EXISTS(SELECT 1 FROM chef_subscribers WHERE chef_id = u.id AND subscriber_id = ?) as is_subscribed
      FROM users u
      WHERE u.id = ?
    `, [req.user.id, req.params.id]);

    if (!chef) {
      return res.status(404).json({ error: 'Шеф-повар не найден' });
    }

    res.json(chef);
  } catch (err) {
    console.error('Ошибка при загрузке профиля шеф-повара:', err);
    res.status(500).json({ error: 'Ошибка при загрузке профиля шеф-повара' });
  }
});

// Подписка на шеф-повара
app.post('/api/chefs/:id/subscribe', authenticate, async (req, res) => {
  try {
    const chefId = req.params.id;
    
    // Проверяем существование шеф-повара
    const [chef] = await pool.query('SELECT id FROM chefs WHERE id = ?', [chefId]);
    if (chef.length === 0) {
      return res.status(404).json({ error: 'Шеф-повар не найден' });
    }

    // Проверяем, не подписан ли уже пользователь
    const [existing] = await pool.query(
      'SELECT * FROM chef_subscribers WHERE chef_id = ? AND subscriber_id = ?',
      [chefId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Вы уже подписаны на этого шеф-повара' });
    }

    // Добавляем подписку
    await pool.query(
      'INSERT INTO chef_subscribers (chef_id, subscriber_id) VALUES (?, ?)',
      [chefId, req.user.id]
    );

    // Получаем обновленную статистику
    const [[stats]] = await pool.query(`
      SELECT COUNT(*) as subscribers_count
      FROM chef_subscribers
      WHERE chef_id = ?
    `, [chefId]);

    res.json({ 
      message: 'Вы успешно подписались на шеф-повара',
      subscribers_count: stats.subscribers_count,
      isSubscribed: true
    });
  } catch (err) {
    console.error('Ошибка при подписке:', err);
    res.status(500).json({ error: 'Ошибка при оформлении подписки' });
  }
});

// Отписка от шеф-повара
app.delete('/api/chefs/:id/subscribe', authenticate, async (req, res) => {
  try {
    const chefId = req.params.id;

    // Удаляем подписку
    await pool.query(
      'DELETE FROM chef_subscribers WHERE chef_id = ? AND subscriber_id = ?',
      [chefId, req.user.id]
    );

    // Получаем обновленную статистику
    const [[stats]] = await pool.query(`
      SELECT COUNT(*) as subscribers_count
      FROM chef_subscribers
      WHERE chef_id = ?
    `, [chefId]);

    res.json({ 
      message: 'Вы успешно отписались от шеф-повара',
      subscribers_count: stats.subscribers_count,
      isSubscribed: false
    });
  } catch (err) {
    console.error('Ошибка при отписке:', err);
    res.status(500).json({ error: 'Ошибка при отписке' });
  }
});

// Получение списка подписок пользователя
app.get('/api/profile/subscriptions', authenticate, async (req, res) => {
  try {
    const [subscriptions] = await pool.query(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM recipes WHERE chef_id = c.id) as recipes_count,
             (SELECT COUNT(*) FROM chef_subscribers WHERE chef_id = c.id) as subscribers_count
      FROM chefs c
      JOIN chef_subscribers cs ON c.id = cs.chef_id
      WHERE cs.subscriber_id = ?
      ORDER BY c.name
    `, [req.user.id]);

    res.json(subscriptions);
  } catch (err) {
    console.error('Ошибка при загрузке подписок:', err);
    res.status(500).json({ error: 'Ошибка при загрузке подписок' });
  }
});

// Тестовый маршрут для проверки подключения к БД
app.get('/api/test-db', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1');
    res.json({ 
      status: 'success', 
      message: 'База данных подключена успешно',
      dbResponse: result 
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Ошибка подключения к базе данных',
      error: err.message 
    });
  }
});

// Тестовый маршрут для проверки таблиц
app.get('/api/test-tables', async (req, res) => {
  try {
    const [tables] = await pool.query(`
      SELECT table_name, table_rows 
      FROM information_schema.tables 
      WHERE table_schema = 'volunteer_db'
    `);
    
    const tablesInfo = {};
    for (const table of tables) {
      const [columns] = await pool.query(`
        SELECT column_name, column_type, is_nullable, column_key
        FROM information_schema.columns 
        WHERE table_schema = 'volunteer_db' 
        AND table_name = ?
      `, [table.table_name]);
      
      tablesInfo[table.table_name] = {
        rowCount: table.table_rows,
        columns: columns
      };
    }
    
    res.json({ 
      status: 'success', 
      message: 'Структура базы данных',
      tables: tablesInfo
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Ошибка при получении структуры базы данных',
      error: err.message 
    });
  }
});

// Добавление/удаление рецепта из избранного
app.post('/api/recipes/:id/favorite', authenticate, async (req, res) => {
  try {
    const recipeId = req.params.id;
    
    // Проверяем существование рецепта
    const [recipe] = await pool.query('SELECT id FROM recipes WHERE id = ?', [recipeId]);
    if (recipe.length === 0) {
      return res.status(404).json({ error: 'Рецепт не найден' });
    }

    // Проверяем, есть ли уже рецепт в избранном
    const [existing] = await pool.query(
      'SELECT * FROM recipe_favorites WHERE user_id = ? AND recipe_id = ?',
      [req.user.id, recipeId]
    );

    if (existing.length > 0) {
      // Если рецепт уже в избранном - удаляем его
      await pool.query(
        'DELETE FROM recipe_favorites WHERE user_id = ? AND recipe_id = ?',
        [req.user.id, recipeId]
      );
      res.json({ 
        message: 'Рецепт удален из избранного',
        isFavorite: false
      });
    } else {
      // Если рецепта нет в избранном - добавляем
      await pool.query(
        'INSERT INTO recipe_favorites (user_id, recipe_id) VALUES (?, ?)',
        [req.user.id, recipeId]
      );
      res.json({ 
        message: 'Рецепт добавлен в избранное',
        isFavorite: true
      });
    }
  } catch (err) {
    console.error('Ошибка при работе с избранным:', err);
    res.status(500).json({ error: 'Ошибка сервера при работе с избранным' });
  }
});

// Получение списка избранных рецептов
app.get('/api/recipes/favorites', authenticate, async (req, res) => {
  try {
    console.log('Запрос на получение избранных рецептов для пользователя:', req.user.id);

    const [favorites] = await pool.query(`
      SELECT r.*, u.name as chef_name,
             TRUE as isFavorite
      FROM recipes r
      JOIN recipe_favorites rf ON r.id = rf.recipe_id
      JOIN users u ON r.chef_id = u.id
      WHERE rf.user_id = ?
      ORDER BY rf.created_at DESC
    `, [req.user.id]);

    console.log('Найдено избранных рецептов:', favorites.length);

    res.json(favorites);
  } catch (err) {
    console.error('Ошибка при получении избранных рецептов:', err);
    res.status(500).json({ error: 'Ошибка при получении избранных рецептов' });
  }
});

// Удаление рецепта
app.delete('/api/recipes/:id', authenticate, async (req, res) => {
  try {
    const recipeId = req.params.id;

    // Проверяем существование рецепта и права пользователя
    const [recipe] = await pool.query(
      'SELECT chef_id FROM recipes WHERE id = ?',
      [recipeId]
    );

    if (recipe.length === 0) {
      return res.status(404).json({ error: 'Рецепт не найден' });
    }

    // Проверяем, является ли пользователь автором рецепта
    if (recipe[0].chef_id !== req.user.id) {
      return res.status(403).json({ error: 'У вас нет прав на удаление этого рецепта' });
    }

    // Удаляем рецепт (каскадное удаление связанных записей настроено в БД)
    await pool.query('DELETE FROM recipes WHERE id = ?', [recipeId]);

    res.json({ message: 'Рецепт успешно удален' });
  } catch (err) {
    console.error('Ошибка при удалении рецепта:', err);
    res.status(500).json({ error: 'Ошибка при удалении рецепта' });
  }
});

// Добавление мастер-класса в историю
app.post('/api/classes/:classId/complete', authenticate, async (req, res) => {
  try {
    console.log('Начало обработки запроса на добавление в историю');
    console.log('ID мастер-класса:', req.params.classId);
    console.log('ID пользователя:', req.user.id);

    // Проверяем существование мастер-класса
    const [masterclass] = await pool.query(
      'SELECT * FROM masterclasses WHERE id = ?',
      [req.params.classId]
    );

    console.log('Результат проверки мастер-класса:', masterclass);

    if (masterclass.length === 0) {
      console.log('Мастер-класс не найден');
      return res.status(404).json({ error: 'Мастер-класс не найден' });
    }

    // Проверяем, есть ли уже запись в истории
    const [existingHistory] = await pool.query(
      'SELECT * FROM class_history WHERE user_id = ? AND class_id = ?',
      [req.user.id, req.params.classId]
    );

    console.log('Проверка существующей записи:', existingHistory);

    if (existingHistory.length > 0) {
      console.log('Мастер-класс уже в истории');
      return res.status(400).json({ error: 'Мастер-класс уже в истории' });
    }

    console.log('Добавление записи в историю...');
    // Добавляем запись в историю
    await pool.query(
      `INSERT INTO class_history (user_id, class_id, viewed_at) 
       VALUES (?, ?, NOW())`,
      [req.user.id, req.params.classId]
    );
    console.log('Запись успешно добавлена в историю');

    // Удаляем регистрацию из активных записей
    console.log('Удаление из активных записей...');
    await pool.query(
      `DELETE FROM user_class_registrations 
       WHERE user_id = ? AND class_id = ?`,
      [req.user.id, req.params.classId]
    );
    console.log('Регистрация успешно удалена');

    res.json({ message: 'Мастер-класс успешно добавлен в историю' });
  } catch (err) {
    console.error('Подробная ошибка при добавлении в историю:', err);
    console.error('SQL State:', err.sqlState);
    console.error('SQL Message:', err.sqlMessage);
    res.status(500).json({ 
      error: 'Ошибка при добавлении мастер-класса в историю',
      details: err.message
    });
  }
});

// Получение истории посещений мастер-классов
app.get('/api/classes/history', authenticate, async (req, res) => {
  try {
    const [history] = await pool.query(`
      SELECT m.*, u.name as chef_name, ch.viewed_at
      FROM class_history ch
      JOIN masterclasses m ON ch.class_id = m.id
      JOIN users u ON m.chef_id = u.id
      WHERE ch.user_id = ?
      ORDER BY ch.viewed_at DESC
    `, [req.user.id]);

    res.json(history);
  } catch (err) {
    console.error('Ошибка при загрузке истории посещений:', err);
    res.status(500).json({ error: 'Ошибка при загрузке истории посещений' });
  }
});

// Routes
app.use('/api/chefs', chefsRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Что-то пошло не так!'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
