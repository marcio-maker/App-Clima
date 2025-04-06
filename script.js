// Configurações
const API_BASE_URL = '/api/guest';

// Funções de Utilitário
const showNotification = (message, isSuccess = false) => {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    if (isSuccess) notification.classList.add('success');
    
    setTimeout(() => {
        notification.classList.remove('show', 'success');
    }, 3000);
};

const setBackgroundGradient = (temp) => {
    let color1, color2;
    
    if (temp < 0) {
        color1 = '#1e3c72';
        color2 = '#2a5298';
    } else if (temp < 10) {
        color1 = '#0052D4';
        color2 = '#65C7F7';
    } else if (temp < 20) {
        color1 = '#00b4db';
        color2 = '#0083b0';
    } else if (temp < 30) {
        color1 = '#FF8008';
        color2 = '#FFC837';
    } else {
        color1 = '#FF416C';
        color2 = '#FF4B2B';
    }
    
    document.documentElement.style.setProperty('--primary-color', color1);
    document.documentElement.style.setProperty('--secondary-color', color2);
};

const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });
};

const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getHourFromDate = (dateString) => {
    const date = new Date(dateString);
    return formatTime(date);
};

// Funções de Atualização da UI
const updateCurrentWeather = (data) => {
    document.getElementById('location').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('current-date').textContent = formatDate(new Date());
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('weather-description').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}°C`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    
    const weatherIcon = document.getElementById('weather-icon');
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    weatherIcon.alt = data.weather[0].description;
    
    setBackgroundGradient(data.main.temp);
};

const updateHourlyForecast = (data) => {
    const hourlyContainer = document.getElementById('hourly-forecast');
    hourlyContainer.innerHTML = '';
    
    // Pegar apenas as próximas 12 horas
    const next12Hours = data.list.slice(0, 4);
    
    next12Hours.forEach(hour => {
        const hourItem = document.createElement('div');
        hourItem.className = 'hour-item';
        
        hourItem.innerHTML = `
            <div class="hour-time">${getHourFromDate(hour.dt_txt)}</div>
            <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}.png" 
                 alt="${hour.weather[0].description}" 
                 class="hour-icon">
            <div class="hour-temp">${Math.round(hour.main.temp)}°C</div>
        `;
        
        hourlyContainer.appendChild(hourItem);
    });
};

const updateDailyForecast = (data) => {
    const dailyContainer = document.getElementById('daily-forecast');
    dailyContainer.innerHTML = '';
    
    // Filtrar para uma previsão por dia (meio-dia)
    const dailyForecasts = data.list.filter(item => item.dt_txt.includes('12:00:00'));
    
    dailyForecasts.slice(0, 5).forEach(day => {
        const dayDate = new Date(day.dt * 1000);
        const dayItem = document.createElement('div');
        dayItem.className = 'day-item';
        
        dayItem.innerHTML = `
            <div class="day-name">${dayDate.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" 
                 alt="${day.weather[0].description}" 
                 class="day-icon">
            <div class="day-temp">${Math.round(day.main.temp)}°C</div>
            <div class="day-desc">${day.weather[0].description}</div>
        `;
        
        dailyContainer.appendChild(dayItem);
    });
};

// Funções Principais
const searchWeather = async () => {
    const city = document.getElementById('search-input').value.trim();
    if (!city) return;
    
    try {
        toggleLoading(true, 'Buscando dados meteorológicos...');
        
        const response = await fetch(`${API_BASE_URL}/weather?city=${encodeURIComponent(city)}`);
        
        if (!response.ok) throw new Error('Cidade não encontrada');
        
        const data = await response.json();
        updateCurrentWeather(data);
        
        // Buscar previsão
        const forecastResponse = await fetch(`${API_BASE_URL}/forecast?lat=${data.coord.lat}&lon=${data.coord.lon}`);
        
        if (!forecastResponse.ok) throw new Error('Erro ao buscar previsão');
        
        const forecastData = await forecastResponse.json();
        updateHourlyForecast(forecastData);
        updateDailyForecast(forecastData);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message);
    } finally {
        toggleLoading(false);
    }
};

const getWeatherByLocation = async () => {
    if (!navigator.geolocation) {
        showNotification('Geolocalização não suportada pelo navegador');
        return;
    }
    
    try {
        toggleLoading(true, 'Obtendo sua localização...');
        
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        const response = await fetch(`${API_BASE_URL}/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
        
        if (!response.ok) throw new Error('Erro ao obter dados de localização');
        
        const data = await response.json();
        updateCurrentWeather(data);
        
        // Buscar previsão
        const forecastResponse = await fetch(`${API_BASE_URL}/forecast?lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
        
        if (!forecastResponse.ok) throw new Error('Erro ao buscar previsão');
        
        const forecastData = await forecastResponse.json();
        updateHourlyForecast(forecastData);
        updateDailyForecast(forecastData);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message);
    } finally {
        toggleLoading(false);
    }
};

// Inicialização
const init = () => {
    // Atualizar relógio
    updateClock();
    setInterval(updateClock, 1000);
    
    // Configurar eventos
    setupEventListeners();
    
    // Carregar dados iniciais
    getWeatherByLocation();
};

const updateClock = () => {
    const now = new Date();
    document.getElementById('datetime').textContent = 
        `${formatTime(now)} | ${formatDate(now)}`;
};

const setupEventListeners = () => {
    // Eventos do aplicativo
    document.getElementById('search-btn').addEventListener('click', searchWeather);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchWeather();
    });
    
    document.getElementById('location-btn').addEventListener('click', getWeatherByLocation);
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const city = document.getElementById('search-input').value;
        if (city) searchWeather();
        else getWeatherByLocation();
    });
};

const toggleLoading = (show, message = '') => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (show) {
        loadingText.textContent = message;
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
};

// Iniciar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);