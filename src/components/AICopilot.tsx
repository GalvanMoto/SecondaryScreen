'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Trash2, Zap, Smartphone, CheckCircle2 } from 'lucide-react';

interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_called?: string;
  tool_args?: any;
  tool_result?: string;
  latency_ms?: number;
  timestamp?: number;
}

interface AICopilotProps {
  serial?: string;
  onActionExecuted?: () => void;
}

export default function AICopilot({ serial, onActionExecuted }: AICopilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "👋 Hello! I'm your integrated **ADB Copilot**. Talk to me naturally and I will execute the commands directly on your connected phone in real time with millisecond latency!\n\nTry clicking one of the quick commands below or type anything you want me to do.",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history from SQLite on mount
  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/adb/chat?serial=${encodeURIComponent(serial || '')}`);
      const data = await res.json();
      if (res.ok && data.history && data.history.length > 0) {
        setMessages(data.history);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [serial]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/adb/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, serial }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to execute command');

      const botMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        tool_called: data.toolCalled,
        tool_args: data.toolArgs,
        tool_result: data.toolResult,
        latency_ms: data.latencyMs,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (onActionExecuted) onActionExecuted();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${err.message || 'Could not execute command'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear AI chat history from SQLite database?')) return;
    try {
      await fetch('/api/adb/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', serial }),
      });
      setMessages([
        {
          role: 'assistant',
          content: "Chat history cleared. How can I help you operate your phone today?",
        },
      ]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const quickPrompts = [
    { label: '📸 Take Screenshot', prompt: 'take a screenshot' },
    { label: '🔊 Volume Up', prompt: 'turn volume up' },
    { label: '🔇 Mute Phone', prompt: 'mute volume' },
    { label: '🏠 Go Home', prompt: 'go home' },
    { label: '🔋 Check Battery', prompt: 'what is my battery status' },
    { label: '💾 Check Storage', prompt: 'how much storage is used' },
    { label: '🚀 Launch Settings', prompt: 'launch settings' },
    { label: '✍️ Type Text', prompt: 'type Hello from Antigravity Copilot' },
    { label: '💻 Shell Uptime', prompt: 'run shell uptime' },
  ];

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '640px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
            }}
          >
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>ADB AI Copilot & Voice Assistant</h2>
              <span className="badge-pill badge-purple" style={{ fontSize: '10px' }}>
                <Sparkles size={11} /> LIVE AI
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Natural language instruction parser executing ADB actions directly on your phone
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="op-btn"
          style={{ padding: '6px 10px', fontSize: '11px' }}
          title="Clear Conversation History"
        >
          <Trash2 size={13} />
          <span>Clear</span>
        </button>
      </div>

      {/* Quick Action Suggestion Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {quickPrompts.map((qp) => (
          <button
            key={qp.label}
            onClick={() => handleSend(qp.prompt)}
            disabled={loading}
            className="op-btn"
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Stream Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          paddingRight: '6px',
          marginBottom: '16px',
        }}
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              {/* Sender Label */}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isUser ? 'You' : 'ADB Copilot'}
                {msg.timestamp && ` • ${new Date(msg.timestamp).toLocaleTimeString()}`}
              </span>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: '82%',
                  padding: '12px 16px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                    : 'rgba(16, 24, 40, 0.85)',
                  border: `1px solid ${isUser ? 'rgba(59, 130, 246, 0.5)' : 'var(--border-subtle)'}`,
                  color: '#fff',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>

              {/* Tool Execution Badge if tool was called */}
              {msg.tool_called && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '11px',
                    color: '#34d399',
                    fontFamily: 'monospace',
                    marginTop: '2px',
                  }}
                >
                  <Zap size={11} color="#34d399" />
                  <span>Executed: <strong>{msg.tool_called}</strong></span>
                  {msg.latency_ms !== undefined && msg.latency_ms > 0 && (
                    <span style={{ color: '#fbbf24' }}>({msg.latency_ms} ms)</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading / Processing Indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)', fontSize: '13px' }}>
            <Sparkles size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
            <span>Analyzing intent & dispatching to phone...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: 'flex', gap: '10px' }}
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Ask me anything (e.g. 'turn volume up', 'take screenshot', 'open settings')..."
          className="glass-input"
          style={{ fontSize: '13px', padding: '12px 16px' }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || loading}
          className="op-btn op-btn-purple"
          style={{ padding: '0 20px', flexShrink: 0 }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
