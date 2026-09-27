import React from "react";

/**
 * Wraps a card so it opens a detail view when clicked.
 * When `enabled` is false (the card has no data behind it) the card stays
 * exactly as it was — no pointer cursor, no hover lift, no click handler.
 */
export default function ClickableCard({ enabled = true, onClick, className = "", children }) {
  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Open details"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`cursor-pointer transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}