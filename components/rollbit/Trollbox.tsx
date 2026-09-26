'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Shield, Sparkles, User, ChevronRight, Users, CheckCircle2 } from 'lucide-react';
import { truncateHash } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  sender_address: string;
  sender_vip: string;
  message: string;
  created_at: string;
  verified?: boolean;
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

const LOCAL_STORAGE_KEY = 'cypher_trollbox_messages_cache_v2';

export default function Trollbox({ isOpen, onClose, userWallet, userVip }: TrollboxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Load persisted messages from localStorage on mount so messages never vanish
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load cached trollbox messages:', err);
      }
    }
  }, []);

  // Helper to merge messages without duplicates and persist to localStorage
  const mergeAndSaveMessages = (incomingList: ChatMessage[]) => {
    if (!incomingList || incomingList.length === 0) return;

    setMessages((prev) => {
      const messageMap = new Map<string, ChatMessage>();
      // Preserve existing
      prev.forEach((m) => messageMap.set(m.id, m));
      // Add incoming
      incomingList.forEach((m) => messageMap.set(m.id, m));

      const merged = Array.from(messageMap.values())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-60);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/trollbox');
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        mergeAndSaveMessages(data.messages);
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
            mergeAndSaveMessages([payload.payload]);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setOnlineCount(count || 1);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              wallet: userWallet || 'Anon',
              online_at: new Date().toISOString(),
            });
          }
        });

      // Background sync interval (ensures chat updates regularly)
      const pollInterval = setInterval(fetchMessages, 4000);

      return () => {
        clearInterval(pollInterval);
        client.removeChannel(channel);
      };
    } else {
      // Fallback polling if Supabase is unconfigured
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
    const originalMessage = inputMessage;
    setInputMessage('');
    
    try {
      const res = await fetch('/api/trollbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: originalMessage.trim(),
          walletAddress: userWallet || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setInputMessage(originalMessage);
        alert(data.error || 'Failed to send message');
      } else if (data.message) {
        // Immediately commit to state and storage
        mergeAndSaveMessages([data.message]);
      } else {
        fetchMessages();
      }
    } catch {
      setInputMessage(originalMessage);
      alert('Network error. Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 h-[520px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-xs font-bold text-foreground">Global Trollbox</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{onlineCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400/90 mt-0.5">
              <Shield className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              <span>AES-256-GCM · SHA-256 HMAC</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-foreground transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 font-body text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 p-4">
            <MessageSquare className="w-8 h-8 text-slate-700" />
            <p className="text-xs">No chat messages yet.</p>
            <p className="text-[10px] text-slate-600 font-mono">Be the first to speak in the global lobby!</p>
          </div>
        ) : (
          messages.map((msg) => (
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
                <div className="flex items-center gap-1.5">
                  {msg.verified && (
                    <span
                      title="Cryptographically verified via SHA-256 HMAC signature"
                      className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/30 flex items-center gap-0.5"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>verified</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <p className="text-slate-200 break-words leading-relaxed pl-1">
                {msg.message}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={userWallet ? `Chat as ${truncateHash(userWallet, 4, 3)}...` : "Connect wallet to chat"}
            value={inputMessage}
            disabled={!userWallet}
            maxLength={200}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-body text-foreground focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!userWallet || !inputMessage.trim() || isSending}
            className="px-3 py-2 bg-primary hover:bg-amber-500 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition-colors flex items-center justify-center shadow-md shadow-amber-500/20"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        {!userWallet && (
          <p className="text-[10px] text-amber-400 font-mono text-center">
            ⚠️ Connect your wallet in the top bar to participate in chat.
          </p>
        )}
      </form>
    </div>
  );
}
