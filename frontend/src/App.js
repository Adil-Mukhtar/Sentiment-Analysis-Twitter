import React, { useState, useEffect } from 'react';
import { Send, Heart, Frown, Trash2, TrendingUp, MessageCircle, BarChart3 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const App = () => {
  const [tweet, setTweet] = useState('');
  const [tweets, setTweets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch tweets on component mount
  useEffect(() => {
    fetchTweets();
    fetchStats();
  }, []);

  const fetchTweets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tweets`);
      const data = await response.json();
      if (response.ok) {
        setTweets(data.tweets);
      }
    } catch (err) {
      console.error('Error fetching tweets:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const analyzeTweet = async () => {
    if (!tweet.trim()) {
      setError('Please enter a tweet to analyze');
      return;
    }

    if (tweet.length > 280) {
      setError('Tweet must be 280 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: tweet }),
      });

      const data = await response.json();

      if (response.ok) {
        setTweet('');
        fetchTweets();
        fetchStats();
      } else {
        setError(data.error || 'Failed to analyze tweet');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const deleteTweet = async (tweetId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/delete/${tweetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTweets();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting tweet:', err);
    }
  };

  const getSentimentColor = (sentiment) => {
    return sentiment === 'positive' ? 'text-green-500' : 'text-red-500';
  };

  const getSentimentBg = (sentiment) => {
    return sentiment === 'positive' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  const getSentimentIcon = (sentiment) => {
    return sentiment === 'positive' ? <Heart className="w-4 h-4" /> : <Frown className="w-4 h-4" />;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <MessageCircle className="w-8 h-8 text-blue-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Twitter Sentiment Analysis
            </h1>
          </div>
          <p className="text-center text-gray-600 text-lg">
            Analyze the emotional tone of your tweets with AI-powered sentiment analysis
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Tweets</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_tweets}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Positive Tweets</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.sentiment_distribution.positive?.count || 0}
                  </p>
                </div>
                <Heart className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Negative Tweets</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.sentiment_distribution.negative?.count || 0}
                  </p>
                </div>
                <Frown className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* Tweet Input */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <span>Analyze Your Tweet</span>
          </h2>
          
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={tweet}
                onChange={(e) => setTweet(e.target.value)}
                placeholder="What's happening? Share your thoughts..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-lg transition-colors"
                rows={4}
                maxLength={280}
              />
              <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                {tweet.length}/280
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={analyzeTweet}
              disabled={loading || !tweet.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Analyze Sentiment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tweet History */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-8 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-blue-500" />
              <span>Tweet History</span>
            </h2>
            <p className="text-gray-600 mt-2">Your analyzed tweets with sentiment scores</p>
          </div>

          <div className="p-8">
            {tweets.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No tweets analyzed yet</p>
                <p className="text-gray-400">Start by writing your first tweet above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tweets.map((tweetItem) => (
                  <div
                    key={tweetItem.id}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${getSentimentBg(tweetItem.sentiment)}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`flex items-center space-x-2 ${getSentimentColor(tweetItem.sentiment)}`}>
                        {getSentimentIcon(tweetItem.sentiment)}
                        <span className="font-semibold capitalize">{tweetItem.sentiment}</span>
                        <span className="text-sm">({tweetItem.confidence}% confidence)</span>
                      </div>
                      <button
                        onClick={() => deleteTweet(tweetItem.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-gray-800 text-lg mb-3 leading-relaxed">{tweetItem.text}</p>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{formatTimestamp(tweetItem.timestamp)}</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${tweetItem.sentiment === 'positive' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="font-medium">{tweetItem.confidence}% confident</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-gray-500">
            Powered by Machine Learning • Built with React & Flask
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;