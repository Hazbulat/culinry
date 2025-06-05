let currentUser = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', () => {
  // Проверка авторизации при загрузке
  authToken = localStorage.getItem('token');
  if (authToken) verifyToken();

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

  // Управление мероприятиями
  document.getElementById('add-event-btn').addEventListener('click', showEventForm);
  document.getElementById('cancel-event-btn').addEventListener('click', hideEventForm);
  document.getElementById('event-form').addEventListener('submit', handleEventSubmit);

  // Обновление данных
  document.getElementById('refresh-events').addEventListener('click', loadEvents);
  document.getElementById('refresh-my-events').addEventListener('click', loadMyEvents);
  document.getElementById('edit-profile-btn').addEventListener('click', editProfile);

  // Инициализация чат-бота
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
});

function toggleChatbot() {
  const chatbot = document.getElementById('chatbot-container');
  chatbot.classList.toggle('visible');
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById('chatbot-messages');
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
      const response = await fetch('http://localhost:3000/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('Ошибка при отправке сообщения');
      }

      const data = await response.json();
      addMessage(data.response, 'bot');
    } catch (error) {
      console.error('Ошибка чат-бота:', error);
      addMessage("Извините, произошла ошибка. Попробуйте позже.", 'bot');
    }
  }
}

function updateUI() {
  if (currentUser) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    document.getElementById('auth-status').innerHTML = `
      <span>${currentUser.name}</span>
      <button id="logout-btn" class="btn-small">Выйти</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Загружаем данные пользователя
    loadEvents();
    loadMyEvents();
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
      throw new Error(error.error || 'Ошибка входа');
    }

    const data = await response.json();
    currentUser = data.user;
    authToken = data.token;
    localStorage.setItem('token', authToken);

    updateUI();
    showNotification('Вы успешно вошли в систему', 'success');
  } catch (err) {
    showNotification(err.message, 'error');
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
    }
  } catch (err) {
    console.error('Ошибка проверки токена:', err);
  }
}

function logout() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('token');
  updateUI();
  showNotification('Вы вышли из системы', 'info');
}

async function loadEvents() {
  try {
    const response = await fetch('/api/available-events', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Не удалось загрузить мероприятия');
    const events = await response.json();
    renderEvents(events);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Обновленная функция renderEvents
function renderEvents(events) {
  const eventsList = document.getElementById('events-list');
  eventsList.innerHTML = '';

  const now = new Date();

  // Фильтруем только будущие мероприятия
  const upcomingEvents = events.filter(event => new Date(event.event_date) > now);

  if (upcomingEvents.length === 0) {
    eventsList.innerHTML = '<p>Нет доступных мероприятий</p>';
    return;
  }

  upcomingEvents.forEach(event => {
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    
    const date = new Date(event.event_date);
    const isFull = event.participants_count >= event.max_participants;

    eventCard.innerHTML = `
      <div class="event-header">
        <h3 class="event-title">${event.title}</h3>
        <div class="event-date">${date.toLocaleString()}</div>
      </div>
      <div class="event-body">
        <p class="event-description">${event.description}</p>
        <div class="event-details">
          <div><i class="fas fa-map-marker-alt"></i> ${event.location}</div>
          <div><i class="fas fa-users"></i> ${event.participants_count}/${event.max_participants}</div>
          <div><i class="fas fa-user-tie"></i> ${event.organizer_name}</div>
        </div>
      </div>
      <div class="event-footer">
        <button class="btn ${isFull ? 'btn-disabled' : ''}" data-id="${event.id}" 
                ${isFull ? 'disabled title="Места закончились"' : ''}>
          <i class="fas fa-user-plus"></i> Участвовать
        </button>
      </div>
    `;

    if (!isFull) {
      eventCard.querySelector('button').addEventListener('click', () => registerForEvent(event.id));
    }

    eventsList.appendChild(eventCard);
  });
}

async function loadParticipationHistory() {
  try {
    const response = await fetch('/api/my-events', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Не удалось загрузить историю мероприятий');

    const events = await response.json();
    renderParticipationHistory(events);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

function renderParticipationHistory(events) {
  const historyContainer = document.getElementById('participation-history');
  historyContainer.innerHTML = '';

  // Фильтруем только прошедшие мероприятия
  const pastEvents = events.filter(event => {
    const eventDate = new Date(event.event_date);
    return new Date() > eventDate;
  });

  if (pastEvents.length === 0) {
    historyContainer.innerHTML = '<p>Вы еще не посещали мероприятия</p>';
    return;
  }

  pastEvents.forEach(event => {
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    
    const eventDate = new Date(event.event_date);
    const statusClass = event.status === 'attended' ? 'status-completed' : 'status-planned';
    const statusText = event.status === 'attended' ? 'Посетил' : 'Не посетил';

    eventCard.innerHTML = `
      <div class="event-header">
        <h3 class="event-title">${event.title}</h3>
        <div class="event-date">${eventDate.toLocaleDateString()}</div>
      </div>
      <div class="event-body">
        <p class="event-description">${event.description}</p>
        <div class="event-details">
          <div><i class="fas fa-map-marker-alt"></i> ${event.address}</div>
          <div><i class="fas fa-user-tie"></i> ${event.organizer_name}</div>
        </div>
      </div>
      <div class="event-footer">
        <span class="event-status ${statusClass}">
          <i class="fas ${event.status === 'attended' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
          ${statusText}
        </span>
      </div>
    `;

    historyContainer.appendChild(eventCard);
  });
}

async function handleRegister(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('reg-name').value,
    email: document.getElementById('reg-email').value,
    phone: document.getElementById('reg-phone').value,
    password: document.getElementById('reg-password').value,
    confirmPassword: document.getElementById('reg-confirm-password').value,
    skills: document.getElementById('reg-skills').value.split(',').map(s => s.trim())
  };

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка регистрации');
    }

    const data = await response.json();
    showNotification('Регистрация успешна! Теперь вы можете войти.', 'success');
    
    // Автоматически заполняем форму входа
    document.getElementById('email').value = formData.email;
    document.getElementById('password').value = formData.password;
    
    // Показываем форму входа
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

function renderMyEvents(events) {
  const myEventsList = document.getElementById('my-events-list');
  myEventsList.innerHTML = '';

  // Фильтруем только предстоящие мероприятия
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.event_date);
    return new Date() <= eventDate;
  });

  if (upcomingEvents.length === 0) {
    myEventsList.innerHTML = '<p class="no-events-message">У вас нет предстоящих мероприятий</p>';
    return;
  }

  upcomingEvents.forEach(event => {
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    eventCard.dataset.id = event.id;
    
    const eventDate = new Date(event.event_date);
    const statusClass = 'status-planned';
    const statusText = 'Запланировано';

    eventCard.innerHTML = `
      <div class="event-header">
        <h3 class="event-title">${event.title}</h3>
        <div class="event-date">
          <i class="fas fa-calendar-day"></i> ${eventDate.toLocaleDateString()} 
          <i class="fas fa-clock"></i> ${eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
      <div class="event-body">
        <p class="event-description">${event.description}</p>
        <div class="event-details">
          <div><i class="fas fa-map-marker-alt"></i> ${event.address}</div>
          <div><i class="fas fa-user-tie"></i> Организатор: ${event.organizer_name}</div>
        </div>
      </div>
      <div class="event-footer">
        <button class="btn btn-danger cancel-btn" data-id="${event.id}">
          <i class="fas fa-times"></i> Отменить участие
        </button>
        <span class="event-status ${statusClass}">
          <i class="fas fa-calendar-check"></i>
          ${statusText}
        </span>
      </div>
    `;

    const cancelBtn = eventCard.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
      cancelBtn.disabled = true;
      
      try {
        await cancelParticipation(event.id);
      } finally {
        if (cancelBtn) {
          cancelBtn.innerHTML = '<i class="fas fa-times"></i> Отменить участие';
          cancelBtn.disabled = false;
        }
      }
    });

    myEventsList.appendChild(eventCard);
  });
}

async function registerForEvent(eventId) {
  try {
    if (!authToken) {
      showNotification('Для участия необходимо авторизоваться', 'error');
      return;
    }

    const response = await fetch('/api/participate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ eventId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка регистрации');
    }

    showNotification('Вы успешно зарегистрированы на мероприятие', 'success');
    loadEvents();
    loadMyEvents();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function loadMyEvents() {
  try {
    const response = await fetch('/api/my-events', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Не удалось загрузить ваши мероприятия');

    const events = await response.json();
    renderMyEvents(events);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function cancelParticipation(eventId) {
  try {
    const response = await fetch(`/api/participate/${eventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка отмены участия');
    }

    showNotification('Участие отменено', 'success');
    loadMyEvents();
    loadEvents();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

function showEventForm() {
  document.getElementById('add-event-form').style.display = 'block';
}

function hideEventForm() {
  document.getElementById('add-event-form').style.display = 'none';
  document.getElementById('event-form').reset();
}

async function handleEventSubmit(e) {
  e.preventDefault();
  
  const formData = {
    title: document.getElementById('event-title').value,
    description: document.getElementById('event-description').value,
    event_date: document.getElementById('event-date').value,
    address: document.getElementById('event-address').value,
    max_participants: parseInt(document.getElementById('event-max-participants').value)
  };

  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }
    
    showNotification('Мероприятие успешно создано!', 'success');
    hideEventForm();
    loadEvents();
  } catch (err) {
    showNotification(err.message, 'error');
  } finally {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
    }
  }
}

async function loadProfile() {
  try {
    const response = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Не удалось загрузить профиль');

    const profile = await response.json();
    renderProfile(profile);
    
    // Загружаем подписки
    await loadSubscriptions();
  } catch (err) {
    console.error('Ошибка при загрузке профиля:', err);
    showNotification(err.message, 'error');
  }
}

function renderProfile(profile) {
  const profileInfo = document.getElementById('profile-info');
  const participationHistory = document.getElementById('participation-history');
  
  // Основная информация профиля
  profileInfo.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${profile.name.charAt(0)}</div>
      <div class="profile-info">
        <h3>${profile.name || 'Не указано'}</h3>
        <p>${profile.email}</p>
      </div>
    </div>
    
    <div class="profile-details">
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-phone"></i> Телефон:</span>
        <span>${profile.phone || 'Не указан'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fas fa-star"></i> Навыки:</span>
        <span>${profile.skills || 'Не указаны'}</span>
      </div>
    </div>
  `;

  // Загружаем историю мероприятий
  loadParticipationHistory();
}

function editProfile() {
  showNotification('Функция редактирования профиля в разработке', 'info');
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

function getYouTubeId(url) {
  if (!url) return null;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
}

function getEmbedUrl(url) {
  const videoId = getYouTubeId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1` : null;
}

// Функция удаления рецепта
async function deleteRecipe(recipeId) {
  try {
    const response = await fetch(`http://localhost:3000/api/recipes/${recipeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка при удалении рецепта');
    }

    showNotification('Рецепт успешно удален', 'success');
    loadRecipes(); // Перезагружаем список рецептов
  } catch (err) {
    console.error('Ошибка при удалении рецепта:', err);
    showNotification(err.message, 'error');
    throw err; // Пробрасываем ошибку дальше для обработки в вызывающем коде
  }
}

// Функция подписки/отписки от шеф-повара
async function toggleChefSubscription(chefId, buttonElement) {
  try {
    const isSubscribed = buttonElement.classList.contains('subscribed');
    const method = isSubscribed ? 'DELETE' : 'POST';
    
    buttonElement.disabled = true;
    const oldHtml = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const response = await fetch(`http://localhost:3000/api/chefs/${chefId}/subscribe`, {
      method: method,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка при управлении подпиской');
    }

    const data = await response.json();
    
    // Обновляем все кнопки подписки для этого шеф-повара на странице
    document.querySelectorAll(`button[onclick*="toggleChefSubscription(${chefId},"]`).forEach(btn => {
      btn.classList.toggle('subscribed');
      btn.innerHTML = data.isSubscribed ? 
        '<i class="fas fa-user-minus"></i> Отписаться' : 
        '<i class="fas fa-user-plus"></i> Подписаться';
      
      if (data.isSubscribed) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary', 'subscribed');
      } else {
        btn.classList.remove('btn-secondary', 'subscribed');
        btn.classList.add('btn-primary');
      }
    });
    
    // Обновляем все счетчики подписчиков для этого шеф-повара
    document.querySelectorAll('.subscribers-count').forEach(counter => {
      const parent = counter.closest('.chef-info, .chef-stats, .stat-item');
      if (parent && parent.querySelector(`[onclick*="${chefId}"]`)) {
        counter.textContent = data.subscribers_count;
      }
    });

    showNotification(data.message, 'success');
  } catch (err) {
    console.error('Ошибка при управлении подпиской:', err);
    showNotification(err.message, 'error');
    buttonElement.innerHTML = oldHtml;
  } finally {
    buttonElement.disabled = false;
  }
}

// Обновляем функцию отображения деталей рецепта
async function showRecipeDetails(recipeId) {
  try {
    console.log('Загрузка деталей рецепта:', recipeId);
    const response = await fetch(`http://localhost:3000/api/recipes/${recipeId}`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить детали рецепта');
    }

    const recipe = await response.json();
    console.log('Полученные данные рецепта:', recipe);
    
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
                  title="Видео рецепта ${recipe.title}"
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
                  <div class="chef-avatar">${recipe.chef_name.charAt(0).toUpperCase()}</div>
                  <div class="chef-details">
                    <div class="chef-header">
                      <h4>${recipe.chef_name}</h4>
                      <button 
                        onclick="toggleChefSubscription(${recipe.chef_id}, this)" 
                        class="btn ${recipe.isSubscribed ? 'btn-secondary subscribed' : 'btn-primary'}"
                      >
                        <i class="fas fa-${recipe.isSubscribed ? 'user-minus' : 'user-plus'}"></i>
                        ${recipe.isSubscribed ? 'Отписаться' : 'Подписаться'}
                      </button>
                    </div>
                    <p class="chef-specialization">${recipe.chef_specialization || ''}</p>
                    <div class="chef-stats">
                      <span><i class="fas fa-book"></i> ${recipe.chef_stats.recipes_count} рецептов</span>
                      <span><i class="fas fa-users"></i> <span class="subscribers-count">${recipe.chef_stats.subscribers_count}</span> подписчиков</span>
                    </div>
                  </div>
                </div>
              ` : ''}
              <p class="recipe-description">${recipe.description}</p>
            </div>
            <div class="recipe-ingredients">
              <h3><i class="fas fa-list"></i> Ингредиенты</h3>
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
              <h3><i class="fas fa-tasks"></i> Приготовление</h3>
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
          <div class="modal-actions">
            <button onclick="generateShoppingList(${recipe.id})" class="btn btn-secondary">
              <i class="fas fa-shopping-cart"></i> Список покупок
            </button>
            ${parseInt(recipe.chef_id) === parseInt(currentUser.id) ? `
              <button onclick="confirmAndDeleteRecipe(${recipe.id}, this)" class="btn btn-danger">
                <i class="fas fa-trash"></i> Удалить рецепт
              </button>
            ` : ''}
          </div>
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

// Функция подтверждения и удаления рецепта
async function confirmAndDeleteRecipe(recipeId, buttonElement) {
  const confirmed = confirm('Вы уверены, что хотите удалить этот рецепт? Это действие нельзя отменить.');
  if (!confirmed) return;

  try {
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаление...';
    
    await deleteRecipe(recipeId);
    
    // Закрываем модальное окно
    const modal = buttonElement.closest('.modal');
    if (modal) {
      modal.remove();
    }
  } catch (err) {
    buttonElement.disabled = false;
    buttonElement.innerHTML = '<i class="fas fa-trash"></i> Удалить рецепт';
  }
}

// Обновляем функцию отображения рецептов
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

    if (recipes.length === 0) {
      recipesContainer.innerHTML = '<div class="no-recipes-message">Нет доступных рецептов</div>';
      return;
    }

    recipesContainer.innerHTML = recipes.map(recipe => `
      <div class="recipe-card">
        <div class="recipe-header">
          <h3 class="recipe-title">${recipe.title}</h3>
          <div class="recipe-meta">
            <span><i class="fas fa-globe"></i> ${translateCuisine(recipe.cuisine)}</span>
            <span><i class="fas fa-clock"></i> ${recipe.cooking_time} мин</span>
          </div>
        </div>
        <div class="recipe-body">
          <div class="chef-info">
            <div class="chef-avatar">${recipe.chef.charAt(0).toUpperCase()}</div>
            <div class="chef-details">
              <button onclick="showChefContextMenu(event, ${recipe.chef_id}, '${recipe.chef}', ${recipe.isSubscribed})" class="btn-link chef-name">
                ${recipe.chef}
                <i class="fas fa-chevron-down"></i>
              </button>
            </div>
          </div>
          <p class="recipe-description">${recipe.description}</p>
          <div class="recipe-details">
            <div><i class="fas fa-signal"></i> Сложность: ${translateDifficulty(recipe.difficulty)}</div>
            <div><i class="fas fa-utensils"></i> Тип: ${translateType(recipe.type)}</div>
          </div>
        </div>
        <div class="recipe-footer">
          <div class="recipe-actions">
            <button onclick="showRecipeDetails(${recipe.id})" class="btn btn-primary btn-small">
              <i class="fas fa-book-open"></i> Подробнее
            </button>
            ${recipe.chef_id === currentUser.id ? `
              <button onclick="deleteRecipe(${recipe.id})" class="btn btn-danger btn-small">
                <i class="fas fa-trash"></i> Удалить
              </button>
            ` : ''}
          </div>
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

// Обработка отправки формы рецепта
const recipeFormElement = document.getElementById('recipe-form');
if (recipeFormElement) {
  recipeFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
      // Собираем данные формы
      const formData = new FormData(e.target);
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
        ingredients: Array.from(e.target.querySelectorAll('.ingredient-item')).map(item => ({
          name: item.querySelector('input[type="text"]').value.trim(),
          amount: parseFloat(item.querySelector('input[type="number"]').value),
          unit: item.querySelector('select').value
        })),

        // Собираем шаги
        steps: Array.from(e.target.querySelectorAll('.step-item')).map((item, index) => ({
          step_number: index + 1,
          description: item.querySelector('textarea').value.trim(),
          tip: item.querySelector('input[type="text"]').value.trim() || null
        }))
      };

      // Валидация данных
      if (!jsonData.chef_id) {
        throw new Error('Пожалуйста, выберите шеф-повара');
      }

      if (!jsonData.title || !jsonData.description || !jsonData.cuisine || 
          !jsonData.type || !jsonData.difficulty || !jsonData.cooking_time) {
        throw new Error('Пожалуйста, заполните все обязательные поля');
      }

      if (jsonData.ingredients.length === 0) {
        throw new Error('Добавьте хотя бы один ингредиент');
      }

      if (jsonData.steps.length === 0) {
        throw new Error('Добавьте хотя бы один шаг приготовления');
      }

      // Проверяем корректность данных ингредиентов
      const invalidIngredients = jsonData.ingredients.filter(ing => 
        !ing.name || !ing.amount || !ing.unit
      );
      if (invalidIngredients.length > 0) {
        throw new Error('Пожалуйста, заполните все поля для каждого ингредиента');
      }

      // Проверяем корректность данных шагов
      const invalidSteps = jsonData.steps.filter(step => !step.description);
      if (invalidSteps.length > 0) {
        throw new Error('Пожалуйста, заполните описание для каждого шага');
      }

      console.log('Отправляемые данные:', jsonData);

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(jsonData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Ошибка при сохранении рецепта');
      }

      showNotification('Рецепт успешно сохранен', 'success');
      hideRecipeForm();
      loadRecipes(); // Перезагружаем список рецептов
    } catch (error) {
      console.error('Ошибка при сохранении рецепта:', error);
      showNotification(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить рецепт';
    }
  });
}

// Функция загрузки подписок для профиля
async function loadSubscriptions() {
  try {
    const response = await fetch('http://localhost:3000/api/profile/subscriptions', {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить подписки');
    }

    const subscriptions = await response.json();
    const subscriptionsContainer = document.getElementById('subscriptions-list');
    
    if (!subscriptionsContainer) {
      console.error('Контейнер для подписок не найден');
      return;
    }

    if (subscriptions.length === 0) {
      subscriptionsContainer.innerHTML = '<p class="no-data">Вы пока не подписаны ни на одного шеф-повара</p>';
      return;
    }

    subscriptionsContainer.innerHTML = subscriptions.map(chef => `
      <div class="chef-card">
        <div class="chef-avatar">${chef.name.charAt(0).toUpperCase()}</div>
        <div class="chef-info">
          <h4>${chef.name}</h4>
          <p class="chef-specialization">${chef.specialization || ''}</p>
          <div class="chef-stats">
            <span><i class="fas fa-book"></i> ${chef.recipes_count} рецептов</span>
            <span><i class="fas fa-users"></i> ${chef.subscribers_count} подписчиков</span>
          </div>
          <button 
            onclick="toggleChefSubscription(${chef.id}, this)" 
            class="btn btn-secondary subscribed"
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

// Добавляем функцию для отображения контекстного меню шеф-повара
function showChefContextMenu(event, chefId, chefName, isSubscribed) {
  event.preventDefault();
  event.stopPropagation();

  // Удаляем существующее меню, если оно есть
  const existingMenu = document.querySelector('.chef-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // Создаем новое контекстное меню
  const menu = document.createElement('div');
  menu.className = 'chef-context-menu';
  menu.innerHTML = `
    <div class="chef-context-header">
      <div class="chef-avatar">${chefName.charAt(0).toUpperCase()}</div>
      <h3>${chefName}</h3>
    </div>
    <div class="chef-context-body">
      <div class="chef-stats">
        <div class="stat-item">
          <i class="fas fa-book"></i>
          <span class="recipes-count">Загрузка...</span>
        </div>
        <div class="stat-item">
          <i class="fas fa-users"></i>
          <span class="subscribers-count">Загрузка...</span>
        </div>
      </div>
      <button 
        onclick="toggleChefSubscription(${chefId}, this)" 
        class="btn ${isSubscribed ? 'btn-secondary subscribed' : 'btn-primary'}"
      >
        <i class="fas fa-${isSubscribed ? 'user-minus' : 'user-plus'}"></i>
        ${isSubscribed ? 'Отписаться' : 'Подписаться'}
      </button>
    </div>
  `;

  // Позиционируем меню
  const rect = event.target.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
  menu.style.left = `${rect.left + window.scrollX}px`;

  // Добавляем меню в DOM
  document.body.appendChild(menu);

  // Загружаем статистику шеф-повара
  fetch(`http://localhost:3000/api/chefs/${chefId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  })
  .then(response => response.json())
  .then(chef => {
    menu.querySelector('.recipes-count').textContent = `${chef.recipes_count} рецептов`;
    menu.querySelector('.subscribers-count').textContent = `${chef.subscribers_count} подписчиков`;
  })
  .catch(err => {
    console.error('Ошибка при загрузке статистики шеф-повара:', err);
  });

  // Закрываем меню при клике вне его
  const closeMenu = (e) => {
    if (!menu.contains(e.target) && !e.target.matches('.btn-link.chef-name')) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  // Добавляем небольшую задержку, чтобы избежать немедленного закрытия
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
}

async function toggleFavorite(recipeId) {
  try {
    // Находим все кнопки для этого рецепта
    const buttons = document.querySelectorAll(`button[onclick*="toggleFavorite(${recipeId})"]`);
    const icons = document.querySelectorAll(`button[onclick*="toggleFavorite(${recipeId})"] i`);
    
    // Добавляем анимацию загрузки
    buttons.forEach(btn => {
      btn.disabled = true;
      const icon = btn.querySelector('i');
      icon.className = 'fas fa-spinner fa-spin';
    });

    const response = await fetch(`http://localhost:3000/api/recipes/${recipeId}/favorite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка при обновлении избранного');
    }

    const data = await response.json();
    
    // Обновляем все кнопки для этого рецепта на странице
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.classList.toggle('favorite', data.isFavorite);
      const icon = btn.querySelector('i');
      icon.className = 'fas fa-heart';
      if (data.isFavorite) {
        icon.classList.add('favorite');
        // Добавляем анимацию сердца
        icon.style.animation = 'none';
        icon.offsetHeight; // Trigger reflow
        icon.style.animation = 'heartBeat 0.3s ease-in-out';
      }
    });

    // Показываем уведомление
    showNotification(data.message, 'success');

    // Если открыт список избранного, обновляем его
    const favoritesList = document.getElementById('favorite-recipes');
    if (favoritesList) {
      if (!data.isFavorite) {
        // Если удаляем из избранного, анимируем удаление карточки
        const card = favoritesList.querySelector(`[data-recipe-id="${recipeId}"]`);
        if (card) {
          card.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => {
            card.remove();
            // Проверяем, остались ли ещё рецепты
            if (!favoritesList.querySelector('.favorite-recipe-card')) {
              favoritesList.innerHTML = '<div class="no-favorites">У вас пока нет избранных рецептов</div>';
            }
          }, 300);
        }
      } else {
        // Если добавляем в избранное, обновляем весь список
        loadFavoriteRecipes();
      }
    }
  } catch (err) {
    console.error('Ошибка при обновлении избранного:', err);
    showNotification(err.message, 'error');
    
    // Восстанавливаем состояние кнопок при ошибке
    buttons.forEach(btn => {
      btn.disabled = false;
      const icon = btn.querySelector('i');
      icon.className = 'fas fa-heart';
      if (btn.classList.contains('favorite')) {
        icon.classList.add('favorite');
      }
    });
  }
}

async function loadFavoriteRecipes() {
  try {
    const container = document.getElementById('favorite-recipes');
    if (!container) {
      console.error('Контейнер для избранных рецептов не найден');
      return;
    }

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка избранных рецептов...</div>';

    console.log('Загрузка избранных рецептов...');
    const response = await fetch('http://localhost:3000/api/recipes/favorites', {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Статус ответа:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Не удалось загрузить избранные рецепты');
    }

    const recipes = await response.json();
    console.log('Полученные избранные рецепты:', recipes);
    
    if (!Array.isArray(recipes) || recipes.length === 0) {
      container.innerHTML = '<div class="no-favorites">У вас пока нет избранных рецептов</div>';
      return;
    }

    container.innerHTML = recipes.map(recipe => `
      <div class="favorite-recipe-card" data-recipe-id="${recipe.id}">
        <div class="favorite-recipe-header">
          <h4>${recipe.title}</h4>
          <button onclick="toggleFavorite(${recipe.id})" class="btn-icon favorite" title="Удалить из избранного">
            <i class="fas fa-heart favorite"></i>
          </button>
        </div>
        <div class="favorite-recipe-meta">
          <span><i class="fas fa-globe"></i> ${translateCuisine(recipe.cuisine)}</span>
          <span><i class="fas fa-clock"></i> ${recipe.cooking_time} мин</span>
          <span><i class="fas fa-signal"></i> ${translateDifficulty(recipe.difficulty)}</span>
        </div>
        <div class="favorite-recipe-chef">
          <div class="chef-avatar">${recipe.chef_name.charAt(0).toUpperCase()}</div>
          <span>${recipe.chef_name}</span>
        </div>
        <p class="recipe-description">${recipe.description}</p>
        <div class="favorite-recipe-actions">
          <button onclick="showRecipeDetails(${recipe.id})" class="btn btn-primary btn-small">
            <i class="fas fa-book-open"></i> Подробнее
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Ошибка при загрузке избранных рецептов:', err);
    const container = document.getElementById('favorite-recipes');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          ${err.message}
        </div>
      `;
    }
    showNotification(err.message, 'error');
  }
}
