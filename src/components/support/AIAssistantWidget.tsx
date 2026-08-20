import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Phone, 
  ExternalLink, 
  HelpCircle,
  Truck,
  ShieldCheck,
  CreditCard,
  Check,
  Copy,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  ChatMessage, 
  QUICK_SUGGESTIONS, 
  sendChatMessageToAI, 
  QuickSuggestion 
} from '../../services/aiAssistantService';

export const AIAssistantWidget: React.FC = () => {
  const { language, t, setActiveView } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: language === 'bn'
          ? `আসসালামু আলাইকুম! আমি **লুক্সোরা এআই কনসিয়ার্জ** (Luxora AI Assistant)।\n\nআপনাকে কীভাবে সহায়তা করতে পারি? আপনি আমাদের প্রিমিয়াম গ্যাজেট, ৬৪ জেলায় ডেলিভারি চার্জ (ঢাকা ৳৭০, সারাদেশে ৳১২০, ৫০০০ টাকার উপরে ফ্রি), বিকাশ/নগদ পেমেন্ট অথবা ৭ দিনের ওয়ারেন্টি সম্পর্কে জানতে পারেন।`
          : `Welcome to **Luxora BD AI Concierge**!\n\nI can assist you with product specifications, nationwide delivery rates (Dhaka ৳70, Nationwide ৳120, Free above ৳5,000), bKash/Nagad payments, real-time courier tracking, and our official brand warranty. How may I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const aiReply = await sendChatMessageToAI(text, messages, language);
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: language === 'bn' 
          ? 'দুঃখিত, সংযোগে কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা আমাদের হোয়াটসঅ্যাপে (+880 1700-000000) যোগাযোগ করুন।'
          : 'I encountered an unexpected issue connecting to the server. Please try again or reach our WhatsApp helpline (+880 1700-000000).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSuggestion = (suggestion: QuickSuggestion) => {
    const query = language === 'bn' ? suggestion.textBn : suggestion.textEn;
    handleSendMessage(query);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: language === 'bn'
          ? `আসসালামু আলাইকুম! চ্যাট রিসেট করা হয়েছে। আমি আপনাকে কীভাবে সহায়তা করতে পারি?`
          : `Chat restarted. How may I assist you with Luxora BD's products or services today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const formatMessageText = (text: string) => {
    // Simple markdown-style bold and bullet parser for crisp display
    return text.split('\n').map((line, lineIdx) => {
      // Bold replacer
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx} className="gold-text font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <p key={lineIdx} className={line === '' ? 'h-2' : 'leading-relaxed'}>
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40"
        >
          <div className="relative group">
            {/* Tooltip badge on hover */}
            <div className="absolute right-0 bottom-full mb-3 hidden group-hover:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121218] border border-[#D4AF37]/40 shadow-2xl text-xs text-white whitespace-nowrap pointer-events-none transition-all">
              <span className="inline-block w-1.5 h-1.5 rounded-full gold-bg animate-ping" />
              <span>{language === 'bn' ? 'লুক্সোরা এআই কনসিয়ার্জ • ২৪/৭ সহায়তা' : 'Luxora AI Assistant • 24/7 Concierge'}</span>
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full gold-bg text-black shadow-2xl shadow-[#D4AF37]/30 flex items-center justify-center hover:scale-110 hover:brightness-110 active:scale-95 transition-all duration-300 cursor-pointer border border-[#E5C158]"
              aria-label="Open AI Assistant"
            >
              <div className="relative">
                <Bot className="w-6 h-6" />
                <Sparkles className="w-3.5 h-3.5 absolute -top-1.5 -right-1.5 text-black animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {/* Floating Glassmorphism Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-4 md:bottom-8 right-4 md:right-8 z-50 w-[calc(100vw-32px)] sm:w-[420px] rounded-3xl bg-[#0D0D12]/95 backdrop-blur-2xl border border-[#262636] shadow-2xl shadow-black/90 flex flex-col overflow-hidden text-[#EDEDED] ${
              isMinimized ? 'h-[72px]' : 'h-[580px] max-h-[85vh]'
            }`}
          >
            {/* Luxury Header */}
            <div className="p-4 bg-[#14141C] border-b border-[#222230] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl gold-bg text-black flex items-center justify-center font-bold shadow-md shadow-[#D4AF37]/20">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#14141C]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white font-luxury">
                      Luxora AI Concierge
                    </h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 font-bold">
                      24/7
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{language === 'bn' ? 'অনলাইন • তাৎক্ষণিক উত্তর' : 'Online • Instant Responses'}</span>
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 text-gray-400">
                <button
                  onClick={handleResetChat}
                  className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  title="Reset conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body (when not minimized) */}
            {!isMinimized && (
              <>
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans scroll-smooth">
                  {messages.map((msg) => {
                    const isAi = msg.sender === 'assistant';

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                      >
                        {isAi && (
                          <div className="w-7 h-7 rounded-xl gold-bg text-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className={`max-w-[82%] space-y-1 ${isAi ? 'items-start' : 'items-end'}`}>
                          <div
                            className={`p-3.5 rounded-2xl ${
                              isAi
                                ? 'bg-[#181822] border border-[#2A2A3A] text-gray-200 shadow-md'
                                : 'gold-bg text-black font-medium shadow-md shadow-[#D4AF37]/15 rounded-tr-none'
                            }`}
                          >
                            <div className="space-y-1">
                              {formatMessageText(msg.text)}
                            </div>
                          </div>
                          <span className={`text-[10px] text-gray-500 block px-1 ${isAi ? 'text-left' : 'text-right'}`}>
                            {msg.timestamp}
                          </span>
                        </div>

                        {!isAi && (
                          <div className="w-7 h-7 rounded-xl bg-[#262636] text-white flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-gray-400 text-xs"
                    >
                      <div className="w-7 h-7 rounded-xl gold-bg text-black flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="p-3 rounded-2xl bg-[#181822] border border-[#2A2A3A] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full gold-bg animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full gold-bg animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full gold-bg animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[11px] text-gray-400 ml-1.5">{language === 'bn' ? 'উত্তর তৈরি হচ্ছে...' : 'Formulating response...'}</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="px-4 py-2 border-t border-[#1C1C26] bg-[#101016]">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    {QUICK_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug.id}
                        onClick={() => handleQuickSuggestion(sug)}
                        className="px-2.5 py-1 rounded-full bg-[#181822] hover:bg-[#222232] border border-[#2E2E40] hover:border-[#D4AF37] text-gray-300 hover:text-white whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                      >
                        {language === 'bn' ? sug.textBn : sug.textEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Bar & Footer */}
                <div className="p-3.5 bg-[#14141C] border-t border-[#222230] space-y-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={language === 'bn' ? 'যেকোনো প্রশ্ন লিখুন...' : 'Ask about products, delivery, warranty...'}
                      className="flex-1 bg-[#0C0C10] border border-[#2A2A38] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || isLoading}
                      className="p-2.5 rounded-xl gold-bg text-black hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md shadow-[#D4AF37]/20"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Direct Contact Bridge */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                    <div className="flex items-center gap-3">
                      <a
                        href="https://wa.me/8801700000000"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>WhatsApp Helpline</span>
                      </a>
                      <span>•</span>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          setActiveView('track');
                        }}
                        className="text-[#D4AF37] hover:underline"
                      >
                        {language === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Orders'}
                      </button>
                    </div>
                    <span className="font-mono">Powered by Gemini AI</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
