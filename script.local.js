let currentUser = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', () => {
  // Проверка авторизации при загрузке
  authToken = localStorage.getItem('token');
  if (authToken) verifyToken();

  // Инициализация чат-бота
  initChatbot();

  // Навигация по вкладкам
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
  });

  // Переключение между формами регистрации и входа
  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
  });

  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'block';
  });

  // Форма входа
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Форма регистрации
  document.getElementById('register-form').addEventListener('submit', handleRegister);

  // Управление мастер-классами
  document.getElementById('add-class-btn')?.addEventListener('click', showClassForm);
  document.getElementById('cancel-class-btn')?.addEventListener('click', hideClassForm);
  document.getElementById('class-form')?.addEventListener('submit', handleClassSubmit);

  // Управление рецептами
  const addRecipeBtn = document.getElementById('add-recipe-btn');
  if (addRecipeBtn) {
    addRecipeBtn.addEventListener('click', () => {
      showRecipeForm();
    });
  }
  document.getElementById('refresh-recipes')?.addEventListener('click', loadRecipes);

  // Обновление данных
  document.getElementById('refresh-classes')?.addEventListener('click', loadClasses);
  document.getElementById('refresh-my-classes')?.addEventListener('click', loadMyClasses);
  document.getElementById('edit-profile-btn')?.addEventListener('click', editProfile);

  // Поиск и фильтрация
  const searchInput = document.getElementById('class-search');
  const cuisineFilter = document.getElementById('cuisine-filter');
  const typeFilter = document.getElementById('type-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');

  // Добавляем обработчики с выводом в консоль
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      console.log('Поиск:', searchInput.value);
      applyFilters();
    }, 300));
  }

  // Добавляем обработчики изменения для фильтров
  [cuisineFilter, typeFilter, difficultyFilter].forEach(filter => {
    if (filter) {
      filter.addEventListener('change', () => {
        console.log(`Фильтр ${filter.id}:`, filter.value);
        applyFilters();
      });
    }
  });

  // Обработчик кнопки фильтров
  const applyFiltersBtn = document.getElementById('apply-filters');
  console.log('Инициализация кнопки фильтров:', applyFiltersBtn);
  
  if (applyFiltersBtn) {
    applyFiltersBtn.onclick = (e) => {
      e.preventDefault();
      console.log('Клик по кнопке фильтрации');
      
      const cuisineFilter = document.getElementById('cuisine-filter');
      const typeFilter = document.getElementById('type-filter');
      const difficultyFilter = document.getElementById('difficulty-filter');
      
      console.log('Элементы фильтров:', { cuisineFilter, typeFilter, difficultyFilter });
      
      if (!cuisineFilter || !typeFilter || !difficultyFilter) {
        console.error('Не найдены элементы фильтров');
        return;
      }

      const filters = {
        cuisine: cuisineFilter.value,
        type: typeFilter.value,
        difficulty: difficultyFilter.value
      };
      
      console.log('Применяемые фильтры:', filters);
      filterClasses(filters.cuisine, filters.type, filters.difficulty);
    };
    console.log('Обработчик клика установлен');
  } else {
    console.error('Кнопка фильтров не найдена в DOM');
  }

  // Загрузка начального списка мастер-классов
  loadClasses();

  // Обработчики для формы рецепта
  const recipeForm = document.getElementById('add-recipe-form');
  const cancelRecipeBtn = document.getElementById('cancel-recipe-btn');

  if (cancelRecipeBtn) {
    cancelRecipeBtn.addEventListener('click', () => {
      recipeForm.style.display = 'none';
      document.getElementById('recipe-form').reset();
    });
  }

  // Добавление ингредиента
  const addIngredientBtn = document.getElementById('add-ingredient');
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', () => {
      const ingredientsList = document.getElementById('ingredients-list');
      const newIngredient = document.createElement('div');
      newIngredient.className = 'ingredient-item';
      newIngredient.innerHTML = `
        <input type="text" placeholder="Название" required>
        <input type="number" placeholder="Количество" min="0" step="0.1" required>
        <select required>
          <option value="g">г</option>
          <option value="kg">кг</option>
          <option value="ml">мл</option>
          <option value="l">л</option>
          <option value="pcs">шт</option>
          <option value="tsp">ч.л.</option>
          <option value="tbsp">ст.л.</option>
        </select>
        <button type="button" class="btn-icon remove-ingredient"><i class="fas fa-minus"></i></button>
      `;
      ingredientsList.appendChild(newIngredient);

      // Обработчик удаления ингредиента
      newIngredient.querySelector('.remove-ingredient').addEventListener('click', () => {
        newIngredient.remove();
      });
    });
  }

  // Добавление шага приготовления
  const addStepBtn = document.getElementById('add-step');
  if (addStepBtn) {
    addStepBtn.addEventListener('click', () => {
      const stepsList = document.getElementById('steps-list');
      const newStep = document.createElement('div');
      newStep.className = 'step-item';
      newStep.innerHTML = `
        <textarea placeholder="Описание шага" required></textarea>
        <input type="text" placeholder="Совет шеф-повара (необязательно)">
        <button type="button" class="btn-icon remove-step"><i class="fas fa-minus"></i></button>
      `;
      stepsList.appendChild(newStep);

      // Обработчик удаления шага
      newStep.querySelector('.remove-step').addEventListener('click', () => {
        newStep.remove();
      });
    });
  }

  // Обработка отправки формы рецепта
  const recipeFormElement = document.getElementById('recipe-form');
  if (recipeFormElement) {
    recipeFormElement.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

      try {
        // Собираем ингредиенты
        const ingredients = Array.from(document.querySelectorAll('.ingredient-item')).map(item => ({
          name: item.querySelector('input[type="text"]').value,
          amount: parseFloat(item.querySelector('input[type="number"]').value),
          unit: item.querySelector('select').value
        }));

        // Собираем шаги
        const steps = Array.from(document.querySelectorAll('.step-item')).map(item => ({
          description: item.querySelector('textarea').value,
          tip: item.querySelector('input[type="text"]').value || null
        }));

        // Формируем данные рецепта
        const recipeData = {
          title: document.getElementById('recipe-title').value,
          description: document.getElementById('recipe-description').value,
          cuisine: document.getElementById('recipe-cuisine').value,
          type: document.getElementById('recipe-type').value,
          difficulty: document.getElementById('recipe-difficulty').value,
          cooking_time: parseInt(document.getElementById('recipe-time').value),
          video: document.getElementById('recipe-video').value || null,
          ingredients,
          steps
        };

        // Добавляем подробное логирование
        console.log('Отправляемые данные:', {
          title: recipeData.title,
          description: recipeData.description,
          cuisine: recipeData.cuisine,
          type: recipeData.type,
          difficulty: recipeData.difficulty,
          cooking_time: recipeData.cooking_time,
          video: recipeData.video,
          ingredients_count: recipeData.ingredients.length,
          steps_count: recipeData.steps.length
        });

        // Проверяем обязательные поля перед отправкой
        if (!recipeData.title || !recipeData.description || !recipeData.cuisine || 
            !recipeData.type || !recipeData.difficulty || !recipeData.cooking_time) {
          throw new Error('Пожалуйста, заполните все обязательные поля');
        }

        if (recipeData.ingredients.length === 0) {
          throw new Error('Добавьте хотя бы один ингредиент');
        }

        if (recipeData.steps.length === 0) {
          throw new Error('Добавьте хотя бы один шаг приготовления');
        }

        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(recipeData)
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || 'Ошибка при сохранении рецепта');
        }

        showNotification('Рецепт успешно сохранен', 'success');
        hideRecipeForm();
        loadRecipes(); // Перезагружаем список рецептов
      } catch (err) {
        console.error('Ошибка при сохранении рецепта:', err);
        showNotification(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить рецепт';
      }
    });
  }
});

function updateUI() {
  if (currentUser) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    document.getElementById('auth-status').innerHTML = `
      <span>${currentUser.name}</span>
      <button id="logout-btn" class="btn-small">Выйти</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Загружаем данные
    loadClasses();
    loadMyClasses();
    loadRecipes();
    loadProfile();
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('auth-status').innerHTML = '';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Неверный email или пароль');
    }

    const data = await response.json();
    currentUser = data.user;
    authToken = data.token;
    localStorage.setItem('token', authToken);

    updateUI();
    showNotification('Вы успешно вошли в систему', 'success');
  } catch (err) {
    console.error('Ошибка входа:', err);
    if (err.message === 'Failed to fetch') {
      showNotification('Не удалось подключиться к серверу. Пожалуйста, проверьте подключение к интернету', 'error');
    } else {
    showNotification(err.message, 'error');
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();
  console.log('Начало регистрации...');
  
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
  
  try {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;
    const preferences = document.getElementById('reg-preferences').value;
    const agreement = document.getElementById('reg-agreement').checked;

    if (!agreement) {
      throw new Error('Необходимо согласиться с правилами');
    }

    if (!name || !email || !password) {
      throw new Error('Пожалуйста, заполните все обязательные поля');
    }

    if (password !== confirmPassword) {
      throw new Error('Пароли не совпадают');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Введите корректный email адрес');
    }

    if (password.length < 6) {
      throw new Error('Пароль должен содержать минимум 6 символов');
    }

    const formData = {
      name,
      email,
      phone,
      password,
      confirmPassword,
      preferences: preferences.split(',').map(p => p.trim()).filter(p => p)
    };

    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Ошибка регистрации');
    }

    showNotification('Регистрация успешна! Теперь вы можете войти.', 'success');
    document.getElementById('register-form').reset();
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
    document.getElementById('email').value = email;
  } catch (err) {
    console.error('Ошибка при регистрации:', err);
    showNotification(err.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
  }
}

async function verifyToken() {
  try {
    const response = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.ok) {
      currentUser = await response.json();
      updateUI();
    } else {
      localStorage.removeItem('token');
      authToken = null;
      currentUser = null;
      updateUI();
    }
  } catch (err) {
    console.error('Ошибка проверки токена:', err);
    localStorage.removeItem('token');
    authToken = null;
    currentUser = null;
    updateUI();
  }
}

function logout() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('token');
  updateUI();
  showNotification('Вы вышли из системы', 'info');
}

// Вспомогательные функции
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';

  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

// Функции управления мастер-классами
function showClassForm() {
  console.log('Показываем форму добавления мастер-класса');
  const formContainer = document.getElementById('add-class-form');
  if (formContainer) {
    formContainer.style.display = 'block';
  } else {
    console.error('Форма добавления мастер-класса не найдена');
  }
}

function hideClassForm() {
  console.log('Скрываем форму добавления мастер-класса');
  const formContainer = document.getElementById('add-class-form');
  if (formContainer) {
    formContainer.style.display = 'none';
    document.getElementById('class-form').reset();
  }
}

async function handleClassSubmit(e) {
  e.preventDefault();
  console.log('Отправка формы мастер-класса');

  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

  try {
    const formData = {
      title: document.getElementById('class-title').value.trim(),
      description: document.getElementById('class-description').value.trim(),
      date: document.getElementById('class-date').value,
      duration: parseInt(document.getElementById('class-duration').value),
      cuisine: document.getElementById('class-cuisine').value,
      type: document.getElementById('class-type').value,
      difficulty: document.getElementById('class-difficulty').value,
      maxParticipants: parseInt(document.getElementById('class-max-participants').value),
      price: parseFloat(document.getElementById('class-price').value)
    };

    // Валидация
    if (!formData.title || !formData.description || !formData.date) {
      throw new Error('Пожалуйста, заполните все обязательные поля');
    }

    if (formData.duration < 30) {
      throw new Error('Длительность мастер-класса должна быть не менее 30 минут');
    }

    if (formData.maxParticipants < 1) {
      throw new Error('Количество участников должно быть больше 0');
    }

    if (formData.price < 0) {
      throw new Error('Стоимость не может быть отрицательной');
    }

    const response = await fetch('http://localhost:3000/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка создания мастер-класса');
    }

    const result = await response.json();
    console.log('Мастер-класс успешно создан:', result);

    showNotification('Мастер-класс успешно создан', 'success');
    hideClassForm();
    loadClasses();
  } catch (err) {
    console.error('Ошибка при создании мастер-класса:', err);
    showNotification(err.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-save"></i> Сохранить';
  }
}

async function loadClasses() {
  console.log('Загрузка списка мастер-классов');
  const classesContainer = document.getElementById('classes-list');
  
  if (!classesContainer) {
    console.error('Контейнер для списка мастер-классов не найден');
    return;
  }

  try {
    // Показываем индикатор загрузки
    classesContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка мастер-классов...</div>';

    // Формируем URL и параметры запроса
    let url = 'http://localhost:3000/api/classes';
    const headers = { 'Authorization': `Bearer ${authToken}` };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Не удалось загрузить мастер-классы');
    }

    const classes = await response.json();
    console.log(`Получено мастер-классов: ${classes.length}`);

    if (classes.length === 0) {
      classesContainer.innerHTML = '<div class="no-classes-message">Нет доступных мастер-классов</div>';
      return;
    }

    // Функция для отображения даты и времени в нужном формате
    const formatDateTime = (dateStr) => {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString('ru-RU'),
        time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };
    };

    // Функция для перевода сложности на русский
    const translateDifficulty = (difficulty) => {
      const translations = {
        'beginner': 'Для начинающих',
        'intermediate': 'Средняя',
        'advanced': 'Продвинутая'
      };
      return translations[difficulty] || difficulty;
    };

    // Функция для перевода кухни на русский
    const translateCuisine = (cuisine) => {
      const translations = {
        'italian': 'Итальянская',
        'japanese': 'Японская',
        'french': 'Французская'
      };
      return translations[cuisine] || cuisine;
    };

    classesContainer.innerHTML = classes.map(cls => {
      const datetime = formatDateTime(cls.date);
      const classDate = new Date(cls.date);
      const now = new Date();
      const isPastClass = classDate < now;

      // Определяем, можно ли записаться на мастер-класс
      const canRegister = !cls.is_registered && cls.current_participants < cls.max_participants;

      return `
        <div class="class-card ${isPastClass ? 'past-class' : ''}" data-class-id="${cls.id}">
          <div class="class-header">
            <h3 class="class-title">${cls.title}</h3>
            <div class="class-meta">
              <span><i class="fas fa-globe"></i> ${translateCuisine(cls.cuisine)}</span>
              <span><i class="fas fa-signal"></i> ${translateDifficulty(cls.difficulty)}</span>
              ${isPastClass ? '<span class="status-completed"><i class="fas fa-history"></i> Прошедший</span>' : ''}
            </div>
          </div>
          <div class="class-body">
            <p class="class-description">${cls.description}</p>
            <div class="class-details">
              <div><i class="fas fa-calendar"></i> ${datetime.date}</div>
              <div><i class="fas fa-clock"></i> ${datetime.time} (${cls.duration} мин)</div>
              <div><i class="fas fa-users"></i> ${cls.current_participants}/${cls.max_participants} участников</div>
              <div><i class="fas fa-tag"></i> ${cls.price} ₽</div>
            </div>
          </div>
          <div class="class-footer">
            ${cls.is_registered ? 
              `<button onclick="cancelRegistration(${cls.id})" class="btn btn-danger btn-small">
                <i class="fas fa-times"></i> Отменить запись
               </button>` :
              canRegister ? 
                `<button onclick="registerForClass(${cls.id})" class="btn btn-primary btn-small">
                  <i class="fas fa-user-plus"></i> Записаться
                 </button>` : 
                `<button disabled class="btn btn-disabled btn-small">
                  <i class="fas fa-ban"></i> Нет свободных мест
                 </button>`
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Ошибка при загрузке мастер-классов:', err);
    classesContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        Ошибка при загрузке мастер-классов: ${err.message}
      </div>
    `;
    showNotification(err.message, 'error');
  }
}

// Функция для фильтрации мастер-классов
async function filterClasses(cuisine, type, difficulty) {
  console.log('Начало фильтрации с параметрами:', { cuisine, type, difficulty });
  const classesContainer = document.getElementById('classes-list');
  
  if (!classesContainer) {
    console.error('Контейнер для списка мастер-классов не найден');
    return;
  }

  try {
    // Показываем индикатор загрузки
    classesContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Фильтрация мастер-классов...</div>';

    // Формируем URL с параметрами
    const params = new URLSearchParams();
    if (cuisine) params.append('cuisine', cuisine);
    if (type) params.append('type', type);
    if (difficulty) params.append('difficulty', difficulty);

    const url = `http://localhost:3000/api/classes/search?${params.toString()}`;
    console.log('URL запроса:', url);

    if (!authToken) {
      console.error('Отсутствует токен авторизации');
      showNotification('Необходима авторизация', 'error');
      return;
    }

    console.log('Отправка запроса с токеном:', authToken);
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Получен ответ:', response.status);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Не удалось отфильтровать мастер-классы');
    }

    const classes = await response.json();
    console.log('Получены данные:', classes);

    if (classes.length === 0) {
      classesContainer.innerHTML = '<div class="no-classes-message">Нет мастер-классов, соответствующих выбранным фильтрам</div>';
      return;
    }

    // Функция для перевода сложности на русский
    const translateDifficulty = (difficulty) => {
      const translations = {
        'beginner': 'Для начинающих',
        'intermediate': 'Средняя',
        'advanced': 'Продвинутая'
      };
      return translations[difficulty] || difficulty;
    };

    // Функция для перевода кухни на русский
    const translateCuisine = (cuisine) => {
      const translations = {
        'italian': 'Итальянская',
        'japanese': 'Японская',
        'french': 'Французская'
      };
      return translations[cuisine] || cuisine;
    };

    classesContainer.innerHTML = classes.map(cls => {
      const date = new Date(cls.date);
      return `
        <div class="class-card">
          <div class="class-header">
            <h3 class="class-title">${cls.title}</h3>
            <div class="class-meta">
              <span><i class="fas fa-globe"></i> ${translateCuisine(cls.cuisine)}</span>
              <span><i class="fas fa-signal"></i> ${translateDifficulty(cls.difficulty)}</span>
            </div>
          </div>
          <div class="class-body">
            <p class="class-description">${cls.description}</p>
            <div class="class-details">
              <div><i class="fas fa-calendar"></i> ${date.toLocaleDateString('ru-RU')}</div>
              <div><i class="fas fa-clock"></i> ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} (${cls.duration} мин)</div>
              <div><i class="fas fa-users"></i> ${cls.current_participants}/${cls.max_participants} участников</div>
              <div><i class="fas fa-tag"></i> ${cls.price} ₽</div>
            </div>
          </div>
          <div class="class-footer">
            ${cls.is_registered ? 
              `<button onclick="cancelRegistration(${cls.id})" class="btn btn-danger btn-small">
                <i class="fas fa-times"></i> Отменить запись
               </button>` :
              cls.canRegister ? 
                `<button onclick="registerForClass(${cls.id})" class="btn btn-primary btn-small">
                  <i class="fas fa-user-plus"></i> Записаться
                 </button>` : 
                `<button disabled class="btn btn-disabled btn-small">
                  <i class="fas fa-ban"></i> Запись закрыта
                 </button>`
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Ошибка при фильтрации мастер-классов:', err);
    classesContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        Ошибка при фильтрации мастер-классов: ${err.message}
      </div>
    `;
    showNotification(err.message, 'error');
  }
}

async function registerForClass(classId) {
  try {
    // Получаем информацию о классе из текущего DOM
    const classCard = document.querySelector(`.class-card[data-class-id="${classId}"]`);
    const isPastClass = classCard && classCard.classList.contains('past-class');

    const response = await fetch(`http://localhost:3000/api/classes/${classId}/register`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        registration_type: isPastClass ? 'recording' : 'live', // Указываем тип регистрации
        type: 'view' // Добавляем тип действия
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Не удалось зарегистрироваться на мастер-класс');
    }

    showNotification('Вы успешно записались на мастер-класс. Запись будет доступна во вкладке "Мои записи"', 'success');
    loadClasses();
    loadMyClasses();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function loadMyClasses() {
  try {
    const response = await fetch('http://localhost:3000/api/classes/my', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить ваши мастер-классы');
    }

    const classes = await response.json();
    const container = document.getElementById('my-classes-list');
    
    if (!container) return;

    if (classes.length === 0) {
      container.innerHTML = '<div class="no-classes-message">Вы еще не записаны ни на один мастер-класс</div>';
      return;
    }

    container.innerHTML = classes.map(cls => {
      const classDate = new Date(cls.date);
      const now = new Date();
      const isPastClass = classDate < now;

      return `
        <div class="class-card" data-class-id="${cls.id}">
          <div class="class-header">
            <h3 class="class-title">${cls.title}</h3>
            <div class="class-meta">
              <span><i class="fas fa-globe"></i> ${cls.cuisine}</span>
              <span><i class="fas fa-signal"></i> ${cls.difficulty}</span>
              ${isPastClass ? '<span class="status-completed"><i class="fas fa-check-circle"></i> Прошедший</span>' : ''}
            </div>
          </div>
          <div class="class-body">
            <div class="class-details">
              <div><i class="fas fa-calendar"></i> ${classDate.toLocaleDateString()}</div>
              <div><i class="fas fa-clock"></i> ${classDate.toLocaleTimeString()}</div>
              <div><i class="fas fa-chalkboard-teacher"></i> ${cls.chef_name}</div>
            </div>
          </div>
          <div class="class-footer">
            ${isPastClass ? 
              `<button onclick="watchClass(${cls.id})" class="btn btn-primary btn-small">
                <i class="fas fa-play-circle"></i> Смотреть запись
               </button>
               <button onclick="cancelRegistration(${cls.id})" class="btn btn-danger btn-small">
                <i class="fas fa-times"></i> Отменить запись
               </button>
              ` :
              `<button onclick="cancelRegistration(${cls.id})" class="btn btn-danger btn-small">
                <i class="fas fa-times"></i> Отменить запись
               </button>`
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Ошибка при загрузке ваших мастер-классов:', err);
    showNotification(err.message, 'error');
  }
}

// Добавляем новую функцию для просмотра записи мастер-класса
async function watchClass(classId) {
  try {
    // Добавляем в историю
    const response = await fetch(`http://localhost:3000/api/classes/${classId}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    // Удаляем карточку из списка "Мои записи" в любом случае
    const classCard = document.querySelector(`#my-classes-list .class-card[data-class-id="${classId}"]`);
    if (classCard) {
      classCard.remove();
      
      // Проверяем, остались ли еще записи
      const container = document.getElementById('my-classes-list');
      if (container && !container.querySelector('.class-card')) {
        container.innerHTML = '<div class="no-classes-message">Вы еще не записаны ни на один мастер-класс</div>';
      }
    }

    if (!response.ok) {
      const data = await response.json();
      if (data.error === 'Мастер-класс уже в истории') {
        // Если мастер-класс уже в истории, просто переключаемся на вкладку профиля
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        const profileTab = document.querySelector('[data-tab="profile"]');
        if (profileTab) {
          profileTab.classList.add('active');
          document.getElementById('profile-tab').classList.add('active');
          loadClassHistory(); // Обновляем историю
        }
        return;
      }
      throw new Error(data.error || 'Не удалось добавить мастер-класс в историю');
    }

    // Переключаемся на вкладку профиля
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) {
      profileTab.classList.add('active');
      document.getElementById('profile-tab').classList.add('active');
      loadClassHistory(); // Обновляем историю
      loadClasses(); // Обновляем список мастер-классов
    }
  } catch (error) {
    console.error('Ошибка:', error);
    showNotification(error.message, 'error');
  }
}

async function cancelRegistration(classId) {
  try {
    const response = await fetch(`http://localhost:3000/api/classes/${classId}/register`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Не удалось отменить запись');
    }

    showNotification('Запись на мастер-класс отменена', 'success');
    
    // Удаляем карточку мастер-класса из списка "Мои записи"
    const card = document.querySelector(`#my-classes-list .class-card[data-class-id="${classId}"]`);
    if (card) {
      card.remove();
      
      // Проверяем, остались ли еще записи
      const container = document.getElementById('my-classes-list');
      if (container && !container.querySelector('.class-card')) {
        container.innerHTML = '<div class="no-classes-message">Вы еще не записаны ни на один мастер-класс</div>';
      }
    }
    
    // Обновляем основной список мастер-классов
    loadClasses();
  } catch (err) {
    console.error('Ошибка при отмене регистрации:', err);
    showNotification(err.message, 'error');
  }
}

// Функции управления рецептами
async function loadRecipes() {
  const recipesContainer = document.getElementById('recipes-list');
  if (!recipesContainer) return;

  try {
    recipesContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка рецептов...</div>';

    const response = await fetch('http://localhost:3000/api/recipes', {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить рецепты');
    }

    const recipes = await response.json();
    console.log('Загруженные рецепты:', recipes);

    if (recipes.length === 0) {
      recipesContainer.innerHTML = '<div class="no-recipes-message">Нет доступных рецептов</div>';
      return;
    }

    recipesContainer.innerHTML = recipes.map(recipe => `
      <div class="recipe-card" data-recipe-id="${recipe.id}">
        ${recipe.video_url ? `
          <div class="video-preview" onclick="showVideo('${recipe.video_url}')">
            <img src="https://img.youtube.com/vi/${getYouTubeId(recipe.video_url)}/maxresdefault.jpg" alt="${recipe.title}">
            <div class="play-button"><i class="fas fa-play"></i></div>
          </div>
        ` : ''}
        <div class="recipe-header">
          <h3 class="recipe-title">${recipe.title}</h3>
          <div class="recipe-meta">
            <span><i class="fas fa-globe"></i> ${translateCuisine(recipe.cuisine)}</span>
            <span><i class="fas fa-clock"></i> ${recipe.cooking_time} мин</span>
          </div>
        </div>
        <div class="recipe-body">
          <p class="recipe-description">${recipe.description}</p>
          <div class="recipe-details">
            <div><i class="fas fa-signal"></i> Сложность: ${translateDifficulty(recipe.difficulty)}</div>
            <div><i class="fas fa-utensils"></i> Тип: ${translateType(recipe.type)}</div>
          </div>
        </div>
        <div class="recipe-footer">
          <button onclick="showRecipeDetails(${recipe.id})" class="btn btn-primary btn-small">
            <i class="fas fa-book-open"></i> Подробнее

        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Ошибка при загрузке рецептов:', err);
    recipesContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        Ошибка при загрузке рецептов: ${err.message}
      </div>
    `;
    showNotification(err.message, 'error');
  }
}

async function showRecipeDetails(recipeId) {
  try {
    console.log('Загрузка деталей рецепта:', recipeId);
    const response = await fetch(`http://localhost:3000/api/recipes/${recipeId}`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Статус ответа:', response.status);

    if (!response.ok) {
      throw new Error('Не удалось загрузить детали рецепта');
    }

    const recipe = await response.json();
    console.log('Полученные данные рецепта:', recipe);
    
    // Создаем модальное окно с деталями рецепта
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content recipe-details-modal">
        <div class="modal-header">
          <h2>${recipe.title}</h2>
          <button class="modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="recipe-full-details">
            ${recipe.video_url ? `
              <div class="recipe-video-container">
                <iframe 
                  src="https://www.youtube.com/embed/${getYouTubeId(recipe.video_url)}?rel=0"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen>
                </iframe>
              </div>
            ` : ''}
            <div class="recipe-info">
              <div class="recipe-meta">
                <span><i class="fas fa-globe"></i> ${translateCuisine(recipe.cuisine)}</span>
                <span><i class="fas fa-utensils"></i> ${translateType(recipe.type)}</span>
                <span><i class="fas fa-chart-line"></i> ${translateDifficulty(recipe.difficulty)}</span>
                <span><i class="fas fa-clock"></i> ${recipe.cooking_time} минут</span>
              </div>
              ${recipe.chef_name ? `
                <div class="chef-info">
                  <div class="chef-details">
                    <div class="chef-avatar">${recipe.chef_name.charAt(0).toUpperCase()}</div>
                    <span class="chef-name">${recipe.chef_name}</span>
                  </div>
                  <button onclick="toggleChefSubscription(${recipe.chef_id})" class="btn btn-primary btn-small subscribe-btn" data-chef-id="${recipe.chef_id}">
                    ${recipe.is_subscribed ? 
                      '<i class="fas fa-user-minus"></i> Отписаться' : 
                      '<i class="fas fa-user-plus"></i> Подписаться'}
                  </button>
                </div>
              ` : ''}
              <p class="recipe-description">${recipe.description}</p>
            </div>
            <div class="recipe-ingredients">
              <h3>Список покупок</h3>
              <ul>
                ${recipe.ingredients.map(ing => `
                  <li>
                    <span class="ingredient-amount">${ing.amount} ${ing.unit}</span>
                    <span class="ingredient-name">${ing.name}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            <div class="recipe-steps">
              <h3>Приготовление</h3>
              <ol>
                ${recipe.steps.map((step, index) => `
                  <li>
                    <p>${step.description}</p>
                    ${step.tip ? `<div class="chef-tip"><i class="fas fa-lightbulb"></i> ${step.tip}</div>` : ''}
                  </li>
                `).join('')}
              </ol>
            </div>
          </div>
        </div>
        <div class="modal-footer">
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Обработчик закрытия модального окна
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => {
      modal.remove();
    };

    // Закрытие по клику вне модального окна
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
  } catch (err) {
    console.error('Ошибка при загрузке деталей рецепта:', err);
    showNotification('Не удалось загрузить детали рецепта: ' + err.message, 'error');
  }
}

async function generateShoppingList(recipeId) {
  try {
    const response = await fetch(`http://localhost:3000/api/recipes/${recipeId}/shopping-list`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось создать список покупок');
    }

    const list = await response.json();
    
    // Создаем модальное окно со списком покупок
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2><i class="fas fa-shopping-cart"></i> Список покупок</h2>
          <button class="modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="shopping-list">
            ${Object.entries(list.categories).map(([category, items]) => `
              <div class="shopping-category">
                <h3>${category}</h3>
                <ul>
                  ${items.map(item => `
                    <li>
                      <label class="checkbox-container">
                        <input type="checkbox">
                        <span class="checkmark"></span>
                        ${item.amount} ${item.unit} ${item.name}
                      </label>
                    </li>
                  `).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          <div class="shopping-list-actions">
            <button class="btn btn-primary" onclick="window.print()">
              <i class="fas fa-print"></i> Распечатать
            </button>
            <button class="btn btn-secondary" onclick="shareShoppingList(${recipeId})">
              <i class="fas fa-share-alt"></i> Поделиться
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Обработчики закрытия
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

  } catch (err) {
    showNotification(err.message, 'error');
  }
}






function filterRecipes() {
  const searchQuery = document.getElementById('recipe-search').value.toLowerCase();
  const cards = document.querySelectorAll('.recipe-card');
  
  cards.forEach(card => {
    const title = card.querySelector('.recipe-title').textContent.toLowerCase();
    const description = card.querySelector('.recipe-description').textContent.toLowerCase();
    const cuisine = card.dataset.cuisine.toLowerCase();
    
    const matches = title.includes(searchQuery) || 
                   description.includes(searchQuery) || 
                   cuisine.includes(searchQuery);
    
    card.style.display = matches ? 'block' : 'none';
  });
}

// Функции управления профилем
async function loadProfile() {
  try {
    const response = await fetch('http://localhost:3000/api/profile', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Не удалось загрузить профиль');
    
    const profile = await response.json();
    const container = document.getElementById('profile-info');
    
    if (!container) return;

    container.innerHTML = `
      <div class="section-header">
        <h2><i class="fas fa-user"></i> Мой профиль</h2>
        <button id="refresh-profile" class="btn-icon" title="Обновить профиль">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
      <div class="profile-header">
        <div class="profile-avatar">
          ${profile.name.charAt(0).toUpperCase()}
        </div>
        <div class="profile-info">
          <h3>${profile.name}</h3>
          <p>${profile.email}</p>
        </div>
        <button id="edit-profile-btn" class="btn-icon" title="Редактировать профиль">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      <div class="profile-details">
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-phone"></i> Телефон:</span>
          <span>${profile.phone || 'Не указан'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label"><i class="fas fa-heart"></i> Предпочтения:</span>
          <span>${profile.preferences.join(', ') || 'Не указаны'}</span>
        </div>
      </div>
      <div class="profile-section">
        <h3><i class="fas fa-users"></i> Мои подписки</h3>
        <div id="subscriptions-container" class="subscriptions-grid">
          <div class="loading">
            <i class="fas fa-spinner fa-spin"></i> Загрузка подписок...
          </div>
        </div>
      </div>
    `;

    // Добавляем обработчики для кнопок
    document.getElementById('edit-profile-btn').onclick = editProfile;
    document.getElementById('refresh-profile').onclick = async () => {
      const button = document.getElementById('refresh-profile');
      button.disabled = true;
      button.querySelector('i').classList.add('fa-spin');
      try {
        await loadProfile();
        await loadSubscriptions();
        await loadClassHistory();
      } finally {
        button.disabled = false;
        button.querySelector('i').classList.remove('fa-spin');
      }
    };

    // Загружаем подписки
    loadSubscriptions();

    // Загружаем историю посещений
    loadClassHistory();

  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Функция для загрузки подписок
async function loadSubscriptions() {
  try {
    const subscriptionsContainer = document.getElementById('subscriptions-container');
    if (!subscriptionsContainer) return;

    const response = await fetch('http://localhost:3000/api/profile/subscriptions', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить подписки');
    }

    const subscriptions = await response.json();

    if (subscriptions.length === 0) {
      subscriptionsContainer.innerHTML = '<div class="no-subscriptions-message">У вас пока нет подписок на шеф-поваров</div>';
      return;
    }

    subscriptionsContainer.innerHTML = subscriptions.map(chef => `
      <div class="chef-card">
        <div class="chef-avatar">${chef.name.charAt(0).toUpperCase()}</div>
        <div class="chef-info">
          <div class="chef-header">
            <h4>${chef.name}</h4>
            <div class="chef-cuisine">${chef.specialization || ''}</div>
          </div>
          <div class="chef-stats">
            <div class="stats-row">
              <span><i class="fas fa-book"></i> ${chef.recipes_count} рецептов</span>
              <span><i class="fas fa-users"></i> ${chef.subscribers_count} подписчиков</span>
            </div>
          </div>
          <button 
            onclick="toggleChefSubscription(${chef.id})" 
            class="btn btn-secondary btn-small subscribe-btn"
            data-chef-id="${chef.id}"
          >
            <i class="fas fa-user-minus"></i> Отписаться
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Ошибка при загрузке подписок:', err);
    showNotification(err.message, 'error');
  }
}

async function loadClassHistory() {
  try {
    const response = await fetch('http://localhost:3000/api/classes/history', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Не удалось загрузить историю посещений');
    
    const history = await response.json();
    const container = document.getElementById('class-history');
    
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = '<div class="no-history-message">Вы еще не посетили ни одного мастер-класса</div>';
      return;
    }

    container.innerHTML = history.map(cls => `
      <div class="class-card completed">
        <div class="class-header">
          <h3 class="class-title">${cls.title}</h3>
          <div class="class-meta">
            <span><i class="fas fa-calendar"></i> ${new Date(cls.date).toLocaleDateString()}</span>
            <span class="completion-status">
              <i class="fas fa-check-circle"></i> Завершен
            </span>
          </div>
        </div>
        <div class="class-body">
          <div class="class-details">
            <div><i class="fas fa-user-graduate"></i> Шеф: ${cls.chef_name}</div>
            <div><i class="fas fa-globe"></i> ${cls.cuisine}</div>
            <div><i class="fas fa-clock"></i> ${cls.duration} минут</div>
          </div>
          ${cls.feedback ? `
            <div class="class-feedback">
              <h4><i class="fas fa-comment"></i> Ваш отзыв:</h4>
              <p>${cls.feedback}</p>
            </div>
          ` : ''}
        </div>
        <div class="class-footer">
          ${cls.certificate ? `
            <button onclick="downloadCertificate(${cls.id})" class="btn btn-primary btn-small">
              <i class="fas fa-download"></i> Скачать сертификат
            </button>
          ` : ''}
          <button onclick="findSimilarClasses('${cls.cuisine}', '${cls.type || ''}', '${cls.difficulty || ''}')" class="btn btn-secondary btn-small">
            <i class="fas fa-search"></i> Найти похожие
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Ошибка при загрузке истории посещений:', err);
    showNotification(err.message, 'error');
  }
}

// Функция для поиска похожих мастер-классов
function findSimilarClasses(cuisine, type, difficulty) {
  // Переключаемся на вкладку мастер-классов
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  const classesTab = document.querySelector('[data-tab="classes"]');
  if (classesTab) {
    classesTab.classList.add('active');
    document.getElementById('classes-tab').classList.add('active');
  }

  // Устанавливаем значения фильтров
  const cuisineFilter = document.getElementById('cuisine-filter');
  const typeFilter = document.getElementById('type-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');

  if (cuisineFilter) cuisineFilter.value = cuisine;
  if (typeFilter) typeFilter.value = type;
  if (difficultyFilter) difficultyFilter.value = difficulty;

  // Применяем фильтры
  applyFilters();

  // Прокручиваем к фильтрам
  const filtersSection = document.querySelector('.filters-section');
  if (filtersSection) {
    filtersSection.scrollIntoView({ behavior: 'smooth' });
  }

  showNotification('Поиск похожих мастер-классов на основе "' + cuisine + '"', 'info');
}

async function downloadCertificate(classId) {
  try {
    const response = await fetch(`http://localhost:3000/api/classes/${classId}/certificate`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Не удалось загрузить сертификат');

    // Создаем ссылку для скачивания
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${classId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

  } catch (err) {
    showNotification(err.message, 'error');
  }
}

function editProfile() {
  const profileInfo = document.getElementById('profile-info');
  const currentName = profileInfo.querySelector('h3').textContent;
  const currentPhone = profileInfo.querySelector('.detail-item:nth-child(1) span:last-child').textContent;
  const currentPreferences = profileInfo.querySelector('.detail-item:nth-child(2) span:last-child').textContent;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2><i class="fas fa-user-edit"></i> Редактирование профиля</h2>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="edit-profile-form">
          <div class="form-group">
            <label for="edit-name"><i class="fas fa-user"></i> ФИО</label>
            <input type="text" id="edit-name" value="${currentName}" required>
          </div>
          <div class="form-group">
            <label for="edit-phone"><i class="fas fa-phone"></i> Телефон</label>
            <input type="tel" id="edit-phone" value="${currentPhone === 'Не указан' ? '' : currentPhone}">
          </div>
          <div class="form-group">
            <label for="edit-preferences"><i class="fas fa-heart"></i> Кулинарные предпочтения</label>
            <textarea id="edit-preferences" rows="3">${currentPreferences === 'Не указаны' ? '' : currentPreferences}</textarea>
          </div>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Сохранить изменения
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Обработчики закрытия
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Обработчик формы
  const form = modal.querySelector('#edit-profile-form');
  form.onsubmit = async (e) => {
  e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
  const formData = {
        name: document.getElementById('edit-name').value.trim(),
        phone: document.getElementById('edit-phone').value.trim(),
        preferences: document.getElementById('edit-preferences').value
          .split(',')
          .map(p => p.trim())
          .filter(p => p)
      };

      const response = await fetch('http://localhost:3000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить профиль');
      }

      showNotification('Профиль успешно обновлен', 'success');
      modal.remove();
      loadProfile();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
    }
  };
}

// Функция для отображения видео
function showVideo(videoUrl) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="video-container">
          <iframe src="${getEmbedUrl(videoUrl)}" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// Функция для получения ID видео YouTube
function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Функция для получения URL для встраивания видео
function getEmbedUrl(url) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`;
  }
  return url;
}

// Функция для отображения профиля шеф-повара
async function showChefProfile(chefId) {
  try {
    const response = await fetch(`http://localhost:3000/api/chefs/${chefId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить профиль шеф-повара');
    }

    const chef = await response.json();
    const modal = document.getElementById('subscribe-modal');
    const chefName = document.getElementById('chef-name');
    const chefStats = document.getElementById('chef-stats');
    const subscribeBtn = document.getElementById('subscribe-btn');
    const unsubscribeBtn = document.getElementById('unsubscribe-btn');

    chefName.textContent = chef.name;
    chefStats.textContent = `${chef.recipes_count} рецептов • ${chef.subscribers_count} подписчиков`;

    // Показываем соответствующую кнопку
    subscribeBtn.style.display = chef.is_subscribed ? 'none' : 'block';
    unsubscribeBtn.style.display = chef.is_subscribed ? 'block' : 'none';

    // Обработчики подписки/отписки
    subscribeBtn.onclick = () => subscribeToChef(chefId);
    unsubscribeBtn.onclick = () => unsubscribeFromChef(chefId);

    modal.style.display = 'block';
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Функции подписки/отписки
async function subscribeToChef(chefId) {
  try {
    const response = await fetch(`http://localhost:3000/api/chefs/${chefId}/subscribe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось подписаться на шеф-повара');
    }

    showNotification('Вы успешно подписались на шеф-повара', 'success');
    document.getElementById('subscribe-btn').style.display = 'none';
    document.getElementById('unsubscribe-btn').style.display = 'block';
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function unsubscribeFromChef(chefId) {
  try {
    const response = await fetch(`http://localhost:3000/api/chefs/${chefId}/subscribe`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось отписаться от шеф-повара');
    }

    showNotification('Вы успешно отписались от шеф-повара', 'success');
    document.getElementById('subscribe-btn').style.display = 'block';
    document.getElementById('unsubscribe-btn').style.display = 'none';
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Вспомогательные функции для перевода
function translateCuisine(cuisine) {
  const translations = {
    'italian': 'Итальянская',
    'japanese': 'Японская',
    'french': 'Французская'
  };
  return translations[cuisine] || cuisine;
}

function translateType(type) {
  const translations = {
    'main': 'Основные блюда',
    'dessert': 'Десерты',
    'bakery': 'Выпечка'
  };
  return translations[type] || type;
}

function translateDifficulty(difficulty) {
  const translations = {
    'beginner': 'Для начинающих',
    'intermediate': 'Средняя',
    'advanced': 'Продвинутая'
  };
  return translations[difficulty] || difficulty;
}

function showRecipeForm() {
  // Сначала загружаем список шеф-поваров
  fetch('http://localhost:3000/api/chefs', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error('Не удалось загрузить список шеф-поваров');
    }
    return response.json();
  })
  .then(response => {
    console.log('Полученные данные:', response);
    const chefs = response.data;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content recipe-form-modal">
        <div class="modal-header">
          <h2><i class="fas fa-plus"></i> Добавить новый рецепт</h2>
          <button type="button" class="modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <form id="recipe-form" novalidate>
            <div class="form-group">
              <label for="recipe-chef">Шеф-повар *</label>
              <select id="recipe-chef" name="chef_id" required>
                <option value="">Выберите шеф-повара</option>
                ${chefs.map(chef => `
                  <option value="${chef.id}">${chef.name} (${chef.specialization})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="recipe-title">Название рецепта *</label>
              <input type="text" id="recipe-title" name="title" required minlength="3">
            </div>
            
            <div class="form-group">
              <label for="recipe-description">Описание *</label>
              <textarea id="recipe-description" name="description" required minlength="10"></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="recipe-cuisine">Кухня *</label>
                <select id="recipe-cuisine" name="cuisine" required>
                  <option value="">Выберите кухню</option>
                  <option value="italian">Итальянская</option>
                  <option value="japanese">Японская</option>
                  <option value="french">Французская</option>
                  <option value="russian">Русская</option>
                  <option value="mediterranean">Средиземноморская</option>
                  <option value="asian">Азиатская</option>
                  <option value="european">Европейская</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="recipe-type">Тип блюда *</label>
                <select id="recipe-type" name="type" required>
                  <option value="">Выберите тип</option>
                  <option value="main">Основное блюдо</option>
                  <option value="dessert">Десерт</option>
                  <option value="bakery">Выпечка</option>
                  <option value="appetizer">Закуска</option>
                  <option value="soup">Суп</option>
                  <option value="salad">Салат</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="recipe-difficulty">Сложность *</label>
                <select id="recipe-difficulty" name="difficulty" required>
                  <option value="">Выберите сложность</option>
                  <option value="beginner">Для начинающих</option>
                  <option value="intermediate">Средняя</option>
                  <option value="advanced">Продвинутая</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="recipe-time">Время приготовления (минут) *</label>
                <input type="number" id="recipe-time" name="cooking_time" required min="1">
              </div>
              
              <div class="form-group">
                <label for="recipe-video">Ссылка на видео (YouTube)</label>
                <input type="url" id="recipe-video" name="video_url" placeholder="https://www.youtube.com/watch?v=...">
              </div>
            </div>

            <div class="form-group">
              <label>Ингредиенты *</label>
              <div id="ingredients-list"></div>
              <button type="button" class="btn btn-secondary" id="add-ingredient">
                <i class="fas fa-plus"></i> Добавить ингредиент
              </button>
            </div>

            <div class="form-group">
              <label>Шаги приготовления *</label>
              <div id="steps-list"></div>
              <button type="button" class="btn btn-secondary" id="add-step">
                <i class="fas fa-plus"></i> Добавить шаг
              </button>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="hideRecipeForm()">
                <i class="fas fa-times"></i> Отмена
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Сохранить рецепт
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Инициализация обработчиков формы
    initializeRecipeForm(modal);
  })
  .catch(error => {
    console.error('Ошибка при загрузке шеф-поваров:', error);
    showNotification(error.message, 'error');
  });
}

// Добавляем функцию инициализации формы
function initializeRecipeForm(modal) {
  const form = modal.querySelector('#recipe-form');
  const addIngredientBtn = modal.querySelector('#add-ingredient');
  const addStepBtn = modal.querySelector('#add-step');
  const closeBtn = modal.querySelector('.modal-close');

  // Обработчики закрытия
  closeBtn.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Добавление ингредиента
  addIngredientBtn.onclick = () => {
    const ingredientsList = modal.querySelector('#ingredients-list');
    const ingredientItem = document.createElement('div');
    ingredientItem.className = 'ingredient-item';
    const index = ingredientsList.children.length;
    ingredientItem.innerHTML = `
      <input type="text" name="ingredients[${index}][name]" placeholder="Название" required>
      <input type="number" name="ingredients[${index}][amount]" placeholder="Количество" min="0" step="0.1" required>
      <select name="ingredients[${index}][unit]" required>
        <option value="">Выберите единицу</option>
        <option value="g">г</option>
        <option value="kg">кг</option>
        <option value="ml">мл</option>
        <option value="l">л</option>
        <option value="pcs">шт</option>
        <option value="tsp">ч.л.</option>
        <option value="tbsp">ст.л.</option>
      </select>
      <button type="button" class="btn-icon remove-ingredient"><i class="fas fa-minus"></i></button>
    `;
    ingredientsList.appendChild(ingredientItem);

    // Обработчик удаления ингредиента
    ingredientItem.querySelector('.remove-ingredient').onclick = () => {
      ingredientItem.remove();
      // Перенумеруем оставшиеся ингредиенты
      Array.from(ingredientsList.children).forEach((item, idx) => {
        item.querySelectorAll('input, select').forEach(input => {
          const name = input.getAttribute('name').replace(/\d+/, idx);
          input.setAttribute('name', name);
        });
      });
    };
  };

  // Добавление шага
  addStepBtn.onclick = () => {
    const stepsList = modal.querySelector('#steps-list');
    const stepItem = document.createElement('div');
    stepItem.className = 'step-item';
    const index = stepsList.children.length;
    stepItem.innerHTML = `
      <textarea name="steps[${index}][description]" placeholder="Описание шага" required></textarea>
      <input type="text" name="steps[${index}][tip]" placeholder="Совет шеф-повара (необязательно)">
      <button type="button" class="btn-icon remove-step"><i class="fas fa-minus"></i></button>
    `;
    stepsList.appendChild(stepItem);

    // Обработчик удаления шага
    stepItem.querySelector('.remove-step').onclick = () => {
      stepItem.remove();
      // Перенумеруем оставшиеся шаги
      Array.from(stepsList.children).forEach((item, idx) => {
        item.querySelectorAll('textarea, input').forEach(input => {
          const name = input.getAttribute('name').replace(/\d+/, idx);
          input.setAttribute('name', name);
        });
      });
    };
  };

  // Добавляем первый ингредиент и шаг по умолчанию
  addIngredientBtn.click();
  addStepBtn.click();

  // Обработчик отправки формы
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
      // Собираем данные формы
      const formData = new FormData(form);
      const jsonData = {
        chef_id: parseInt(formData.get('chef_id')),
        title: formData.get('title').trim(),
        description: formData.get('description').trim(),
        cuisine: formData.get('cuisine'),
        type: formData.get('type'),
        difficulty: formData.get('difficulty'),
        cooking_time: parseInt(formData.get('cooking_time')),
        video_url: formData.get('video_url')?.trim() || null,
        
        // Собираем ингредиенты
        ingredients: Array.from(form.querySelectorAll('.ingredient-item')).map(item => ({
          name: item.querySelector('input[type="text"]').value.trim(),
          amount: parseFloat(item.querySelector('input[type="number"]').value),
          unit: item.querySelector('select').value
        })),

        // Собираем шаги
        steps: Array.from(form.querySelectorAll('.step-item')).map((item, index) => ({
          step_number: index + 1,
          description: item.querySelector('textarea').value.trim(),
          tip: item.querySelector('input[type="text"]').value.trim() || null
        }))
      };

      console.log('Отправляемые данные:', jsonData);

      // Отправляем данные на сервер
      const response = await fetch('http://localhost:3000/api/recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
        body: JSON.stringify(jsonData)
    });

      console.log('Статус ответа:', response.status);
      const responseData = await response.json();
      console.log('Ответ сервера:', responseData);

    if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Ошибка при сохранении рецепта');
      }

      showNotification('Рецепт успешно сохранен', 'success');
      modal.remove();
      loadRecipes(); // Обновляем список рецептов
    } catch (error) {
      console.error('Подробная ошибка при сохранении рецепта:', error);
      showNotification(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить рецепт';
    }
  };
}

function hideRecipeForm() {
  const modal = document.querySelector('.modal');
  if (modal) modal.remove();
}

// Добавляем после существующего кода, перед последней закрывающей скобкой

function showChefForm() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content chef-form-modal">
      <div class="modal-header">
        <h2><i class="fas fa-user-chef"></i> Добавить шеф-повара</h2>
        <button type="button" class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="chef-form" novalidate>
          <div class="form-group">
            <label for="chef-name"><i class="fas fa-user"></i> ФИО *</label>
            <input type="text" id="chef-name" required minlength="3">
          </div>
          
          <div class="form-group">
            <label for="chef-specialization"><i class="fas fa-utensils"></i> Специализация *</label>
            <input type="text" id="chef-specialization" required>
          </div>

          <div class="form-group">
            <label for="chef-experience"><i class="fas fa-clock"></i> Опыт работы (лет) *</label>
            <input type="number" id="chef-experience" required min="0">
          </div>
          
          <div class="form-group">
            <label for="chef-bio"><i class="fas fa-book"></i> Биография *</label>
            <textarea id="chef-bio" rows="4" required minlength="50"></textarea>
          </div>

          <div class="form-group">
            <label for="chef-education"><i class="fas fa-graduation-cap"></i> Образование *</label>
            <textarea id="chef-education" rows="2" required></textarea>
          </div>

          <div class="form-group">
            <label for="chef-achievements"><i class="fas fa-trophy"></i> Достижения</label>
            <textarea id="chef-achievements" rows="2"></textarea>
          </div>

          <div class="form-group">
            <label for="chef-cuisines"><i class="fas fa-globe"></i> Кухни *</label>
            <select id="chef-cuisines" multiple required>
              <option value="italian">Итальянская</option>
              <option value="french">Французская</option>
              <option value="japanese">Японская</option>
              <option value="russian">Русская</option>
              <option value="mediterranean">Средиземноморская</option>
              <option value="asian">Азиатская</option>
              <option value="european">Европейская</option>
            </select>
            <small>Зажмите Ctrl для выбора нескольких кухонь</small>
          </div>

          <div class="form-group">
            <label for="chef-photo"><i class="fas fa-camera"></i> Фото</label>
            <input type="file" id="chef-photo" accept="image/*">
          </div>

          <div class="form-group">
            <label for="chef-certificates"><i class="fas fa-certificate"></i> Сертификаты</label>
            <input type="file" id="chef-certificates" multiple accept=".pdf,.jpg,.jpeg,.png">
            <small>Можно выбрать несколько файлов</small>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary cancel-chef">
              <i class="fas fa-times"></i> Отмена
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Обработчики закрытия
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.cancel-chef');
  closeBtn.addEventListener('click', () => modal.remove());
  cancelBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Обработчик формы
  const form = modal.querySelector('#chef-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formFields = {
      name: {
        value: form.querySelector('#chef-name')?.value?.trim(),
        label: 'ФИО'
      },
      specialization: {
        value: form.querySelector('#chef-specialization')?.value?.trim(),
        label: 'специализация'
      },
      experience: {
        value: form.querySelector('#chef-experience')?.value,
        label: 'опыт работы'
      },
      bio: {
        value: form.querySelector('#chef-bio')?.value?.trim(),
        label: 'биография'
      },
      education: {
        value: form.querySelector('#chef-education')?.value?.trim(),
        label: 'образование'
      },
      achievements: {
        value: form.querySelector('#chef-achievements')?.value?.trim(),
        label: 'достижения'
      },
      cuisines: {
        value: Array.from(form.querySelector('#chef-cuisines')?.selectedOptions || []).map(opt => opt.value),
        label: 'кухни'
      }
    };

    // Проверяем обязательные поля
    const errors = [];
    if (!formFields.name.value) errors.push(formFields.name.label);
    if (!formFields.specialization.value) errors.push(formFields.specialization.label);
    if (!formFields.experience.value || parseInt(formFields.experience.value) < 0) {
      errors.push(formFields.experience.label);
    }
    if (!formFields.bio.value || formFields.bio.value.length < 50) {
      errors.push(formFields.bio.label);
    }
    if (!formFields.education.value) errors.push(formFields.education.label);
    if (formFields.cuisines.value.length === 0) errors.push(formFields.cuisines.label);

    if (errors.length > 0) {
      showNotification(`Пожалуйста, заполните следующие поля: ${errors.join(', ')}`, 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
      // Создаем FormData для отправки файлов
      const formData = new FormData();
      formData.append('name', formFields.name.value);
      formData.append('specialization', formFields.specialization.value);
      formData.append('experience', formFields.experience.value);
      formData.append('bio', formFields.bio.value);
      formData.append('education', formFields.education.value);
      formData.append('achievements', formFields.achievements.value || '');
      formFields.cuisines.value.forEach(cuisine => {
        formData.append('cuisines[]', cuisine);
      });

      // Добавляем фото, если оно выбрано
      const photoInput = form.querySelector('#chef-photo');
      if (photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
      }

      // Добавляем сертификаты, если они выбраны
      const certificatesInput = form.querySelector('#chef-certificates');
      Array.from(certificatesInput.files).forEach(file => {
        formData.append('certificates[]', file);
      });

      const response = await fetch('/api/chefs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Ошибка при создании профиля шеф-повара');
      }

      showNotification('Профиль шеф-повара успешно создан', 'success');
      modal.remove();
      
      // Обновляем список шеф-поваров в форме рецепта
      await updateChefsList();
      
  } catch (err) {
      console.error('Ошибка при создании профиля шеф-повара:', err);
    showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
  }
  });
}

// Добавляем функцию для загрузки списка шеф-поваров
async function loadChefs() {
  try {
    const response = await fetch('/api/chefs', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить список шеф-поваров');
    }

    const chefs = await response.json();
    const container = document.getElementById('chefs-list');
    
    if (!container) return;

    if (chefs.length === 0) {
      container.innerHTML = '<div class="no-chefs-message">Нет доступных шеф-поваров</div>';
      return;
    }

    container.innerHTML = chefs.map(chef => `
      <div class="chef-card">
        <div class="chef-header">
          ${chef.photo ? `
            <img src="${chef.photo}" alt="${chef.name}" class="chef-photo">
          ` : `
            <div class="chef-avatar">${chef.name.charAt(0).toUpperCase()}</div>
          `}
          <h3 class="chef-name">${chef.name}</h3>
          <div class="chef-specialization">${chef.specialization}</div>
        </div>
        <div class="chef-body">
          <div class="chef-info">
            <p><i class="fas fa-clock"></i> Опыт: ${chef.experience} лет</p>
            <p><i class="fas fa-globe"></i> Кухни: ${chef.cuisines.map(c => translateCuisine(c)).join(', ')}</p>
          </div>
          <p class="chef-bio">${chef.bio}</p>
          ${chef.achievements ? `
            <div class="chef-achievements">
              <h4><i class="fas fa-trophy"></i> Достижения</h4>
              <p>${chef.achievements}</p>
            </div>
          ` : ''}
        </div>
        <div class="chef-footer">
          <button onclick="showChefDetails(${chef.id})" class="btn btn-primary btn-small">
            <i class="fas fa-info-circle"></i> Подробнее
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Ошибка при загрузке шеф-поваров:', err);
    showNotification(err.message, 'error');
  }
}

// Функция для просмотра деталей шеф-повара
async function showChefDetails(chefId) {
  try {
    const response = await fetch(`/api/chefs/${chefId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить информацию о шеф-поваре');
    }

    const chef = await response.json();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content chef-details-modal">
        <div class="modal-header">
          <h2>${chef.name}</h2>
          <button type="button" class="modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="chef-profile">
            ${chef.photo ? `
              <img src="${chef.photo}" alt="${chef.name}" class="chef-full-photo">
            ` : ''}
            <div class="chef-info">
              <p><strong><i class="fas fa-utensils"></i> Специализация:</strong> ${chef.specialization}</p>
              <p><strong><i class="fas fa-clock"></i> Опыт работы:</strong> ${chef.experience} лет</p>
              <p><strong><i class="fas fa-globe"></i> Кухни:</strong> ${chef.cuisines.map(c => translateCuisine(c)).join(', ')}</p>
            </div>
            <div class="chef-bio">
              <h3><i class="fas fa-book"></i> Биография</h3>
              <p>${chef.bio}</p>
            </div>
            <div class="chef-education">
              <h3><i class="fas fa-graduation-cap"></i> Образование</h3>
              <p>${chef.education}</p>
            </div>
            ${chef.achievements ? `
              <div class="chef-achievements">
                <h3><i class="fas fa-trophy"></i> Достижения</h3>
                <p>${chef.achievements}</p>
              </div>
            ` : ''}
            ${chef.certificates?.length ? `
              <div class="chef-certificates">
                <h3><i class="fas fa-certificate"></i> Сертификаты</h3>
                <div class="certificates-gallery">
                  ${chef.certificates.map(cert => `
                    <a href="${cert}" target="_blank" class="certificate-link">
                      <img src="${cert}" alt="Сертификат">
                    </a>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Обработчики закрытия
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

  } catch (err) {
    console.error('Ошибка при загрузке информации о шеф-поваре:', err);
    showNotification(err.message, 'error');
  }
}

// Добавляем функцию для обновления списка шеф-поваров в форме рецепта
async function updateChefsList() {
  try {
    const response = await fetch('http://localhost:3000/api/chefs', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить список шеф-поваров');
    }

    const chefs = await response.json();
    const chefSelect = document.querySelector('#recipe-chef');
    
    if (chefSelect) {
      chefSelect.innerHTML = `
        <option value="">Выберите шеф-повара</option>
        ${chefs.map(chef => `
          <option value="${chef.id}">${chef.name} (${chef.specialization})</option>
        `).join('')}
      `;
    }
  } catch (err) {
    console.error('Ошибка при обновлении списка шеф-поваров:', err);
    showNotification('Не удалось обновить список шеф-поваров', 'error');
  }
} 

function initChatbot() {
  const chatbotToggle = document.getElementById('chatbot-toggle');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotContainer = document.getElementById('chatbot-container');
  const chatbotInput = document.getElementById('chatbot-user-input');
  const chatbotSend = document.getElementById('chatbot-send');

  if (chatbotToggle) {
    chatbotToggle.addEventListener('click', () => {
      chatbotContainer.classList.toggle('visible');
    });
  }

  if (chatbotClose) {
    chatbotClose.addEventListener('click', () => {
      chatbotContainer.classList.remove('visible');
    });
  }

  if (chatbotInput && chatbotSend) {
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });

    chatbotSend.addEventListener('click', sendChatMessage);
  }

  // Добавляем приветственное сообщение
  setTimeout(() => {
    addMessage("Привет! Я помощник шеф-повара. Чем могу помочь?", 'bot');
  }, 1000);
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById('chatbot-messages');
  if (!messagesContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', `${sender}-message`);
  messageElement.textContent = text;
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatbot-user-input');
  const message = input.value.trim();
  
  if (message) {
    addMessage(message, 'user');
    input.value = '';

    try {
      // Локальная обработка сообщений
      let botResponse = '';
      const lowerMessage = message.toLowerCase();

      // Базовые приветствия
      if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
        botResponse = "Здравствуйте! Я помогу вам с информацией о мастер-классах и рецептах. Что вас интересует?";
      }
      // О мастер-классах
      else if (lowerMessage.includes('мастер') || lowerMessage.includes('класс')) {
        botResponse = "На нашей платформе проводятся кулинарные мастер-классы от профессиональных шеф-поваров. Вы можете:\n" +
                     "- Просмотреть расписание мастер-классов\n" +
                     "- Записаться на интересующий мастер-класс\n" +
                     "- Отменить запись\n" +
                     "- Получить сертификат после прохождения";
      }
      // О рецептах
      else if (lowerMessage.includes('рецепт')) {
        botResponse = "В нашей коллекции множество рецептов от профессиональных шеф-поваров. Вы можете:\n" +
                     "- Просматривать рецепты разных кухонь мира\n" +
                     "- Смотреть видео-инструкции приготовления\n" +
                     "- Получить список ингредиентов\n" +
                     "- Следовать пошаговым инструкциям\n" +
                     "- Читать советы шеф-поваров";
      }
      // О шеф-поварах
      else if (lowerMessage.includes('шеф') || lowerMessage.includes('повар')) {
        botResponse = "У нас работают профессиональные шеф-повара. Вы можете:\n" +
                     "- Просмотреть профили шеф-поваров\n" +
                     "- Подписаться на любимого шеф-повара\n" +
                     "- Следить за их новыми рецептами\n" +
                     "- Записаться на их мастер-классы";
      }
      // О регистрации
      else if (lowerMessage.includes('регистрац') || lowerMessage.includes('зарегистр')) {
        botResponse = "Для регистрации на платформе:\n" +
                     "1. Нажмите кнопку 'Регистрация'\n" +
                     "2. Заполните форму с вашими данными\n" +
                     "3. Подтвердите email\n" +
                     "После этого вы сможете записываться на мастер-классы и просматривать рецепты!";
      }
      // О профиле
      else if (lowerMessage.includes('профиль') || lowerMessage.includes('личный кабинет')) {
        botResponse = "В личном кабинете вы можете:\n" +
                     "- Просматривать историю посещений мастер-классов\n" +
                     "- Управлять подписками на шеф-поваров\n" +
                     "- Редактировать личные данные\n" +
                     "- Скачивать сертификаты";
      }
      // Помощь
      else if (lowerMessage.includes('помощь') || lowerMessage.includes('помоги')) {
        botResponse = "Я могу рассказать вам о:\n" +
                     "- Мастер-классах и записи на них\n" +
                     "- Рецептах и их поиске\n" +
                     "- Шеф-поварах\n" +
                     "- Регистрации и профиле\n" +
                     "Что именно вас интересует?";
      }
      // По умолчанию
      else {
        botResponse = "Извините, я не совсем понял ваш вопрос. Я могу рассказать о мастер-классах, рецептах, шеф-поварах или помочь с регистрацией. Что вас интересует?";
      }

      addMessage(botResponse, 'bot');
    } catch (error) {
      console.error('Ошибка чат-бота:', error);
      addMessage("Извините, произошла ошибка. Попробуйте позже.", 'bot');
    }
  }
}

// Функция для подписки/отписки от шеф-повара
async function toggleChefSubscription(chefId) {
  try {
    const subscribeBtn = document.querySelector(`.subscribe-btn[data-chef-id="${chefId}"]`);
    const isSubscribed = subscribeBtn.innerHTML.includes('Отписаться');
    
    const response = await fetch(`http://localhost:3000/api/chefs/${chefId}/subscribe`, {
      method: isSubscribed ? 'DELETE' : 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(isSubscribed ? 'Не удалось отписаться' : 'Не удалось подписаться');
    }

    const data = await response.json();

    // Обновляем текст кнопки
    subscribeBtn.innerHTML = isSubscribed ? 
      '<i class="fas fa-user-plus"></i> Подписаться' : 
      '<i class="fas fa-user-minus"></i> Отписаться';

    // Обновляем количество подписчиков, если элемент существует
    const subscribersCount = document.querySelector(`.chef-stats .subscribers-count`);
    if (subscribersCount) {
      subscribersCount.textContent = data.subscribers_count;
    }

    showNotification(
      isSubscribed ? 'Вы успешно отписались от шеф-повара' : 'Вы успешно подписались на шеф-повара',
      'success'
    );

    // Обновляем список подписок в профиле
    const profileTab = document.getElementById('profile-tab');
    if (profileTab && profileTab.classList.contains('active')) {
      loadProfile();
    }
  } catch (err) {
    console.error('Ошибка при изменении подписки:', err);
    showNotification(err.message, 'error');
  }
}

// Добавляем новую функцию для применения фильтров
function applyFilters() {
  const cuisineFilter = document.getElementById('cuisine-filter');
  const typeFilter = document.getElementById('type-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');
  
  if (!cuisineFilter || !typeFilter || !difficultyFilter) {
    console.error('Не найдены элементы фильтров');
    return;
  }

  const filters = {
    cuisine: cuisineFilter.value,
    type: typeFilter.value,
    difficulty: difficultyFilter.value
  };
  
  console.log('Применяемые фильтры:', filters);
  filterClasses(filters.cuisine, filters.type, filters.difficulty);
}

// Добавляем функцию для завершения мастер-класса
async function completeClass(classId) {
  try {
    const response = await fetch(`http://localhost:3000/api/classes/${classId}/complete`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Не удалось завершить мастер-класс');
    }

    showNotification('Мастер-класс успешно завершен', 'success');
    
    // Удаляем карточку из "Мои записи"
    const card = document.querySelector(`#my-classes-list .class-card[data-class-id="${classId}"]`);
    if (card) {
      card.remove();
      
      // Проверяем, остались ли еще записи
      const container = document.getElementById('my-classes-list');
      if (container && !container.querySelector('.class-card')) {
        container.innerHTML = '<div class="no-classes-message">Вы еще не записаны ни на один мастер-класс</div>';
      }
    }
    
    // Обновляем историю посещений
    loadClassHistory();
  } catch (err) {
    console.error('Ошибка при завершении мастер-класса:', err);
    showNotification(err.message, 'error');
  }
}

// Добавляем функцию для отправки отзыва
async function leaveFeedback(classId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2><i class="fas fa-comment"></i> Оставить отзыв</h2>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="feedback-form">
          <div class="form-group">
            <label for="feedback-text">Ваш отзыв о мастер-классе:</label>
            <textarea id="feedback-text" rows="4" required></textarea>
          </div>
          <div class="form-group">
            <label for="feedback-rating">Оценка:</label>
            <div class="rating">
              ${[5,4,3,2,1].map(num => `
                <input type="radio" id="star${num}" name="rating" value="${num}" required>
                <label for="star${num}"><i class="fas fa-star"></i></label>
              `).join('')}
            </div>
          </div>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-paper-plane"></i> Отправить отзыв
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Обработчики закрытия
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Обработчик формы
  const form = modal.querySelector('#feedback-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

    try {
      const feedback = {
        text: form.querySelector('#feedback-text').value.trim(),
        rating: parseInt(form.querySelector('input[name="rating"]:checked').value)
      };

      const response = await fetch(`http://localhost:3000/api/classes/${classId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(feedback)
      });

      if (!response.ok) {
        throw new Error('Не удалось отправить отзыв');
      }

      showNotification('Отзыв успешно отправлен', 'success');
      modal.remove();
      loadClassHistory(); // Обновляем историю
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить отзыв';
    }
  };
}