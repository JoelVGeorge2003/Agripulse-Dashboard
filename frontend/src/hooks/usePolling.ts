import { useEffect, useRef } from "react";

export function usePolling(callback: () => void | Promise<void>, intervalMs: number): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void savedCallback.current();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
}
