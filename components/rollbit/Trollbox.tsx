'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Shield, Sparkles, User, ChevronRight, Users } from 'lucide-react';
import { truncateHash } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  sender_address: string;
  sender_vip: string;
  message: string;
  created_at: string;
}

interface TrollboxProps {
  isOpen: boolean;
  onClose: () => void;
  userWallet: string;
  userVip: string;
}

const VIP_COLORS: Record<string, string> = {
  Bronze: 'text-amber-600 border-amber-600/30 bg-amber-600/10',
  Silver: 'text-slate-300 border-slate-400/30 bg-slate-400/10',
  Gold: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  Platinum: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  Diamond: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
};

export default function Trollbox({ isOpen, onClose, userWallet, userVip }: TrollboxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(24);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/trollbox');
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    // 1. Initial snapshot fetch
    fetchMessages();

    // 2. Realtime WebSocket subscription via Supabase
    if (supabase) {
      const client = supabase;
      const channel = client.channel('global_trollbox', {
        config: {
          broadcast: { self: true },
          presence: { key: userWallet || 'anon_' + Math.random().toString(36).substring(7) },
        },
      });

      channel
        .on('broadcast', { event: 'new_message' }, (payload) => {
          if (payload.payload) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.payload.id)) return prev;
              return [...prev, payload.payload];
            });
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setOnlineCount(Math.max(12, count * 3));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              wallet: userWallet || 'Anon',
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        client.removeChannel(channel);
      };
    } else {
      // Fallback polling if Supabase is offline
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [userWallet]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/trollbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: userWallet || 'Anon_' + Math.random().toString(36).substring(7),
          vip: userVip || 'Bronze',
          message: inputMessage.trim(),
        }),
      });
      if (res.ok) {
        setInputMessage('');
        fetchMessages();
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-heading text-xs font-bold text-foreground">Global Trollbox</span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{onlineCount} Online</span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 font-body text-xs">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${VIP_COLORS[msg.sender_vip] || VIP_COLORS.Bronze}`}>
                  {msg.sender_vip}
                </span>
                <span className="font-mono text-slate-300 font-medium">
                  {truncateHash(msg.sender_address, 4, 3)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-slate-200 break-words leading-relaxed pl-1">
              {msg.message}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          placeholder={userWallet ? "Send message..." : "Connect wallet to chat"}
          value={inputMessage}
          maxLength={200}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-body text-foreground focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isSending}
          className="px-3 py-2 bg-primary hover:bg-amber-500 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition-colors flex items-center justify-center shadow-md shadow-amber-500/20"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
