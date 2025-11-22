import React, { useState, useEffect } from 'react';
import { analyzeInventory, chatWithAssistant } from '../services/geminiService';
import { Tire } from '../types';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  inventory: Tire[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ inventory }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoadingAnalysis(true);
    const result = await analyzeInventory(inventory);
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = inputMessage;
    setInputMessage('');
    
    setChatHistory(prev => [...prev, newMessage]);
    setChatLoading(true);

    // Pass current history *excluding* the new message for context building if needed, 
    // but for simplicity in this demo we just append.
    const response = await chatWithAssistant(chatHistory, newMessage, inventory);
    
    setChatHistory(prev => [...prev, response]);
    setChatLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
      
      {/* Left Panel: Inventory Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-800">Análise Inteligente</h2>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loadingAnalysis}
            className="flex items-center gap-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingAnalysis ? 'animate-spin' : ''}`} />
            {analysis ? 'Atualizar Análise' : 'Gerar Análise'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loadingAnalysis ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p>Analisando seu estoque com Gemini 2.5...</p>
            </div>
          ) : analysis ? (
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center text-slate-500 mt-10">
              <p>Clique em "Gerar Análise" para obter um relatório executivo sobre sua frota de pneus.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Chat */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-700">Chat Assistente</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {chatHistory.length === 0 && (
             <div className="text-center text-slate-400 text-sm mt-10">
               <p>Pergunte sobre seu estoque, sugestões de manutenção ou especificações de pneus.</p>
               <p className="mt-2 text-xs italic">Ex: "Quantos pneus aro 16 eu tenho?"</p>
             </div>
          )}
          {chatHistory.map((msg, idx) => {
            const isUser = idx % 2 === 0;
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                  <ReactMarkdown>{msg}</ReactMarkdown>
                </div>
              </div>
            );
          })}
          {chatLoading && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-200 rounded-lg p-3 rounded-bl-none shadow-sm">
                 <div className="flex space-x-1">
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                 </div>
               </div>
             </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={chatLoading}
            />
            <button 
              type="submit"
              disabled={chatLoading || !inputMessage.trim()}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};