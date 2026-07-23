import React, { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children, className = "" }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const currentPull = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef(null);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      if (el.scrollTop <= 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
        setIsPulling(true);
      } else {
        pulling.current = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!pulling.current || isRefreshing) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0 && el.scrollTop <= 0) {
        const distance = Math.min(diff * 0.4, 100);
        currentPull.current = distance;
        setPullDistance(distance);
        if (distance > 5) e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      setIsPulling(false);
      if (currentPull.current >= 70) {
        setIsRefreshing(true);
        setPullDistance(35);
        try {
          await onRefreshRef.current();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      currentPull.current = 0;
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isRefreshing]);

  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div ref={containerRef} className="h-full overflow-y-auto" style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch", position: "relative" }}>
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-end justify-center pointer-events-none z-20"
          style={{ height: `${pullDistance}px` }}
        >
          <RefreshCw
            className={`text-blue-500 mb-1 ${isRefreshing ? "animate-spin" : ""}`}
            style={{ opacity: Math.min(pullDistance / 70, 1) }}
          />
        </div>
      )}
      <div className={className} style={{ transform: `translateY(${pullDistance}px)`, transition: isPulling ? "none" : "transform 0.2s ease-out" }}>
        {children}
      </div>
    </div>
  );
}