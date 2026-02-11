'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useChatMessages, useLocalPlayer } from '../../stores/gameStore';
import { useGameActions } from '../../hooks/useGameActions';

export function LobbyChat() {
  const [input, setInput] = useState('');
  const messages = useChatMessages();
  const localPlayer = useLocalPlayer();
  const { sendMessage } = useGameActions();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[300px]">
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest">Chat</h3>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.length === 0 && (
          <p className="text-white/20 text-xs text-center mt-8">Aucun message</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.playerId === localPlayer?.id;
          return (
            <div key={`${msg.timestamp}-${i}`} className="text-sm">
              <span className={`font-bold ${isMe ? 'text-primary' : 'text-white/70'}`}>
                {msg.pseudo}
              </span>
              <span className="text-white/40 mx-1.5">:</span>
              <span className="text-white/80 break-words">{msg.message}</span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
            maxLength={200}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/30 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-2 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Envoyer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
