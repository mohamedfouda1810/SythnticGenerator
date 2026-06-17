import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  className = '',
  cursor = true,
  onComplete,
}) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let interval;
    const resetTimer = setTimeout(() => {
      setDisplayed('');
      setDone(false);
    }, 0);
    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setDone(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, delay, onComplete]);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span>{displayed}</span>
      <span className="invisible w-0 overflow-hidden whitespace-pre">
        {text.slice(displayed.length)}
      </span>
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className={`inline-block ml-1 w-[3px] h-[0.9em] bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary-glow)] rounded-full ${done ? 'opacity-0' : ''}`}
        />
      )}
    </span>
  );
}
