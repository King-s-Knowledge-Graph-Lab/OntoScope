import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { CompetencyQuestion, DimensionValue } from '@shared/schema';
import { X } from 'lucide-react';

interface ScatterPlotProps {
  competencyQuestions: CompetencyQuestion[];
  domainCoverageValues: DimensionValue[];
  terminologyGranularityValues: DimensionValue[];
  onCQClick: (cq: CompetencyQuestion) => void;
  onIntersectionHover: (x: number, y: number, domainCoverage: string, terminologyGranularity: string) => void;
  onCanvasLeave: () => void;
  onExpandSubdomains: () => void;
  onAxisValueClick: (value: string, axisType: "domain" | "granularity") => void;
  onRenderComplete?: () => void; // Callback when scatter plot finishes rendering
}

interface CQPosition {
  id: string;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
}

export function ScatterPlot({
  competencyQuestions,
  domainCoverageValues,
  terminologyGranularityValues,
  onCQClick,
  onIntersectionHover,
  onCanvasLeave,
  onExpandSubdomains,
  onAxisValueClick,
  onRenderComplete
}: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [cqPositions, setCqPositions] = useState<Map<string, CQPosition>>(new Map());

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const generateCQPositions = (cqs: CompetencyQuestion[], domainValues: DimensionValue[], granularityValues: DimensionValue[]) => {
    const positions = new Map<string, CQPosition>();
    const occupiedSpots = new Map<string, Set<string>>(); // intersection -> set of occupied spots

    cqs.filter(cq => cq.isRelevant).forEach(cq => {
      const intersectionKey = `${cq.domainCoverage}-${cq.terminologyGranularity}`;
      
      if (!occupiedSpots.has(intersectionKey)) {
        occupiedSpots.set(intersectionKey, new Set());
      }

      const occupied = occupiedSpots.get(intersectionKey)!;
      
      const gridSize = 4;
      let position: CQPosition | null = null;
      
      for (let i = 0; i < gridSize && !position; i++) {
        for (let j = 0; j < gridSize && !position; j++) {
          const spotKey = `${i}-${j}`;
          if (!occupied.has(spotKey)) {
            const x = (i + 0.5) / gridSize; // Center in grid cell
            const y = (j + 0.5) / gridSize;
            position = {
              id: cq.id,
              x,
              y,
              gridX: i,
              gridY: j
            };
            occupied.add(spotKey);
          }
        }
      }
      
      if (!position) {
        position = {
          id: cq.id,
          x: Math.random() * 0.8 + 0.1,
          y: Math.random() * 0.8 + 0.1,
          gridX: -1,
          gridY: -1
        };
      }
      
      positions.set(cq.id, position);
    });
    
    return positions;
  };

  useEffect(() => {
    const newPositions = generateCQPositions(competencyQuestions, domainCoverageValues, terminologyGranularityValues);
    setCqPositions(newPositions);
  }, [competencyQuestions, domainCoverageValues, terminologyGranularityValues]);



  useEffect(() => {
    if (!svgRef.current || !containerRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll("*").remove();

    const defs = svg.append('defs');
    
    const bgGradient = defs.append('linearGradient')
      .attr('id', 'background-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    bgGradient.append('stop')
      .attr('offset', '0%')
      .attr('style', 'stop-color:#fafbfc;stop-opacity:1');
    bgGradient.append('stop')
      .attr('offset', '100%')
      .attr('style', 'stop-color:#f1f5f9;stop-opacity:1');

    const gridGradient = defs.append('linearGradient')
      .attr('id', 'grid-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    gridGradient.append('stop')
      .attr('offset', '0%')
      .attr('style', 'stop-color:#e2e8f0;stop-opacity:0.8');
    gridGradient.append('stop')
      .attr('offset', '50%')
      .attr('style', 'stop-color:#cbd5e1;stop-opacity:0.6');
    gridGradient.append('stop')
      .attr('offset', '100%')
      .attr('style', 'stop-color:#e2e8f0;stop-opacity:0.8');

    const shadow = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    shadow.append('feDropShadow')
      .attr('dx', 2).attr('dy', 2)
      .attr('stdDeviation', 3)
      .attr('flood-color', '#64748b')
      .attr('flood-opacity', 0.1);

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#background-gradient)')
      .attr('rx', 12)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05))');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .filter((event) => {
        return event.type === 'wheel' || 
               (event.type === 'mousedown' && !event.target.closest('.intersection-clickable-area'));
      })
      .on('zoom', (event) => {
        const newTransform = event.transform;
        setTransform({
          k: newTransform.k,
          x: newTransform.x,
          y: newTransform.y
        });
      });

    svg.call(zoom);

    const margin = { top: 60, right: 80, bottom: 100, left: 150 }; // Increased left margin for y-axis title
    const plotWidth = Math.min(800, width - margin.left - margin.right);
    const plotHeight = Math.min(600, height - margin.top - margin.bottom);
    
    const centerOffsetX = (width - plotWidth - margin.left - margin.right) / 2;
    const centerOffsetY = (height - plotHeight - margin.top - margin.bottom) / 2;
    
    const innerWidth = plotWidth;
    const innerHeight = plotHeight;

    const baseSubdomainCount = 3; // Initial count
    const currentSubdomainCount = domainCoverageValues.length;
    const expandedWidth = innerWidth * (currentSubdomainCount / baseSubdomainCount);
    
    const baseGranularityCount = 3; // Initial count (First-level, Second-level, Third-level)
    const currentGranularityCount = terminologyGranularityValues.length;
    const expandedHeight = innerHeight * (currentGranularityCount / baseGranularityCount);
    
    const xScale = d3.scaleBand()
      .domain(domainCoverageValues.map(d => d.value))
      .range([0, expandedWidth]) // Use expanded width instead of fixed innerWidth
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(terminologyGranularityValues.map(d => d.value))
      .range([innerHeight, innerHeight - expandedHeight]) // Extend upwards - start from bottom, extend negative
      .padding(0.1);

    const axisGroup = svg.append('g')
      .attr('class', 'axis-group')
      .attr('transform', `translate(${margin.left + centerOffsetX},${margin.top + centerOffsetY})`);

    const contentGroup = svg.append('g')
      .attr('class', 'content-group')
      .attr('transform', `translate(${margin.left + centerOffsetX + transform.x},${margin.top + centerOffsetY + transform.y}) scale(${transform.k})`);



    domainCoverageValues.forEach((domainValue, xIndex) => {
      terminologyGranularityValues.forEach((granularityValue, yIndex) => {
        const x = xScale(domainValue.value)!;
        const y = yScale(granularityValue.value)!;
        const bandWidth = xScale.bandwidth();
        const bandHeight = yScale.bandwidth();

        const intersectionGroup = contentGroup.append('g')
          .attr('class', 'intersection-group');

        const intersectionCQs = competencyQuestions.filter(cq => 
          cq.isRelevant && 
          cq.domainCoverage === domainValue.value && 
          cq.terminologyGranularity === granularityValue.value
        );
        const cqCount = intersectionCQs.length;
        
        const isAvailable = true;
        
        let strokeColor, hoverStrokeColor, strokeWidth;
        if (cqCount === 0) {
          strokeColor = 'rgba(148, 163, 184, 0.3)'; // Light gray for empty
          hoverStrokeColor = 'rgba(59, 130, 246, 0.6)';
          strokeWidth = 1;
        } else if (cqCount <= 3) {
          strokeColor = 'rgba(59, 130, 246, 0.5)'; // Blue for low density
          hoverStrokeColor = 'rgba(99, 102, 241, 0.7)';
          strokeWidth = 1.5;
        } else if (cqCount <= 6) {
          strokeColor = 'rgba(99, 102, 241, 0.6)'; // Indigo for medium density
          hoverStrokeColor = 'rgba(139, 92, 246, 0.8)';
          strokeWidth = 2;
        } else {
          strokeColor = 'rgba(139, 92, 246, 0.7)'; // Purple for high density
          hoverStrokeColor = 'rgba(168, 85, 247, 0.9)';
          strokeWidth = 2.5;
        }

        const clickPadding = 5; // Extra pixels around the visible area for better click detection
        
        intersectionGroup.append('rect')
          .attr('class', 'intersection-clickable-area')
          .attr('x', x - clickPadding)
          .attr('y', y - clickPadding)
          .attr('width', bandWidth + (clickPadding * 2))
          .attr('height', bandHeight + (clickPadding * 2))
          .attr('fill', 'transparent')
          .attr('stroke', 'none')
          .style('cursor', 'pointer')
          .style('pointer-events', 'all') // Ensure it receives all pointer events
          .on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            const centerX = x + bandWidth / 2;
            const centerY = y + bandHeight / 2;
            
            setTimeout(() => {
              onIntersectionHover(centerX, centerY, domainValue.value, granularityValue.value);
            }, 0);
          })
          .on('mousedown', function(event) {
            event.preventDefault();
            event.stopPropagation();
          })
          .on('mouseup', function(event) {
            event.preventDefault();
            event.stopPropagation();
          })
          .on('touchstart', function(event) {
            event.preventDefault();
            event.stopPropagation();
          })
          .on('touchend', function(event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            const centerX = x + bandWidth / 2;
            const centerY = y + bandHeight / 2;
            
            setTimeout(() => {
              onIntersectionHover(centerX, centerY, domainValue.value, granularityValue.value);
            }, 0);
          });

        intersectionGroup.append('rect')
          .attr('class', 'intersection-area-visual')
          .attr('x', x)
          .attr('y', y)
          .attr('width', bandWidth)
          .attr('height', bandHeight)
          .attr('fill', 'transparent')
          .attr('stroke', strokeColor)
          .attr('stroke-width', strokeWidth)
          .attr('rx', 8)
          .attr('ry', 8)
          .style('pointer-events', 'none') // This element doesn't handle events
          .style('transition', 'all 0.05s cubic-bezier(0.4, 0, 0.2, 1)');
        
        intersectionGroup.select('.intersection-clickable-area')
          .on('mouseover', function() {
            intersectionGroup.select('.intersection-area-visual')
              .transition()
              .duration(75)
              .ease(d3.easeQuadOut)
              .attr('stroke', hoverStrokeColor)
              .attr('stroke-width', strokeWidth + 0.5)
              .style('filter', 'drop-shadow(0 2px 6px rgba(99, 102, 241, 0.25))');
          })
          .on('mouseout', function() {
            intersectionGroup.select('.intersection-area-visual')
              .transition()
              .duration(75)
              .ease(d3.easeQuadOut)
              .attr('stroke', strokeColor)
              .attr('stroke-width', strokeWidth)
              .style('filter', 'none');
          });

      });
    });

    const cqGroups = contentGroup.selectAll('.cq-point')
      .data(competencyQuestions.filter(cq => cq.isRelevant))
      .enter().append('g')
      .attr('class', 'cq-point');

    cqGroups.each(function(d) {
      const group = d3.select(this);
      const position = cqPositions.get(d.id);
      
      if (!position) return;
      
      const bandX = xScale(d.domainCoverage)!;
      const bandY = yScale(d.terminologyGranularity)!;
      const bandWidth = xScale.bandwidth();
      const bandHeight = yScale.bandwidth();
      
      const margin = 8;
      const x = bandX + margin + (position.x * (bandWidth - 2 * margin));
      const y = bandY + margin + (position.y * (bandHeight - 2 * margin));

      if (transform.k <= 0.5) {
        const typeColor = d.type === 'subject' ? '#3b82f6' : 
                         d.type === 'property' ? '#10b981' : 
                         d.type === 'object' ? '#8b5cf6' : '#6b7280';
        
        group.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 5)
          .attr('fill', typeColor)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2.5)
          .style('cursor', 'pointer')
          .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')
          .style('transition', 'all 0.05s cubic-bezier(0.4, 0, 0.2, 1)')
          .on('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            onCQClick(d);
          })
          .on('mouseover', function() {
            d3.select(this)
              .transition()
              .duration(50)
              .ease(d3.easeQuadOut)
              .attr('r', 6)
              .attr('stroke-width', 3)
              .style('filter', 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))');
          })
          .on('mouseout', function() {
            d3.select(this)
              .transition()
              .duration(50)
              .ease(d3.easeQuadOut)
              .attr('r', 5)
              .attr('stroke-width', 2.5)
              .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');
          });
      }
    });

    if (transform.k > 0.5) {
      domainCoverageValues.forEach(domainValue => {
        terminologyGranularityValues.forEach(granularityValue => {
          const x = xScale(domainValue.value)!;
          const y = yScale(granularityValue.value)!;
          const bandWidth = xScale.bandwidth();
          const bandHeight = yScale.bandwidth();

          const intersectionCQs = competencyQuestions.filter(cq => 
            cq.isRelevant && 
            cq.domainCoverage === domainValue.value && 
            cq.terminologyGranularity === granularityValue.value
          );

          if (intersectionCQs.length === 0) return;

          const allTerms: { term: string; cq: CompetencyQuestion; totalCount: number }[] = [];
          intersectionCQs.forEach(cq => {
            if (cq.suggestedTerms && cq.suggestedTerms.length > 0) {
              const isHighZoom = transform.k > 1.3; // High zoom threshold
              
              if (isHighZoom) {
                cq.suggestedTerms.forEach(term => {
                  allTerms.push({ 
                    term, 
                    cq, 
                    totalCount: 1 
                  });
                });
              } else {
                const firstTerm = cq.suggestedTerms[0];
                const termWithCount = cq.suggestedTerms.length > 1 
                  ? `${firstTerm} (+${cq.suggestedTerms.length - 1})`
                  : firstTerm;
                allTerms.push({ 
                  term: termWithCount, 
                  cq, 
                  totalCount: cq.suggestedTerms.length 
                });
              }
            }
          });

          const centerX = x + bandWidth / 2;
          const centerY = y + bandHeight / 2;
          const maxRadius = Math.min(bandWidth, bandHeight) / 2 - 15; // Increased margin for better containment
          const isHighZoom = transform.k > 1.3;

          const estimateTextWidth = (text: string, fontSize: number) => {
            const avgCharWidth = fontSize * 0.55; // Slightly reduced for better accuracy
            const charSpacing = text.length > 1 ? (text.length - 1) * fontSize * 0.05 : 0;
            return text.length * avgCharWidth + charSpacing;
          };

          const checkTextCollision = (newX: number, newY: number, newText: string, newFontSize: number, existingPositions: Array<{x: number, y: number, term: string, fontSize: number}>) => {
            const newWidth = estimateTextWidth(newText, newFontSize);
            const newHeight = newFontSize;
            
            return existingPositions.some(pos => {
              const existingWidth = estimateTextWidth(pos.term, pos.fontSize);
              const existingHeight = pos.fontSize;
              
              const padding = 2;
              const newLeft = newX - newWidth / 2 - padding;
              const newRight = newX + newWidth / 2 + padding;
              const newTop = newY - newHeight / 2 - padding;
              const newBottom = newY + newHeight / 2 + padding;
              
              const existingLeft = pos.x - existingWidth / 2 - padding;
              const existingRight = pos.x + existingWidth / 2 + padding;
              const existingTop = pos.y - existingHeight / 2 - padding;
              const existingBottom = pos.y + existingHeight / 2 + padding;
              
              return !(newRight < existingLeft || 
                      newLeft > existingRight || 
                      newBottom < existingTop || 
                      newTop > existingBottom);
            });
          };

          let baseFontSize = isHighZoom ? 
            Math.max(5, Math.min(10, 11 - Math.floor(allTerms.length / 3))) : 
            Math.max(7, Math.min(14, 12 - Math.floor(allTerms.length / 2)));
          
          let positions: Array<{x: number, y: number, term: string, type?: string, fontSize: number}> = [];
          let allPlaced = false;
          let fontSizeAttempts = 0;
          const maxFontSizeAttempts = 5;
          
          while (!allPlaced && fontSizeAttempts < maxFontSizeAttempts) {
            positions = [];
            let successfulPlacements = 0;
            
            allTerms.forEach((termData, index) => {
              let placed = false;
              let attempts = 0;
              const maxAttempts = isHighZoom ? 150 : 100;
              
              while (!placed && attempts < maxAttempts) {
                const angle = (index * 137.5 + attempts * 25) * (Math.PI / 180);
                const radiusMultiplier = Math.sqrt((index + attempts + 1) / (allTerms.length + 1));
                const radius = radiusMultiplier * maxRadius * 0.9;
                const newX = centerX + Math.cos(angle) * radius;
                const newY = centerY + Math.sin(angle) * radius;
                
                const textWidth = estimateTextWidth(termData.term, baseFontSize);
                const textHeight = baseFontSize;
                const padding = 8; // Increased padding for better containment
                
                const textLeft = newX - textWidth / 2;
                const textRight = newX + textWidth / 2;
                const textTop = newY - textHeight / 2;
                const textBottom = newY + textHeight / 2;
                
                const withinBounds = (textLeft >= x + padding) && 
                                   (textRight <= x + bandWidth - padding) && 
                                   (textTop >= y + padding) && 
                                   (textBottom <= y + bandHeight - padding);
                
                if (withinBounds && !checkTextCollision(newX, newY, termData.term, baseFontSize, positions)) {
                  positions.push({ 
                    x: newX, 
                    y: newY, 
                    term: termData.term, 
                    type: termData.cq.type || undefined,
                    fontSize: baseFontSize
                  });
                  placed = true;
                  successfulPlacements++;
                }
                attempts++;
              }
              
              if (!placed) {
                const fallbackAngle = index * (360 / allTerms.length) * (Math.PI / 180);
                const fallbackRadius = Math.min(maxRadius * 0.4, 15);
                let fallbackX = centerX + Math.cos(fallbackAngle) * fallbackRadius;
                let fallbackY = centerY + Math.sin(fallbackAngle) * fallbackRadius;
                
                const textWidth = estimateTextWidth(termData.term, baseFontSize);
                const textHeight = baseFontSize;
                const padding = 8;
                
                fallbackX = Math.max(x + padding + textWidth/2, 
                            Math.min(x + bandWidth - padding - textWidth/2, fallbackX));
                fallbackY = Math.max(y + padding + textHeight/2, 
                            Math.min(y + bandHeight - padding - textHeight/2, fallbackY));
                
                positions.push({
                  x: fallbackX,
                  y: fallbackY,
                  term: termData.term,
                  type: termData.cq.type || undefined,
                  fontSize: baseFontSize
                });
              }
            });
            
            allPlaced = (successfulPlacements === allTerms.length);
            
            if (!allPlaced) {
              baseFontSize = Math.max(5, baseFontSize - 1); // Reduce font size
              fontSizeAttempts++;
            }
          }
          
          positions.forEach((pos) => {
            const typeColor = pos.type === 'subject' ? '#3b82f6' : 
                             pos.type === 'property' ? '#10b981' : 
                             pos.type === 'object' ? '#8b5cf6' : '#6b7280';

            const fontSize = pos.fontSize;

            contentGroup.append('text')
              .attr('x', pos.x)
              .attr('y', pos.y)
              .attr('text-anchor', 'middle')
              .attr('dy', '0.35em')
              .style('font-size', `${fontSize}px`)
              .style('font-weight', '600')
              .style('fill', typeColor)
              .style('cursor', 'pointer')
              .style('user-select', 'none')
              .style('transition', 'all 0.05s cubic-bezier(0.4, 0, 0.2, 1)')
              .text(pos.term)
              .on('mouseover', function() {
                d3.select(this)
                  .transition()
                  .duration(50)
                  .ease(d3.easeQuadOut)
                  .style('font-size', `${Math.min(fontSize + 1, 16)}px`)
                  .style('fill', '#1e293b');
              })
              .on('mouseout', function() {
                d3.select(this)
                  .transition()
                  .duration(50)
                  .ease(d3.easeQuadOut)
                  .style('font-size', `${fontSize}px`)
                  .style('fill', typeColor);
              })
              .on('click', (event) => {
                event.stopPropagation();
                const termData = allTerms.find(t => t.term === pos.term);
                if (termData?.cq) onCQClick(termData.cq);
              });
          });
        });
      });
    }



    const xAxis = d3.axisBottom(xScale)
      .tickSize(0)
      .tickPadding(15);

    const xAxisGroup = contentGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.selectAll('.domain')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2);
      
    xAxisGroup.selectAll('text')
      .attr('class', 'axis-value x-axis-value')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#1e293b')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all') // Ensure pointer events work across platforms
      .style('-webkit-user-select', 'none') // Prevent text selection on WebKit
      .style('-moz-user-select', 'none') // Prevent text selection on Firefox
      .style('-ms-user-select', 'none') // Prevent text selection on IE/Edge
      .style('user-select', 'none') // Standard property
      .attr('dy', '1em')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('fill', '#3b82f6')
          .style('font-size', '13px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('fill', '#1e293b')
          .style('font-size', '12px');
      })
      .on('click', function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        setTimeout(() => {
          onAxisValueClick(d as string, 'domain');
        }, 0);
      })
      .on('touchend', function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        setTimeout(() => {
          onAxisValueClick(d as string, 'domain');
        }, 0);
      })
      .on('pointerup', function(event, d) {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === 'touch') {
          event.preventDefault();
          event.stopPropagation();
          setTimeout(() => {
            onAxisValueClick(d as string, 'domain');
          }, 0);
        }
      })
      .on('mousedown', function(event, d) {
        if (event.button === 0) { // Left mouse button only
          event.preventDefault();
          const element = this as SVGTextElement;
          element.setAttribute('data-mousedown-value', d as string);
        }
      })
      .on('mouseup', function(event, d) {
        const element = this as SVGTextElement;
        if (event.button === 0 && element.getAttribute('data-mousedown-value') === (d as string)) {
          event.preventDefault();
          event.stopPropagation();
          element.removeAttribute('data-mousedown-value');
          setTimeout(() => {
            onAxisValueClick(d as string, 'domain');
          }, 0);
        }
      })


    const yAxis = d3.axisLeft(yScale)
      .tickSize(0)
      .tickPadding(15);

    const yAxisGroup = contentGroup.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    yAxisGroup.selectAll('.domain')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2);
      
    yAxisGroup.selectAll('text')
      .attr('class', 'axis-value y-axis-value')
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#1e293b')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all') // Ensure pointer events work across platforms
      .style('-webkit-user-select', 'none') // Prevent text selection on WebKit
      .style('-moz-user-select', 'none') // Prevent text selection on Firefox
      .style('-ms-user-select', 'none') // Prevent text selection on IE/Edge
      .style('user-select', 'none') // Standard property
      .attr('dx', '-0.5em')
      .attr('dy', '0.35em')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('fill', '#10b981')
          .style('font-size', '13px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('fill', '#1e293b')
          .style('font-size', '12px');
      })
      .on('click', function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        setTimeout(() => {
          onAxisValueClick(d as string, 'granularity');
        }, 0);
      })
      .on('touchend', function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        setTimeout(() => {
          onAxisValueClick(d as string, 'granularity');
        }, 0);
      })
      .on('pointerup', function(event, d) {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === 'touch') {
          event.preventDefault();
          event.stopPropagation();
          setTimeout(() => {
            onAxisValueClick(d as string, 'granularity');
          }, 0);
        }
      })
      .on('mousedown', function(event, d) {
        if (event.button === 0) { // Left mouse button only
          event.preventDefault();
          const element = this as SVGTextElement;
          element.setAttribute('data-mousedown-value', d as string);
        }
      })
      .on('mouseup', function(event, d) {
        const element = this as SVGTextElement;
        if (event.button === 0 && element.getAttribute('data-mousedown-value') === (d as string)) {
          event.preventDefault();
          event.stopPropagation();
          element.removeAttribute('data-mousedown-value');
          setTimeout(() => {
            onAxisValueClick(d as string, 'granularity');
          }, 0);
        }
      })





    if (onRenderComplete) {
      setTimeout(() => onRenderComplete(), 100);
    }

  }, [dimensions, transform, competencyQuestions, domainCoverageValues, terminologyGranularityValues, cqPositions, onCQClick, onIntersectionHover, onExpandSubdomains, onAxisValueClick, onRenderComplete]);

  return (
    <div ref={containerRef} className="scatter-plot-container w-full h-full relative">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseLeave={onCanvasLeave}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu interference
        style={{ background: '#fafafa', userSelect: 'none' }} // Prevent text selection interference
      >
      </svg>
    </div>
  );
}