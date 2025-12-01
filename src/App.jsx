import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, Loader2, Trash2, Download } from 'lucide-react';

export default function PDFChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pdfText, setPdfText] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const extractTextFromPDF = async (file) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const text = new TextDecoder('utf-8').decode(uint8Array);
      
      const cleanText = text
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return cleanText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      return '';
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfName(file.name);
      const extractedText = await extractTextFromPDF(file);
      setPdfText(extractedText);
      
      setMessages([{
        type: 'system',
        content: `PDF "${file.name}" uploaded successfully! You can now ask questions about its content.`
      }]);
    } else {
      alert('Please upload a valid PDF file.');
    }
  };

  const generateAIResponse = async (userQuery, context) => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Based on the following PDF content, please answer the user's question accurately and concisely.

PDF Content:
${context.substring(0, 8000)}

User Question: ${userQuery}

Please provide a clear, informative response. If the information isn't in the PDF, let the user know.`
          }]
        })
      });

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('AI API error:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (!pdfText) {
      setMessages([...messages, {
        type: 'user',
        content: input
      }, {
        type: 'bot',
        content: 'Please upload a PDF document first so I can answer questions about it.'
      }]);
      setInput('');
      return;
    }

    const userMessage = { type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiResponse = await generateAIResponse(input, pdfText);
    
    setMessages(prev => [...prev, {
      type: 'bot',
      content: aiResponse
    }]);
    setIsLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
    setPdfText('');
    setPdfName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Can you summarize the main points from the PDF?",
    "What are the key findings discussed?",
    "Extract all dates mentioned in the document",
    "List any recommendations provided"
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-md px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">AI PDF Chatbot</h1>
              <p className="text-sm text-gray-500">Upload a PDF and ask questions</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Upload className="w-5 h-5" />
              Upload PDF
            </div>
            {pdfName && (
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                {pdfName}
              </span>
            )}
            {isProcessing && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            )}
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {messages.length === 0 && !pdfText && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Welcome to AI PDF Chatbot
              </h2>
              <p className="text-gray-500 mb-6">
                Upload a PDF document to get started
              </p>
            </div>
          )}

          {messages.length === 0 && pdfText && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">Suggested Questions:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q)}
                    className="text-left p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm text-indigo-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.type === 'system'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-white text-gray-800 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={pdfText ? "Ask a question about the PDF..." : "Upload a PDF first..."}
            disabled={!pdfText || isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !pdfText || isLoading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
