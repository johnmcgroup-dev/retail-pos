import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X, Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { KNOWLEDGE, getPageContext, SUGGESTIONS } from "./chatbotKnowledge";

const STORAGE_KEY = "pos_chatbot_history";

export default function ChatbotPanel({ onClose }) {
  const location = useLocation();
  const [messages, setMessages] = useState(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || typing) return;
    setInput("");
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setTyping(true);
    try {
      const history = next
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");
      const pageContext = getPageContext(location.pathname);
      const prompt =
        `You are the friendly in-app assistant for "My Retailer Pro", a multi-tenant Retail POS system (inventory, sales, customers, vendors, expenses, reporting, loyalty, online store).\n\n` +
        `App knowledge:\n${KNOWLEDGE}\n\n` +
        `The user is currently on ${pageContext}. Tailor your answer to that area when relevant.\n` +
        `Give concise, actionable help referencing the relevant page or button. Keep replies to 2-5 sentences. ` +
        `If a task has a shortcut, mention it. If you are unsure, say so and point them to the closest page.\n\n` +
        `Conversation so far:\n${history}\n\nAssistant:`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const answer =
        typeof res === "string"
          ? res
          : res?.response || res?.output || res?.text || JSON.stringify(res);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] flex flex-col rounded-2xl shadow-2xl bg-white border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">Retail Assistant</p>
          <p className="text-[11px] text-blue-100 truncate">Ask me anything about My Retailer Pro</p>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-1.5 transition-colors" aria-label="Close assistant">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm p-2.5 text-sm text-slate-700 shadow-sm max-w-[80%]">
                Hi! I'm your Retail POS assistant. I can see you're on{" "}
                <span className="font-medium">{getPageContext(location.pathname).replace(/^the /, "")}</span>.
                How can I help? Tap a suggestion or type your question.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-9">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-3 py-1.5 hover:bg-blue-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-slate-300" : "bg-gradient-to-br from-blue-500 to-indigo-500"}`}>
              {m.role === "user" ? <UserIcon className="w-4 h-4 text-slate-700" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`rounded-2xl p-2.5 text-sm shadow-sm max-w-[80%] whitespace-pre-wrap break-words ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white text-slate-700 rounded-tl-sm"}`}>
              {m.content}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm flex gap-1 items-center">
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Type your question…"
          className="flex-1 text-sm rounded-full border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={() => send()}
          disabled={typing || !input.trim()}
          className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}