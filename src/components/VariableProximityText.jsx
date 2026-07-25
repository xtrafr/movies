import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';

const ProximityChar = ({ char, mouseX, mouseY, fromWeight, toWeight, radius }) => {
  const charRef = useRef(null);
  const lastRect = useRef({ x: 0, y: 0 });

  const springWeight = useSpring(fromWeight, {
    stiffness: 300,
    damping: 30,
    mass: 0.5
  });

  useEffect(() => {
    if (!charRef.current) return;
    const rect = charRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Skip recalc if position hasn't changed meaningfully
    if (Math.abs(centerX - lastRect.current.x) < 1 && Math.abs(centerY - lastRect.current.y) < 1 && mouseX < 0) {
      springWeight.set(fromWeight);
      return;
    }
    lastRect.current = { x: centerX, y: centerY };

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distSq = dx * dx + dy * dy;
    const radiusSq = radius * radius;

    if (distSq < radiusSq) {
      const dist = Math.sqrt(distSq);
      const factor = 1 - (dist / radius);
      const easeFactor = Math.sin(factor * Math.PI / 2);
      const targetWeight = fromWeight + easeFactor * (toWeight - fromWeight);
      springWeight.set(targetWeight);
    } else {
      springWeight.set(fromWeight);
    }
  }, [mouseX, mouseY, fromWeight, toWeight, radius, springWeight]);

  return (
    <motion.span
      ref={charRef}
      style={{
        display: 'inline-block',
        fontWeight: springWeight,
        willChange: 'font-weight'
      }}
    >
      {char}
    </motion.span>
  );
};

const VariableProximityText = ({ text, fromWeight = 300, toWeight = 900, radius = 250, className = '' }) => {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const rafRef = useRef(null);
  const pendingPos = useRef(null);

  const flush = useCallback(() => {
    if (pendingPos.current) {
      setMousePos(pendingPos.current);
      pendingPos.current = null;
    }
    rafRef.current = null;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      pendingPos.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    const handleMouseLeave = () => {
      pendingPos.current = { x: -1000, y: -1000 };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [flush]);

  const lines = text.split('\n');

  return (
    <div ref={containerRef} className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {lines.map((line, lineIndex) => {
        const words = line.split(' ');
        return (
          <div key={lineIndex} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem' }}>
            {words.map((word, wordIndex) => (
              <span key={wordIndex} style={{ display: 'flex' }}>
                {word.split('').map((char, charIndex) => (
                  <ProximityChar
                    key={charIndex}
                    char={char}
                    mouseX={mousePos.x}
                    mouseY={mousePos.y}
                    fromWeight={fromWeight}
                    toWeight={toWeight}
                    radius={radius}
                  />
                ))}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default VariableProximityText;
