import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Upload, Trash2 } from 'lucide-react';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Accept': 'application/json',
  },
  // Important: Enable credentials if your backend requires them
  withCredentials: true,
});

const HomePage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setCurrentFile(file.name);
      setMessages(prev => [...prev, {
        type: 'system',
        content: `PDF "${file.name}" uploaded successfully. You can now ask questions about it!`
      }]);
    } catch (error) {
      console.error('Upload error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Error uploading PDF: ${error.message || 'Please try again.'}`
      }]);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
  
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setLoading(true);
  
    try {
      const payload = { question: userMessage };
      if (currentFile) {
        payload.context = currentFile;
      }
  
      const response = await api.post(`/ask`, payload);
  
      if (response.data.error) {
        throw new Error(response.data.error);
      }
  
      setMessages(prev => [...prev, {
        type: 'bot',
        content: response.data.answer
      }]);
    } catch (error) {
      console.error('Question error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Error getting response: ${error.message || 'Please try again.'}`
      }]);
    } finally {
      setLoading(false);
    }
  };
  

  const clearChat = async () => {
    if (!currentFile) return;
    
    try {
      const response = await api.get(`/clear`, {
        params: { context: currentFile }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setMessages([]);
      setCurrentFile(null);
    } catch (error) {
      console.error('Clear error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Error clearing chat: ${error.message || 'Please try again.'}`
      }]);
    }
  };

  // Rest of the component remains the same...
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl w-full mx-auto flex flex-col flex-grow">
        {/* Header */}
        <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-4 mb-4 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800">PDF Chatbot</h1>
          <p className="text-gray-600">Upload a PDF and ask questions about it</p>
        </div>

        {/* Chat Container */}
        <div className="flex-grow bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-4 mb-4 shadow-lg overflow-hidden flex flex-col">
          <div className="flex-grow overflow-y-auto space-y-4 mb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`animate-fade-in ${
                  message.type === 'user'
                    ? 'ml-auto bg-blue-500 text-white'
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : message.type === 'system'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-white text-gray-800'
                } rounded-lg p-3 max-w-[80%] shadow-md`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="flex space-x-2 p-3">
                <div className="animate-bounce bg-gray-400 rounded-full w-2 h-2"></div>
                <div className="animate-bounce bg-gray-400 rounded-full w-2 h-2 delay-100"></div>
                <div className="animate-bounce bg-gray-400 rounded-full w-2 h-2 delay-200"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  disabled={loading}  // ✅ Now only disables when loading, not when no file is uploaded
  placeholder="Ask a question..."
  className="flex-grow p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white bg-opacity-50 backdrop-blur-sm"
/>

            <button
              type="submit"
              
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        {/* Footer Controls */}
        <div className="flex justify-between items-center bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
              <Upload className="inline mr-2" size={20} />
              Upload PDF
            </label>
            {uploadProgress > 0 && (
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
          {currentFile && (
            <button
              onClick={clearChat}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="inline mr-2" size={20} />
              Clear Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;