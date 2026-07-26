import React, { useEffect, useRef } from 'react';

const DotGrid = ({ 
  dotColor = 'rgba(255, 255, 255, 0.12)', 
  activeDotColor = 'rgba(59, 130, 246, 0.85)',
  dotSize = 5,
  gap = 15,
  proximity = 120,
  shockRadius = 250,
  shockStrength = 5,
  resistance = 750,
  returnDuration = 1.5 
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height;
    let dots = [];
    
    // Physics & Grid constants
    const spacing = Math.max(8, gap); // Safe lower bounds
    const baseScale = 0.25; // How small they are when inactive
    const maxScale = 1.0;   // Size when strongly hovered
    const shockMaxScale = 1.8; // Peak size during shockwave
    
    // Inertial physics simulation matching the config
    const stiffness = 0.1 / Math.max(0.1, returnDuration);
    const damping = Math.max(0.1, 1 - (resistance / 1000)); 

    let mouse = { x: -1000, y: -1000, moved: false };
    let shockwaves = [];

    let resizeTimeout;
    const resize = () => {
      // High-DPI resolution scaling for crisp UI
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);
      initDots();
    };

    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 150);
    };

    const initDots = () => {
      dots = [];
      const columns = Math.floor(width / spacing) + 2;
      const rows = Math.floor(height / spacing) + 2;
      const offsetX = ((width - (columns - 1) * spacing) / 2);
      const offsetY = ((height - (rows - 1) * spacing) / 2);
      
      for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({ 
            x: offsetX + i * spacing, 
            y: offsetY + j * spacing, 
            scale: baseScale,
            vScale: 0,
            activeColorAmt: 0,
            vColor: 0
          });
        }
      }
    };

    resize();
    window.addEventListener('resize', debouncedResize);

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.moved = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleClick = (e) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        active: true
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    let animationFrame;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Process shockwaves
      shockwaves.forEach(sw => {
        if (sw.active) {
          sw.radius += width / 50; // Dynamic expansion speed
          if (sw.radius > shockRadius) {
            sw.active = false;
          }
        }
      });
      shockwaves = shockwaves.filter(sw => sw.active);

      // Fast-paths for proximity limits to save performance
      const hoverRadiusSq = proximity * proximity;
      const shockRadiusSq = shockRadius * shockRadius;

      dots.forEach(dot => {
        let targetScale = baseScale;
        let targetColorAmt = 0; // 0 = default, 1 = active color
        
        // Hover interactions
        if (mouse.moved) {
          const dx = mouse.x - dot.x;
          const dy = mouse.y - dot.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < hoverRadiusSq) {
            const distance = Math.sqrt(distSq);
            // Smooth falloff factor
            const factor = 1 - Math.pow(distance / proximity, 1.5);
            targetScale = baseScale + factor * (maxScale - baseScale);
            targetColorAmt = factor;
          }
        }

        // Shockwave interactions
        shockwaves.forEach(sw => {
          const sdx = sw.x - dot.x;
          const sdy = sw.y - dot.y;
          const sDistSq = sdx * sdx + sdy * sdy;
          
          if (sDistSq < shockRadiusSq + spacing * spacing) {
            const sDistance = Math.sqrt(sDistSq);
            const ringDist = Math.abs(sDistance - sw.radius);
            
            // If the shockwave edge is hitting this dot
            if (ringDist < spacing * 1.5) {
              const impact = 1 - (sDistance / shockRadius);
              dot.vScale += shockStrength * 0.04 * impact;
              targetColorAmt = 1.0;
              targetScale = Math.max(targetScale, shockMaxScale);
            }
          }
        });

        // Spring Physics Engine (Inertia + Resistance)
        const scaleDiff = (targetScale - dot.scale) * stiffness;
        dot.vScale += scaleDiff;
        dot.vScale *= damping;
        dot.scale += dot.vScale;
        
        const colorDiff = (targetColorAmt - dot.activeColorAmt) * 0.15;
        dot.vColor += colorDiff;
        dot.vColor *= 0.8;
        dot.activeColorAmt += dot.vColor;

        // Render pass
        const renderRadius = Math.max(0.1, (dotSize / 2) * dot.scale);

        // Draw Base Dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, renderRadius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();

        // Draw Glow/Active layer over it if active
        if (dot.activeColorAmt > 0.01) {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, renderRadius, 0, Math.PI * 2);
          // Clamp alpha logic to prevent flashes
          ctx.globalAlpha = Math.max(0, Math.min(1, dot.activeColorAmt));
          ctx.fillStyle = activeDotColor;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrame);
    };
  }, [dotSize, gap, proximity, shockRadius, shockStrength, resistance, returnDuration, dotColor, activeDotColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

export default DotGrid;
