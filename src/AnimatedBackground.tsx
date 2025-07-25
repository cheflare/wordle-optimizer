import { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const font_size = 18;
    let columns = Math.floor(width / font_size);
    let drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(249, 250, 251, 0.05)'; // Faint background to create trail effect
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#CBD5E1'; // Letter color
      ctx.font = `${font_size}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * font_size, drops[i] * font_size);

        if (drops[i] * font_size > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      // Recalculate columns and update drops array
      const newColumns = Math.floor(width / font_size);
      if (newColumns > columns) {
        // Add new drops for new columns
        for (let x = columns; x < newColumns; x++) {
          drops[x] = 1;
        }
      } else if (newColumns < columns) {
        // Remove drops for removed columns
        drops = drops.slice(0, newColumns);
      }
      columns = newColumns;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} />;
};

export default AnimatedBackground;