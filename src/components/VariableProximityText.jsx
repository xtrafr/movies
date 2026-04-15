import React, { useRef, useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';

const ProximityChar = ({ char, mousePos, fromWeight, toWeight, radius }) => {
  const charRef = useRef(null);
  
  // Use a fast spring for the font weight interpolation
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
    const dx = mousePos.x - centerX;
    const dy = mousePos.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      const factor = 1 - (dist / radius);
      // Ease out sine approximation for smoother proximity spread
      const easeFactor = Math.sin(factor * Math.PI / 2);
      const targetWeight = fromWeight + easeFactor * (toWeight - fromWeight);
      springWeight.set(targetWeight);
    } else {
      springWeight.set(fromWeight);
    }
  }, [mousePos, fromWeight, toWeight, radius, springWeight]);

  return (
    <motion.span
      ref={charRef}
      style={{ 
        display: 'inline-block',
        fontWeight: springWeight,
        willChange: 'font-weight' // Hint for browser optimization
      }}
    >
      {char}
    </motion.span>
  );
};

const VariableProximityText = ({ text, fromWeight = 300, toWeight = 900, radius = 250, className = '' }) => {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    // Optional: add mouse leave to reset nicely
    const handleMouseLeave = () => {
      setMousePos({ x: -1000, y: -1000 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

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
                    mousePos={mousePos} 
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
