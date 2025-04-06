import os
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from functools import wraps
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta
import sqlite3
import hashlib
import jwt
from cachetools import TTLCache

# Configuração inicial
load_dotenv()
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configurações
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'super-secret-key')
API_KEY = os.getenv('OPENWEATHER_API_KEY')
BASE_URL = 'https://api.openweathermap.org/data/2.5'

# Cache (1 hora de duração)
weather_cache = TTLCache(maxsize=100, ttl=3600)

# Rotas da API
@app.route('/api/guest/weather', methods=['GET'])
def guest_get_weather():
    city = request.args.get('city')
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    cache_key = f"guest_weather_{city or f'{lat}_{lon}'}"
    cached_data = weather_cache.get(cache_key)
    if cached_data:
        return jsonify(cached_data)
    
    if city:
        url = f"{BASE_URL}/weather?q={city}&appid={API_KEY}&units=metric&lang=pt_br"
    elif lat and lon:
        url = f"{BASE_URL}/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=pt_br"
    else:
        return jsonify({"error": "Provide either 'city' or both 'lat' and 'lon' parameters"}), 400
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        weather_cache[cache_key] = data
        return jsonify(data)
    except requests.exceptions.HTTPError as err:
        return jsonify({"error": str(err)}), response.status_code
    except Exception as err:
        return jsonify({"error": str(err)}), 500

@app.route('/api/guest/forecast', methods=['GET'])
def guest_get_forecast():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({"error": "Valid 'lat' and 'lon' parameters are required"}), 400
    
    cache_key = f"guest_forecast_{lat}_{lon}"
    cached_data = weather_cache.get(cache_key)
    if cached_data:
        return jsonify(cached_data)
    
    try:
        url = f"{BASE_URL}/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=pt_br"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        weather_cache[cache_key] = data
        return jsonify(data)
    except requests.exceptions.HTTPError as err:
        return jsonify({"error": str(err)}), response.status_code
    except Exception as err:
        return jsonify({"error": str(err)}), 500

# Rota principal
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)