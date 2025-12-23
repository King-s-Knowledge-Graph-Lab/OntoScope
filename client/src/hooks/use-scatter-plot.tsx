import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { CompetencyQuestion } from '@shared/schema';

export interface ScatterPlotConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface ScatterPlotCallbacks {
  onCQClick: (cq: CompetencyQuestion) => void;
  onCanvasHover: (x: number, y: number, domainCoverage: string, terminologyGranularity: string) => void;
  onCanvasLeave: () => void;
  onExpandSubdomains?: () => void;
}

export function useScatterPlot(
  cqs: CompetencyQuestion[],
  domainCoverageValues: string[],
  terminologyGranularityValues: string[],
  config: ScatterPlotConfig,
  callbacks: ScatterPlotCallbacks
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLevel = useRef(1);
  const transform = useRef(d3.zoomIdentity);

  const createScales = useCallback(() => {
    const xScale = d3.scalePoint()
      .domain(domainCoverageValues)
      .range([config.margin.left, config.width - config.margin.right])
      .padding(0.1);

    const yScale = d3.scalePoint()
      .domain(terminologyGranularityValues)
      .range([config.height - config.margin.bottom, config.margin.top])
      .padding(0.1);

    return { xScale, yScale };
  }, [domainCoverageValues, terminologyGranularityValues, config]);

  const renderPlot = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    svg.selectAll("*").remove();

    const { xScale, yScale } = createScales();

    const g = svg.append("g")
      .attr("transform", transform.current.toString());

    const gridGroup = g.append("g").attr("class", "grid");

    domainCoverageValues.forEach(value => {
      const x = xScale(value) || 0;
      gridGroup.append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", config.margin.top)
        .attr("y2", config.height - config.margin.bottom)
        .attr("stroke", "hsl(20, 5.9%, 90%)")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);
    });

    terminologyGranularityValues.forEach(value => {
      const y = yScale(value) || 0;
      gridGroup.append("line")
        .attr("x1", config.margin.left)
        .attr("x2", config.width - config.margin.right)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", "hsl(20, 5.9%, 90%)")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);
    });

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${config.height - config.margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "hsl(25, 5.3%, 44.7%)");

    g.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${config.margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "hsl(25, 5.3%, 44.7%)");

    g.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", config.width / 2)
      .attr("y", config.height - 10)
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", "hsl(20, 14.3%, 4.1%)")
      .text("Domain Coverage");

    g.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -config.height / 2)
      .attr("y", 15)
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", "hsl(20, 14.3%, 4.1%)")
      .text("Terminology Granularity");

    const cqsByIntersection = new Map<string, CompetencyQuestion[]>();
    cqs.filter(cq => cq.isRelevant).forEach(cq => {
      const key = `${cq.domainCoverage}-${cq.terminologyGranularity}`;
      if (!cqsByIntersection.has(key)) {
        cqsByIntersection.set(key, []);
      }
      cqsByIntersection.get(key)!.push(cq);
    });

    cqsByIntersection.forEach((cqsInGroup, intersectionKey) => {
      const [domainCoverage, terminologyGranularity] = intersectionKey.split('-');
      const centerX = xScale(domainCoverage) || 0;
      const centerY = yScale(terminologyGranularity) || 0;
      
      g.append("circle")
        .attr("class", "cq-group-bg")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", 20)
        .style("fill", "hsl(207, 90%, 90%)")
        .style("stroke", "hsl(207, 90%, 54%)")
        .style("stroke-width", 2)
        .style("opacity", 0.3);

      cqsInGroup.forEach((cq, index) => {
        const angle = (index * 2 * Math.PI) / cqsInGroup.length;
        const radius = cqsInGroup.length > 1 ? 12 : 0;
        const dotX = centerX + Math.cos(angle) * radius;
        const dotY = centerY + Math.sin(angle) * radius;

        g.append("circle")
          .datum(cq)
          .attr("class", "cq-dot")
          .attr("cx", dotX)
          .attr("cy", dotY)
          .attr("r", 6)
          .style("fill", "hsl(207, 90%, 54%)")
          .style("cursor", "pointer")
          .style("transition", "all 0.2s ease")
          .on("mouseover", function(this: SVGCircleElement) {
            d3.select(this)
              .attr("r", 8)
              .style("filter", "drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3))");
          })
          .on("mouseout", function(this: SVGCircleElement) {
            d3.select(this)
              .attr("r", 6)
              .style("filter", "none");
          })
          .on("click", (event: any, d: CompetencyQuestion) => {
            callbacks.onCQClick(d);
          });
      });

      g.append("text")
        .attr("x", centerX)
        .attr("y", centerY - 30)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "hsl(207, 90%, 54%)")
        .text(`${cqsInGroup.length} CQs`);
    });

    type IntersectionData = { dcv: string; tgv: string };
    const intersectionAreas = g.selectAll(".intersection-area")
      .data(domainCoverageValues.flatMap(dcv =>
        terminologyGranularityValues.map(tgv => ({ dcv, tgv }))
      ))
      .enter()
      .append("rect")
      .attr("class", "intersection-area")
      .attr("x", (d: IntersectionData) => (xScale(d.dcv) || 0) - 40)
      .attr("y", (d: IntersectionData) => (yScale(d.tgv) || 0) - 40)
      .attr("width", 80)
      .attr("height", 80)
      .style("fill", "transparent")
      .style("stroke", "hsl(207, 90%, 54%)")
      .style("stroke-width", 0)
      .style("cursor", "pointer")
      .on("mouseover", function(this: SVGRectElement, event: any, d: IntersectionData) {
        d3.select(this).style("stroke-width", 2).style("stroke-dasharray", "5,5");
      })
      .on("mouseout", function(this: SVGRectElement) {
        d3.select(this).style("stroke-width", 0);
      })
      .on("click", (event: any, d: IntersectionData) => {
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        callbacks.onCanvasHover(mouseX, mouseY, d.dcv, d.tgv);
      });

    const expandButtonX = config.width - config.margin.right + 20;
    const expandButtonY = config.height - config.margin.bottom;
    
    g.append("circle")
      .attr("class", "expand-button")
      .attr("cx", expandButtonX)
      .attr("cy", expandButtonY)
      .attr("r", 15)
      .style("fill", "hsl(207, 90%, 54%)")
      .style("cursor", "pointer")
      .style("opacity", 0.8)
      .on("mouseover", function(this: SVGCircleElement) {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function(this: SVGCircleElement) {
        d3.select(this).style("opacity", 0.8);
      })
      .on("click", () => {
        callbacks.onExpandSubdomains?.();
      });

    g.append("text")
      .attr("class", "expand-button-text")
      .attr("x", expandButtonX)
      .attr("y", expandButtonY + 5)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .style("cursor", "pointer")
      .text("...")
      .on("click", () => {
        callbacks.onExpandSubdomains?.();
      });

  }, [cqs, createScales, config, callbacks]);

  const setupZoom = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event: any) => {
        transform.current = event.transform;
        zoomLevel.current = event.transform.k;
        renderPlot();
      });

    svg.call(zoom as any);
  }, [renderPlot]);

  useEffect(() => {
    renderPlot();
    setupZoom();
  }, [renderPlot, setupZoom]);

  const zoomIn = useCallback(() => {
    const svg = d3.select(svgRef.current);
    (svg.transition() as any).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      transform.current.scale(1.5)
    );
  }, []);

  const zoomOut = useCallback(() => {
    const svg = d3.select(svgRef.current);
    (svg.transition() as any).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      transform.current.scale(0.75)
    );
  }, []);

  const resetZoom = useCallback(() => {
    const svg = d3.select(svgRef.current);
    (svg.transition() as any).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity
    );
  }, []);

  return {
    svgRef,
    zoomLevel: zoomLevel.current,
    zoomIn,
    zoomOut,
    resetZoom
  };
}
