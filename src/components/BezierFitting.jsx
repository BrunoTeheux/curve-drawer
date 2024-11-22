import React, { useState, useRef, useEffect } from 'react';

const BezierFitting = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [curves, setCurves] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Fonction pour redimensionner le canvas
  const resizeCanvas = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    // Calculer une hauteur proportionnelle avec un maximum de 70vh
    const containerHeight = Math.min(containerWidth * 0.5, window.innerHeight * 0.7);
    
    setCanvasSize({
      width: containerWidth,
      height: containerHeight
    });
  };
  // Observer le redimensionnement
  useEffect(() => {
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Initialiser la taille
    resizeCanvas();
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const smoothPoints = (points) => {
    if (points.length < 3) return points;
    
    const smoothed = [];
    const windowSize = 5;
    
    // Garde les premiers points
    smoothed.push(points[0]);
    smoothed.push(points[1]);
    
    // Lissage principal
    for (let i = 2; i < points.length - 2; i++) {
      const weights = [0.1, 0.2, 0.4, 0.2, 0.1];
      let sumX = 0;
      let sumY = 0;
      
      for (let j = 0; j < windowSize; j++) {
        const idx = i + j - Math.floor(windowSize/2);
        sumX += points[idx].x * weights[j];
        sumY += points[idx].y * weights[j];
      }
      
      smoothed.push({
        x: sumX,
        y: sumY
      });
    }
    
    // Garde les derniers points
    smoothed.push(points[points.length - 2]);
    smoothed.push(points[points.length - 1]);
    
    return smoothed;
  };

  const calculateBezier = (points) => {
    if (points.length < 2) return [];
    
    const smoothedPoints = smoothPoints(points);
    const curves = [];
    
    for (let i = 0; i < smoothedPoints.length - 1; i++) {
      const p0 = smoothedPoints[i];
      const p3 = smoothedPoints[i + 1];
      
      // Calcul des vecteurs de direction
      const prev = i > 0 ? smoothedPoints[i-1] : p0;
      const next = i < smoothedPoints.length - 2 ? smoothedPoints[i+2] : p3;
      
      // Vecteurs tangents
      const tangent1 = {
        x: p3.x - prev.x,
        y: p3.y - prev.y
      };
      const tangent2 = {
        x: next.x - p0.x,
        y: next.y - p0.y
      };
      
      // Normalisation des vecteurs
      const len1 = Math.sqrt(tangent1.x * tangent1.x + tangent1.y * tangent1.y);
      const len2 = Math.sqrt(tangent2.x * tangent2.x + tangent2.y * tangent2.y);
      
      // Distance entre les points
      const segDist = Math.sqrt(
        (p3.x - p0.x) * (p3.x - p0.x) + 
        (p3.y - p0.y) * (p3.y - p0.y)
      );
      
      // Ajustement de la longueur des points de contrôle
      const controlLen = segDist * 0.3;
      
      const p1 = {
        x: p0.x + (tangent1.x / len1) * controlLen,
        y: p0.y + (tangent1.y / len1) * controlLen
      };
      
      const p2 = {
        x: p3.x - (tangent2.x / len2) * controlLen,
        y: p3.y - (tangent2.y / len2) * controlLen
      };
      
      curves.push({ p0, p1, p2, p3 });
    }
    
    return curves;
  };

  // Ajuster le canvas quand sa taille change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mettre à jour les dimensions du canvas
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Redessiner le contenu
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Ligne en cours de dessin
    if (isDrawing) {
      ctx.beginPath();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = Math.max(2.5, canvasSize.width / 240);
      
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
    
    // Courbe lissée
    if (points.length > 2) {
      const newCurves = calculateBezier(points);
      setCurves(newCurves);
      
      ctx.beginPath();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = Math.max(3, canvasSize.width / 200);
      
      newCurves.forEach(curve => {
        const { p0, p1, p2, p3 } = curve;
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      });
      ctx.stroke();
    }
  }, [points, canvasSize]);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const addPoint = (point, prevPoints) => {
    if (prevPoints.length > 0) {
      const lastPoint = prevPoints[prevPoints.length - 1];
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      const distSquared = dx * dx + dy * dy;
      const minDistance = Math.max(4, canvasSize.width / 150);
      if (distSquared < minDistance * minDistance) {
        return prevPoints;
      }
    }
    return [...prevPoints, point];
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setPoints([pos]);
    setCurves([]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    setPoints(prev => addPoint(pos, prev));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setPoints([]);
    setCurves([]);
  };

  const generateSVG = () => {
    if (curves.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    curves.forEach(curve => {
      [curve.p0, curve.p1, curve.p2, curve.p3].forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });

    const margin = 10;
    minX -= margin;
    minY -= margin;
    maxX += margin;
    maxY += margin;

    const width = maxX - minX;
    const height = maxY - minY;

    let path = `M ${curves[0].p0.x - minX} ${curves[0].p0.y - minY}`;
    curves.forEach(curve => {
      path += ` C ${curve.p1.x - minX} ${curve.p1.y - minY}, ${curve.p2.x - minX} ${curve.p2.y - minY}, ${curve.p3.x - minX} ${curve.p3.y - minY}`;
    });

    const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <path d="${path}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'curve.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

return (
    <div className="w-full p-4">
      <div 
        ref={containerRef}
        className="border rounded-lg p-2 sm:p-4 bg-white shadow-sm"
      >
        <canvas
          ref={canvasRef}
          className="w-full border rounded cursor-crosshair"
          style={{ 
            height: canvasSize.height,
            touchAction: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMouseDown(e.touches[0]);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            handleMouseMove(e.touches[0]);
          }}
          onTouchEnd={handleMouseUp}
        />
        <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
          <button
            onClick={clearCanvas}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm sm:text-base"
          >
            Effacer
          </button>
          <button
            onClick={generateSVG}
            className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm sm:text-base"
            disabled={curves.length === 0}
          >
            Exporter SVG
          </button>
        </div>
      </div>
    </div>
  );
};


export default BezierFitting;
