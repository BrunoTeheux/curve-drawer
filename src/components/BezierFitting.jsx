import React, { useState, useRef, useEffect } from 'react';

const BezierFitting = () => {
  // États existants
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [curves, setCurves] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showHandDrawn, setShowHandDrawn] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // Nouveaux états pour le test de point
  const [testPoint, setTestPoint] = useState(null);
  const [pointIndex, setPointIndex] = useState(null);
  const [isTestingPoint, setIsTestingPoint] = useState(false);

  // Fonction utilitaire pour obtenir la position de la souris
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  // Fonction pour ajouter des points avec une distance minimale
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

  // Gestionnaires d'événements
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setPoints([pos]);
    setCurves([]);
    // Réinitialiser le test de point quand on commence un nouveau dessin
    setTestPoint(null);
    setPointIndex(null);
    setIsTestingPoint(false);
  };

  // Fonction de nettoyage modifiée
  const clearCanvas = () => {
    setPoints([]);
    setCurves([]);
    // Réinitialiser le test de point quand on efface le canvas
    setTestPoint(null);
    setPointIndex(null);
    setIsTestingPoint(false);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    setPoints(prev => addPoint(pos, prev));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    handleMouseDown(e.touches[0]);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    handleMouseMove(e.touches[0]);
  };
const getBezierPoint = (t, p0, p1, p2, p3) => {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
  };
};

const isPointAboveSegment = (point, start, end) => {
  return (end.x - start.x) * (point.y - start.y) >
         (end.y - start.y) * (point.x - start.x);
};

const calculatePointIndex = (point) => {
  if (!curves.length) return 0;

  let wn = 0; // Winding number
  const segments = [];

  // Générer des points intermédiaires pour chaque courbe
  curves.forEach(curve => {
    const steps = 50; // Nombre de segments pour approximer la courbe
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      const p1 = getBezierPoint(t1, curve.p0, curve.p1, curve.p2, curve.p3);
      const p2 = getBezierPoint(t2, curve.p0, curve.p1, curve.p2, curve.p3);
      segments.push([p1, p2]);
    }
  });

  // Calculer le winding number
  segments.forEach(([start, end]) => {
    if (start.y <= point.y) {
      if (end.y > point.y && isPointAboveSegment(point, start, end)) {
        wn++;
      }
    } else {
      if (end.y <= point.y && !isPointAboveSegment(point, start, end)) {
        wn--;
      }
    }
  });

  return wn;
};

const handleCanvasClick = (e) => {
  if (!isTestingPoint) return;
  
  const pos = getMousePos(e);
  setTestPoint(pos);
  const index = calculatePointIndex(pos);
  setPointIndex(index);
};



  // Fonction de redimensionnement
  const resizeCanvas = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = Math.min(containerWidth * 0.5, window.innerHeight * 0.7);
    
    setCanvasSize({
      width: containerWidth,
      height: containerHeight
    });
  };

  // Fonction de lissage des points
  const smoothPoints = (points) => {
    if (points.length < 3) return points;
    
    const smoothed = [];
    const windowSize = 5;
    
    smoothed.push(points[0]);
    smoothed.push(points[1]);
    
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
    
    smoothed.push(points[points.length - 2]);
    smoothed.push(points[points.length - 1]);
    
    return smoothed;
  };

  // Fonction de calcul des courbes de Bézier
  const calculateBezier = (points) => {
    if (points.length < 2) return [];
    
    const smoothedPoints = smoothPoints(points);
    const curves = [];
    
    for (let i = 0; i < smoothedPoints.length - 1; i++) {
      const p0 = smoothedPoints[i];
      const p3 = smoothedPoints[i + 1];
      
      const prev = i > 0 ? smoothedPoints[i-1] : p0;
      const next = i < smoothedPoints.length - 2 ? smoothedPoints[i+2] : p3;
      
      const tangent1 = {
        x: p3.x - prev.x,
        y: p3.y - prev.y
      };
      const tangent2 = {
        x: next.x - p0.x,
        y: next.y - p0.y
      };
      
      const len1 = Math.sqrt(tangent1.x * tangent1.x + tangent1.y * tangent1.y);
      const len2 = Math.sqrt(tangent2.x * tangent2.x + tangent2.y * tangent2.y);
      
      const segDist = Math.sqrt(
        (p3.x - p0.x) * (p3.x - p0.x) + 
        (p3.y - p0.y) * (p3.y - p0.y)
      );
      
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

  // Fonction d'export SVG
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
  <path d="${path}" fill="none" stroke="#2563eb" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
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

  // Effet pour le redimensionnement
  useEffect(() => {
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    resizeCanvas();
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Effet pour le rendu du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Trait à main levée
    if (showHandDrawn && points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = Math.max(2.5, canvasSize.width / 240);
      
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke(); // Déplacé ici pour terminer le trait à main levée
    }
    
    // Courbe lissée
    if (points.length > 2) {
      const newCurves = calculateBezier(points);
      setCurves(newCurves);
      
      ctx.beginPath();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = strokeWidth;
      
      newCurves.forEach(curve => {
        const { p0, p1, p2, p3 } = curve;
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      });
      ctx.stroke();
    }
    
    // Point de test
    if (testPoint) {
      ctx.beginPath();
      ctx.fillStyle = pointIndex !== 0 ? '#22c55e' : '#ef4444';
      ctx.arc(testPoint.x, testPoint.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '14px Arial';
      ctx.fillStyle = '#000';
      ctx.fillText(`Indice: ${pointIndex}`, testPoint.x + 10, testPoint.y - 10);
    }
    
  }, [points, canvasSize, showHandDrawn, strokeWidth, testPoint, pointIndex]);

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
          onMouseDown={(e) => {
            if (!isTestingPoint) handleMouseDown(e);
          }}
          onMouseMove={(e) => {
            if (!isTestingPoint) handleMouseMove(e);
          }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            if (isTestingPoint) handleCanvasClick(e);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        />
        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
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
            <button
              onClick={() => setShowHandDrawn(!showHandDrawn)}
              className={`w-full sm:w-auto px-4 py-2 text-white rounded text-sm sm:text-base ${
                showHandDrawn ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              {showHandDrawn ? 'Masquer le trait' : 'Afficher le trait'}
            </button>
            <button
              onClick={() => {
                setIsTestingPoint(!isTestingPoint);
                if (!isTestingPoint) {
                  setTestPoint(null);
                  setPointIndex(null);
                }
              }}
              className={`w-full sm:w-auto px-4 py-2 text-white rounded text-sm sm:text-base ${
                isTestingPoint ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              {isTestingPoint ? 'Arrêter le test' : 'Tester un point'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[140px]">
              Épaisseur du trait : {strokeWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full sm:w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BezierFitting;
