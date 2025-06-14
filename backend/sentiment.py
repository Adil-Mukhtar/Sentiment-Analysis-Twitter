#!/usr/bin/env python3
"""
Flask API Backend for Twitter Sentiment Analysis
This API serves the trained sentiment analysis model and stores tweet history
"""

import os
import pickle
import re
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from nltk.corpus import stopwords
from nltk.stem.porter import PorterStemmer
import nltk

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global variables for model and preprocessing
model = None
vectorizer = None
port_stem = None
stop_words = None

def init_nltk():
    """Initialize NLTK components"""
    global port_stem, stop_words
    try:
        nltk.download('stopwords', quiet=True)
        port_stem = PorterStemmer()
        stop_words = set(stopwords.words('english'))
        print("✅ NLTK initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error initializing NLTK: {e}")
        return False

def load_models():
    """Load the trained model and vectorizer"""
    global model, vectorizer
    try:
        model = pickle.load(open('trained_model.sav', 'rb'))
        vectorizer = pickle.load(open('vectorizer.sav', 'rb'))
        print("✅ Models loaded successfully")
        return True
    except FileNotFoundError:
        print("❌ Model files not found. Please train the model first.")
        return False
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False

def init_database():
    """Initialize SQLite database for storing tweets"""
    try:
        conn = sqlite3.connect('tweets.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tweets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                sentiment TEXT NOT NULL,
                confidence REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        print("✅ Database initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False

def preprocess_text(content):
    """
    Preprocess text for sentiment analysis
    Same preprocessing as used in training
    """
    global port_stem, stop_words
    
    if not port_stem or not stop_words:
        return content
    
    # Remove all non-alphabetic characters
    stemmed_content = re.sub('[^a-zA-Z]', ' ', content)
    
    # Convert to lowercase
    stemmed_content = stemmed_content.lower()
    
    # Split into words
    stemmed_content = stemmed_content.split()
    
    # Remove stopwords and apply stemming
    stemmed_content = [
        port_stem.stem(word) for word in stemmed_content 
        if word not in stop_words
    ]
    
    # Join words back into string
    stemmed_content = ' '.join(stemmed_content)
    
    return stemmed_content

def predict_sentiment(text):
    """Predict sentiment for given text"""
    global model, vectorizer
    
    if not model or not vectorizer:
        return None, 0
    
    try:
        # Preprocess the text
        processed_text = preprocess_text(text)
        
        # Vectorize the text
        text_vector = vectorizer.transform([processed_text])
        
        # Make prediction
        prediction = model.predict(text_vector)
        probability = model.predict_proba(text_vector)[0]
        
        sentiment = "positive" if prediction[0] == 1 else "negative"
        confidence = max(probability) * 100
        
        return sentiment, confidence
    except Exception as e:
        print(f"Error in prediction: {e}")
        return None, 0

def save_tweet_to_db(text, sentiment, confidence):
    """Save tweet to database"""
    try:
        conn = sqlite3.connect('tweets.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO tweets (text, sentiment, confidence)
            VALUES (?, ?, ?)
        ''', (text, sentiment, confidence))
        
        tweet_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return tweet_id
    except Exception as e:
        print(f"Error saving tweet: {e}")
        return None

def get_tweets_from_db(limit=50):
    """Get tweets from database"""
    try:
        conn = sqlite3.connect('tweets.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, text, sentiment, confidence, timestamp
            FROM tweets
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))
        
        tweets = []
        for row in cursor.fetchall():
            tweets.append({
                'id': row[0],
                'text': row[1],
                'sentiment': row[2],
                'confidence': round(row[3], 2),
                'timestamp': row[4]
            })
        
        conn.close()
        return tweets
    except Exception as e:
        print(f"Error fetching tweets: {e}")
        return []

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Sentiment Analysis API is running',
        'models_loaded': model is not None and vectorizer is not None
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_sentiment():
    """Analyze sentiment of a tweet"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Tweet text is required'}), 400
        
        tweet_text = data['text'].strip()
        
        if not tweet_text:
            return jsonify({'error': 'Tweet text cannot be empty'}), 400
        
        if len(tweet_text) > 280:  # Twitter character limit
            return jsonify({'error': 'Tweet text too long (max 280 characters)'}), 400
        
        # Predict sentiment
        sentiment, confidence = predict_sentiment(tweet_text)
        
        if sentiment is None:
            return jsonify({'error': 'Failed to analyze sentiment'}), 500
        
        # Save to database
        tweet_id = save_tweet_to_db(tweet_text, sentiment, confidence)
        
        if tweet_id is None:
            return jsonify({'error': 'Failed to save tweet'}), 500
        
        return jsonify({
            'id': tweet_id,
            'text': tweet_text,
            'sentiment': sentiment,
            'confidence': round(confidence, 2),
            'message': 'Sentiment analyzed successfully'
        })
        
    except Exception as e:
        print(f"Error in analyze endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/tweets', methods=['GET'])
def get_tweets():
    """Get all tweets with their sentiment analysis"""
    try:
        limit = request.args.get('limit', 50, type=int)
        limit = min(limit, 100)  # Max 100 tweets per request
        
        tweets = get_tweets_from_db(limit)
        
        return jsonify({
            'tweets': tweets,
            'count': len(tweets)
        })
        
    except Exception as e:
        print(f"Error in get_tweets endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get sentiment analysis statistics"""
    try:
        conn = sqlite3.connect('tweets.db')
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute('SELECT COUNT(*) FROM tweets')
        total_tweets = cursor.fetchone()[0]
        
        # Get sentiment distribution
        cursor.execute('''
            SELECT sentiment, COUNT(*) as count, AVG(confidence) as avg_confidence
            FROM tweets
            GROUP BY sentiment
        ''')
        
        sentiment_stats = {}
        for row in cursor.fetchall():
            sentiment_stats[row[0]] = {
                'count': row[1],
                'avg_confidence': round(row[2], 2) if row[2] else 0
            }
        
        conn.close()
        
        return jsonify({
            'total_tweets': total_tweets,
            'sentiment_distribution': sentiment_stats
        })
        
    except Exception as e:
        print(f"Error in stats endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/delete/<int:tweet_id>', methods=['DELETE'])
def delete_tweet(tweet_id):
    """Delete a tweet"""
    try:
        conn = sqlite3.connect('tweets.db')
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM tweets WHERE id = ?', (tweet_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Tweet not found'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Tweet deleted successfully'})
        
    except Exception as e:
        print(f"Error in delete endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🚀 Starting Sentiment Analysis API...")
    
    # Initialize components
    if not init_nltk():
        print("❌ Failed to initialize NLTK. Exiting.")
        exit(1)
    
    if not load_models():
        print("❌ Failed to load models. Please train the model first.")
        print("Run sentiment_analysis.py to train the model.")
        exit(1)
    
    if not init_database():
        print("❌ Failed to initialize database. Exiting.")
        exit(1)
    
    print("✅ All components initialized successfully")
    print("🌐 API will be available at: http://localhost:5000")
    print("📋 API Endpoints:")
    print("   POST /api/analyze - Analyze sentiment")
    print("   GET  /api/tweets  - Get all tweets")
    print("   GET  /api/stats   - Get statistics")
    print("   GET  /api/health  - Health check")
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)