import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatbotPanel from "./ChatbotPanel";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <ChatbotPanel onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}