import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import type { MindMapNode } from '../../types';

// Beautiful color palette for mind map levels
const LEVEL_COLORS = [
  { bg: '#6366F1', border: '#4F46E5', text: '#FFFFFF' }, // Root - Indigo
  { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF' }, // Level 1 - Purple
  { bg: '#EC4899', border: '#DB2777', text: '#FFFFFF' }, // Level 2 - Pink
  { bg: '#F59E0B', border: '#D97706', text: '#FFFFFF' }, // Level 3 - Amber
  { bg: '#10B981', border: '#059669', text: '#FFFFFF' }, // Level 4 - Emerald
  { bg: '#06B6D4', border: '#0891B2', text: '#FFFFFF' }, // Level 5 - Cyan
];

interface PositionedNode {
  node: MindMapNode;
  x: number;
  y: number;
  level: number;
  parent?: PositionedNode;
  angle?: number;
}

interface MindMapRendererProps {
  rootNode: MindMapNode;
}

// Calculate positions for all nodes in a radial layout
function calculateRadialLayout(
  node: MindMapNode,
  centerX: number,
  centerY: number,
  level: number = 0,
  startAngle: number = 0,
  endAngle: number = 2 * Math.PI,
  parent?: PositionedNode
): PositionedNode[] {
  const positions: PositionedNode[] = [];

  // Radius increases with each level
  const baseRadius = 180;
  const radiusIncrement = 160;
  const radius = level === 0 ? 0 : baseRadius + (level - 1) * radiusIncrement;

  // Calculate position
  const angle = level === 0 ? 0 : (startAngle + endAngle) / 2;
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  const positionedNode: PositionedNode = {
    node,
    x,
    y,
    level,
    parent,
    angle,
  };

  positions.push(positionedNode);

  // Calculate positions for children
  if (node.children && node.children.length > 0) {
    const childCount = node.children.length;
    const angleRange = endAngle - startAngle;
    const childAngleStep = angleRange / childCount;

    node.children.forEach((child, index) => {
      const childStartAngle = startAngle + index * childAngleStep;
      const childEndAngle = childStartAngle + childAngleStep;

      const childPositions = calculateRadialLayout(
        child,
        centerX,
        centerY,
        level + 1,
        childStartAngle,
        childEndAngle,
        positionedNode
      );

      positions.push(...childPositions);
    });
  }

  return positions;
}

// Calculate positions for horizontal tree layout
function calculateTreeLayout(
  node: MindMapNode,
  startX: number,
  startY: number,
  level: number = 0,
  parent?: PositionedNode
): { positions: PositionedNode[]; height: number } {
  const nodeWidth = 160;
  const nodeHeight = 50;
  const horizontalGap = 80;
  const verticalGap = 30;

  const x = startX + level * (nodeWidth + horizontalGap);

  const positionedNode: PositionedNode = {
    node,
    x,
    y: startY,
    level,
    parent,
  };

  const positions: PositionedNode[] = [];

  if (!node.children || node.children.length === 0) {
    positionedNode.y = startY;
    positions.push(positionedNode);
    return { positions, height: nodeHeight };
  }

  let currentY = startY;
  let totalHeight = 0;
  const childPositions: PositionedNode[] = [];

  node.children.forEach((child, index) => {
    const result = calculateTreeLayout(child, startX, currentY, level + 1, positionedNode);
    childPositions.push(...result.positions);
    currentY += result.height + verticalGap;
    totalHeight += result.height + (index < node.children.length - 1 ? verticalGap : 0);
  });

  // Center parent vertically among children
  const firstChildY = childPositions.find(p => p.level === level + 1)?.y || startY;
  const lastChild = [...childPositions].reverse().find(p => p.level === level + 1);
  const lastChildY = lastChild?.y || startY;

  positionedNode.y = (firstChildY + lastChildY) / 2;

  positions.push(positionedNode, ...childPositions);

  return { positions, height: totalHeight };
}

// Generate curved bezier path between two points
function generateCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  layout: 'radial' | 'tree'
): string {
  if (layout === 'radial') {
    // Bezier curve for radial layout
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Control points perpendicular to the line
    const controlOffset = distance * 0.2;
    const controlX = midX - (dy / distance) * controlOffset * 0.5;
    const controlY = midY + (dx / distance) * controlOffset * 0.5;

    return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
  } else {
    // Smooth S-curve for tree layout
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`;
  }
}

export function MindMapRenderer({ rootNode }: MindMapRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [layout, setLayout] = useState<'radial' | 'tree'>('tree');

  // Calculate node positions based on layout
  const { positions, bounds } = useMemo(() => {
    if (layout === 'radial') {
      const centerX = 600;
      const centerY = 400;
      const pos = calculateRadialLayout(rootNode, centerX, centerY);

      const minX = Math.min(...pos.map(p => p.x)) - 100;
      const maxX = Math.max(...pos.map(p => p.x)) + 100;
      const minY = Math.min(...pos.map(p => p.y)) - 50;
      const maxY = Math.max(...pos.map(p => p.y)) + 50;

      return {
        positions: pos,
        bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
      };
    } else {
      const startX = 80;
      const startY = 50;
      const { positions: pos } = calculateTreeLayout(rootNode, startX, startY);

      const minX = Math.min(...pos.map(p => p.x)) - 20;
      const maxX = Math.max(...pos.map(p => p.x)) + 180;
      const minY = Math.min(...pos.map(p => p.y)) - 30;
      const maxY = Math.max(...pos.map(p => p.y)) + 60;

      return {
        positions: pos,
        bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
      };
    }
  }, [rootNode, layout]);

  // Center the view when layout changes
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const initialZoom = Math.min(
        containerWidth / bounds.width * 0.9,
        containerHeight / bounds.height * 0.9,
        1
      );

      setZoom(Math.max(0.4, Math.min(initialZoom, 1)));
      setPan({
        x: (containerWidth - bounds.width * initialZoom) / 2 - bounds.minX * initialZoom,
        y: (containerHeight - bounds.height * initialZoom) / 2 - bounds.minY * initialZoom,
      });
    }
  }, [layout, bounds]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.2), 2));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const initialZoom = Math.min(
        containerWidth / bounds.width * 0.9,
        containerHeight / bounds.height * 0.9,
        1
      );

      setZoom(Math.max(0.4, Math.min(initialZoom, 1)));
      setPan({
        x: (containerWidth - bounds.width * initialZoom) / 2 - bounds.minX * initialZoom,
        y: (containerHeight - bounds.height * initialZoom) / 2 - bounds.minY * initialZoom,
      });
    }
  }, [bounds]);

  // Get color for a level
  const getColors = (level: number) => {
    return LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];
  };

  // Calculate text width for node sizing
  const getNodeWidth = (text: string, level: number) => {
    const baseWidth = level === 0 ? 180 : 140;
    const charWidth = level === 0 ? 9 : 7;
    return Math.min(Math.max(text.length * charWidth + 32, baseWidth), 220);
  };

  const getNodeHeight = (level: number) => {
    return level === 0 ? 48 : 36;
  };

  return (
    <div className="relative w-full h-[650px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {/* Layout Toggle */}
        <div className="flex bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
          <button
            onClick={() => setLayout('tree')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              layout === 'tree'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tree
          </button>
          <button
            onClick={() => setLayout('radial')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              layout === 'radial'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Radial
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex bg-white rounded-lg shadow-md border border-slate-200">
          <button
            onClick={() => setZoom(z => Math.min(z * 1.2, 2))}
            className="p-2 hover:bg-slate-50 transition-colors border-r border-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))}
            className="p-2 hover:bg-slate-50 transition-colors border-r border-slate-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={resetView}
            className="p-2 hover:bg-slate-50 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 px-3 py-2">
        <div className="text-xs font-medium text-slate-500 mb-2">Depth Level</div>
        <div className="flex items-center gap-1">
          {LEVEL_COLORS.slice(0, 5).map((color, index) => (
            <div
              key={index}
              className="w-5 h-5 rounded-full shadow-sm"
              style={{ backgroundColor: color.bg }}
              title={`Level ${index}`}
            />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Definitions for gradients and filters */}
          <defs>
            {/* Drop shadow filter */}
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>

            {/* Glow filter for hover */}
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradients for each level */}
            {LEVEL_COLORS.map((color, index) => (
              <linearGradient
                key={index}
                id={`gradient-${index}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={color.bg} />
                <stop offset="100%" stopColor={color.border} />
              </linearGradient>
            ))}
          </defs>

          {/* Connections */}
          <g className="connections">
            {positions.map((pos) => {
              if (!pos.parent) return null;

              const parentWidth = getNodeWidth(pos.parent.node.label, pos.parent.level);
              const parentHeight = getNodeHeight(pos.parent.level);
              const nodeWidth = getNodeWidth(pos.node.label, pos.level);
              const nodeHeight = getNodeHeight(pos.level);

              let x1, y1, x2, y2;

              if (layout === 'tree') {
                x1 = pos.parent.x + parentWidth;
                y1 = pos.parent.y + parentHeight / 2;
                x2 = pos.x;
                y2 = pos.y + nodeHeight / 2;
              } else {
                x1 = pos.parent.x + parentWidth / 2;
                y1 = pos.parent.y + parentHeight / 2;
                x2 = pos.x + nodeWidth / 2;
                y2 = pos.y + nodeHeight / 2;
              }

              const colors = getColors(pos.level);
              const isHovered = hoveredNode === pos.node.id || hoveredNode === pos.parent.node.id;

              return (
                <path
                  key={`connection-${pos.node.id}`}
                  d={generateCurvedPath(x1, y1, x2, y2, layout)}
                  fill="none"
                  stroke={isHovered ? colors.bg : '#CBD5E1'}
                  strokeWidth={isHovered ? 3 : 2}
                  strokeLinecap="round"
                  className="transition-all duration-200"
                  style={{
                    opacity: isHovered ? 1 : 0.6,
                  }}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {positions.map((pos) => {
              const colors = getColors(pos.level);
              const nodeWidth = getNodeWidth(pos.node.label, pos.level);
              const nodeHeight = getNodeHeight(pos.level);
              const isRoot = pos.level === 0;
              const isHovered = hoveredNode === pos.node.id;
              const borderRadius = isRoot ? 12 : 8;
              const fontSize = isRoot ? 16 : 13;

              return (
                <g
                  key={pos.node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={() => setHoveredNode(pos.node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: isHovered ? `translate(${pos.x}px, ${pos.y - 2}px)` : undefined,
                  }}
                >
                  {/* Node background */}
                  <rect
                    x={0}
                    y={0}
                    width={nodeWidth}
                    height={nodeHeight}
                    rx={borderRadius}
                    ry={borderRadius}
                    fill={`url(#gradient-${Math.min(pos.level, LEVEL_COLORS.length - 1)})`}
                    filter={isHovered ? 'url(#glow)' : 'url(#dropShadow)'}
                    className="transition-all duration-200"
                  />

                  {/* Node border */}
                  <rect
                    x={0}
                    y={0}
                    width={nodeWidth}
                    height={nodeHeight}
                    rx={borderRadius}
                    ry={borderRadius}
                    fill="none"
                    stroke={colors.border}
                    strokeWidth={isHovered ? 2 : 1}
                    className="transition-all duration-200"
                  />

                  {/* Node text */}
                  <text
                    x={nodeWidth / 2}
                    y={nodeHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={colors.text}
                    fontSize={fontSize}
                    fontWeight={isRoot ? 600 : 500}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    className="select-none"
                  >
                    {pos.node.label.length > 25
                      ? pos.node.label.substring(0, 22) + '...'
                      : pos.node.label}
                  </text>

                  {/* Child count indicator */}
                  {pos.node.children && pos.node.children.length > 0 && (
                    <g>
                      <circle
                        cx={nodeWidth - 8}
                        cy={8}
                        r={10}
                        fill="white"
                        stroke={colors.border}
                        strokeWidth={1}
                      />
                      <text
                        x={nodeWidth - 8}
                        y={8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={colors.bg}
                        fontSize={10}
                        fontWeight={600}
                      >
                        {pos.node.children.length}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 text-sm font-medium text-slate-600">
        {Math.round(zoom * 100)}%
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 text-xs text-slate-500">
        Scroll to zoom • Drag to pan
      </div>
    </div>
  );
}
