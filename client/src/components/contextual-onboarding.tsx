import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  ChevronRight,
  Lightbulb,
  Target,
  Eye,
  MousePointer,
  Grid3X3,
  Zap,
  Edit3,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  icon: any;
  position:
    | "top-center"
    | "right-center"
    | "left-center"
    | "bottom-center"
    | "top-right"
    | "bottom-left"
    | "top-left"
    | "center";
  targetElement?: string; // CSS selector for the element to highlight
  triggerCondition:
    | "after-api-key"
    | "after-session-created"
    | "after-cq-added"
    | "immediate";
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "domain",
    title: "Step 1: Input Domain Name",
    content:
      "After entering your API key, input your domain of interest in this field (e.g., 'Healthcare Informatics', 'Smart Cities'). Then click 'Generate Space' to create your CQ visualization.",
    icon: Target,
    position: "top-center",
    targetElement: "#domain-input",
    triggerCondition: "after-api-key",
  },
  {
    id: "scatter-plot",
    title: "Step 2: Explore Your CQ Space",
    content:
      "This scatter plot shows Domain Coverage (X-axis) vs Terminology Granularity (Y-axis). Use your mouse to zoom and pan around the space.",
    icon: Eye,
    position: "top-center",
    targetElement: ".scatter-plot-container",
    triggerCondition: "after-session-created",
  },
  {
    id: "intersections",
    title: "Step 3: Expand Domain Coverage",
    content:
      "Click this '+' button to generate additional subdomains and broaden your domain coverage.",
    icon: Grid3X3,
    position: "top-center",
    targetElement: ".subdomain-expand-button",
    triggerCondition: "after-session-created",
  },
  {
    id: "domain-coverage",
    title: "Step 4: Add Terminology Levels",
    content:
      "Click this '+' button to add deeper terminology granularity levels.",
    icon: Zap,
    position: "right-center",
    targetElement: ".granularity-expand-button",
    triggerCondition: "after-session-created",
  },
  {
    id: "delete-dimension",
    title: "Step 5: Delete Dimension Values",
    content: "Click to delete a dimension value on axes.",
    icon: X,
    position: "top-left",
    targetElement: ".x-axis-first-value",
    triggerCondition: "after-session-created",
  },
  {
    id: "add-competency-questions",
    title: "Step 6: Add Competency Questions",
    content: "Click on any intersection area to add competency questions.",
    icon: Edit3,
    position: "right-center",
    targetElement: ".step6-highlighted-intersection",
    triggerCondition: "after-session-created",
  },
  {
    id: "refine-terminology",
    title: "Step 7: Refine Terminology",
    content: "Click a terminology to refine it with its corresponding CQ.",
    icon: Target,
    position: "top-center",
    targetElement: ".intersection-terminology",
    triggerCondition: "after-cq-added",
  },
];

interface ContextualOnboardingProps {
  isActive: boolean;
  onClose: () => void;
  currentTrigger:
    | "after-api-key"
    | "after-session-created"
    | "after-cq-added"
    | "immediate";
  hasSession: boolean;
}

export function ContextualOnboarding({
  isActive,
  onClose,
  currentTrigger,
  hasSession,
}: ContextualOnboardingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightedElement, setHighlightedElement] =
    useState<HTMLElement | null>(null);
  const [, forceUpdate] = useState({});

  const relevantSteps = onboardingSteps.filter(
    (step) => step.triggerCondition === currentTrigger,
  );

  const currentStep = relevantSteps[currentStepIndex];

  useEffect(() => {
    if (highlightedElement) {
      highlightedElement.style.boxShadow = "";
      highlightedElement.style.zIndex = "";
      highlightedElement.style.transition = "";
      setHighlightedElement(null);
    }

    if (currentStep?.targetElement && isActive) {
      if (currentStep.id === "scatter-plot") {
        setTimeout(() => {
          const svgContainer = document.querySelector(
            ".scatter-plot-container svg",
          );
          if (svgContainer) {
            const allTexts = svgContainer.querySelectorAll("text");
            console.log("Found text elements:", allTexts.length);

            allTexts.forEach((el) => {
              const element = el as SVGTextElement;
              const textContent = element.textContent?.trim();
              console.log("Text content:", textContent);
              if (textContent && textContent.length > 0) {
                element.style.filter =
                  "drop-shadow(0 0 8px rgba(59, 130, 246, 1))";
                element.style.fontWeight = "bold";
                element.style.fill = "rgba(59, 130, 246, 1)";
                element.style.transition = "all 0.3s ease";
              }
            });

            const allRects = svgContainer.querySelectorAll("rect");
            console.log("Found rect elements:", allRects.length);

            allRects.forEach((el) => {
              const element = el as SVGRectElement;
              const width = element.getAttribute("width");
              const height = element.getAttribute("height");
              if (
                width &&
                height &&
                parseFloat(width) > 5 &&
                parseFloat(height) > 5
              ) {
                element.style.stroke = "rgba(59, 130, 246, 1)";
                element.style.strokeWidth = "3";
                element.style.animation = "pulse 2s infinite";
                element.style.filter =
                  "drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))";
                element.style.transition = "all 0.3s ease";
              }
            });

            const allCircles = svgContainer.querySelectorAll("circle");
            console.log("Found circle elements:", allCircles.length);

            allCircles.forEach((el) => {
              const element = el as SVGCircleElement;
              element.style.stroke = "rgba(59, 130, 246, 1)";
              element.style.strokeWidth = "3";
              element.style.filter =
                "drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))";
              element.style.transition = "all 0.3s ease";
            });
          }
        }, 200); // Small delay to ensure SVG is rendered
      } else if (currentStep.id === "intersections") {
        const addButton = document.querySelector(".subdomain-expand-button");
        if (addButton) {
          const element = addButton as HTMLElement;
          element.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.5)";
          element.style.transform = "scale(1.1)";
          element.style.transition = "all 0.3s ease";
          element.style.animation = "pulse 2s infinite";
          setHighlightedElement(element);
        }
      } else if (currentStep.id === "domain-coverage") {
        const addButton = document.querySelector(".granularity-expand-button");
        if (addButton) {
          const element = addButton as HTMLElement;
          element.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.5)";
          element.style.transform = "scale(1.1)";
          element.style.transition = "all 0.3s ease";
          element.style.animation = "pulse 2s infinite";
          setHighlightedElement(element);
        }
      } else if (currentStep.id === "delete-dimension") {
        setTimeout(() => {
          const svgContainer = document.querySelector(
            ".scatter-plot-container svg",
          );
          if (svgContainer) {
            const allTexts = svgContainer.querySelectorAll("text");
            let firstXAxisText = null;
            for (let i = 0; i < allTexts.length; i++) {
              const text = allTexts[i] as SVGTextElement;
              const textContent = text.textContent?.trim();
              if (
                textContent &&
                textContent.length > 0 &&
                !textContent.includes("-level")
              ) {
                firstXAxisText = text;
                break;
              }
            }

            if (firstXAxisText) {
              firstXAxisText.style.filter =
                "drop-shadow(0 0 12px rgba(220, 38, 127, 1))";
              firstXAxisText.style.fontWeight = "bold";
              firstXAxisText.style.fill = "rgba(220, 38, 127, 1)";
              firstXAxisText.style.fontSize = "16px";
              firstXAxisText.style.animation = "pulse 2s infinite";
              firstXAxisText.style.transition = "all 0.3s ease";
              firstXAxisText.classList.add("x-axis-first-value");
            }
          }
        }, 200);
      } else if (currentStep.id === "add-competency-questions") {
        setTimeout(() => {
          const svgContainer = document.querySelector(".scatter-plot-container svg");
          if (svgContainer) {
            const intersections = svgContainer.querySelectorAll(".intersection-area-visual");
            if (intersections.length > 0) {
              const topLeftIntersection = intersections[0] as SVGRectElement;
              
              topLeftIntersection.setAttribute('data-original-stroke', topLeftIntersection.getAttribute('stroke') || '');
              topLeftIntersection.setAttribute('data-original-stroke-width', topLeftIntersection.getAttribute('stroke-width') || '');
              topLeftIntersection.setAttribute('data-original-fill', topLeftIntersection.getAttribute('fill') || '');
              topLeftIntersection.setAttribute('data-original-filter', topLeftIntersection.style.filter || '');
              topLeftIntersection.setAttribute('data-original-animation', topLeftIntersection.style.animation || '');
              
              topLeftIntersection.setAttribute('stroke', 'rgba(59, 130, 246, 0.9)');
              topLeftIntersection.setAttribute('stroke-width', '4');
              topLeftIntersection.setAttribute('fill', 'rgba(59, 130, 246, 0.2)');
              topLeftIntersection.style.filter = "drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))";
              topLeftIntersection.style.animation = "pulse 2s infinite";
              topLeftIntersection.style.transition = "all 0.3s ease";
              
              topLeftIntersection.classList.add('step6-highlighted-intersection');
              setHighlightedElement(topLeftIntersection as any);
            }
          }
        }, 300);
      } else if (currentStep.id === "refine-terminology") {
        setTimeout(() => {
          const svgContainer = document.querySelector(".scatter-plot-container svg");
          if (svgContainer) {
            const terminologyTexts = svgContainer.querySelectorAll("text");
            let terminologyToHighlight = null;
            
            console.log("Step 7: Looking for terminology to highlight. Found", terminologyTexts.length, "text elements");
            
            for (let i = 0; i < terminologyTexts.length; i++) {
              const text = terminologyTexts[i] as SVGTextElement;
              const textContent = text.textContent?.trim();
              console.log("Checking text:", textContent);
              
              if (textContent && 
                  textContent.length > 0 && 
                  !textContent.includes('-level') &&
                  !textContent.includes('First-level') &&
                  !textContent.includes('Second-level') &&
                  !textContent.includes('Third-level')) {
                terminologyToHighlight = text;
                console.log("Found terminology to highlight:", textContent);
                break;
              }
            }
            
            if (terminologyToHighlight) {
              terminologyToHighlight.setAttribute('data-original-filter', terminologyToHighlight.style.filter || '');
              terminologyToHighlight.setAttribute('data-original-font-weight', terminologyToHighlight.style.fontWeight || '');
              terminologyToHighlight.setAttribute('data-original-fill', terminologyToHighlight.style.fill || '');
              terminologyToHighlight.setAttribute('data-original-font-size', terminologyToHighlight.style.fontSize || '');
              terminologyToHighlight.setAttribute('data-original-animation', terminologyToHighlight.style.animation || '');
              
              terminologyToHighlight.style.filter = "drop-shadow(0 0 12px rgba(34, 197, 94, 1))";
              terminologyToHighlight.style.fontWeight = "bold";
              terminologyToHighlight.style.fill = "rgba(34, 197, 94, 1)";
              terminologyToHighlight.style.fontSize = "16px";
              terminologyToHighlight.style.animation = "pulse 2s infinite";
              terminologyToHighlight.style.transition = "all 0.3s ease";
              
              terminologyToHighlight.classList.add('step7-highlighted-terminology');
              setHighlightedElement(terminologyToHighlight as any); // SVGTextElement to HTMLElement cast
              console.log("Successfully highlighted terminology:", terminologyToHighlight.textContent);
            } else {
              console.log("No terminology found to highlight");
            }
          }
        }, 500); // Increased delay to ensure elements are rendered
      } else {
        const element = document.querySelector(
          currentStep.targetElement,
        ) as HTMLElement;
        if (element) {
          setHighlightedElement(element);
          element.style.position = "relative";
          element.style.zIndex = "1000";
          element.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.5)";
          element.style.borderRadius = "8px";
          element.style.transition = "all 0.3s ease";
        }
      }
    }

    return () => {
      const highlightedTerminology = document.querySelector('.step7-highlighted-terminology');
      if (highlightedTerminology) {
        const element = highlightedTerminology as SVGTextElement;
        
        element.style.filter = element.getAttribute('data-original-filter') || '';
        element.style.fontWeight = element.getAttribute('data-original-font-weight') || '';
        element.style.fill = element.getAttribute('data-original-fill') || '';
        element.style.fontSize = element.getAttribute('data-original-font-size') || '';
        element.style.animation = element.getAttribute('data-original-animation') || '';
        element.style.transition = '';
        
        element.removeAttribute('data-original-filter');
        element.removeAttribute('data-original-font-weight');
        element.removeAttribute('data-original-fill');
        element.removeAttribute('data-original-font-size');
        element.removeAttribute('data-original-animation');
        element.classList.remove('step7-highlighted-terminology');
      }

      const highlightedIntersection = document.querySelector('.step6-highlighted-intersection');
      if (highlightedIntersection) {
        const element = highlightedIntersection as SVGRectElement;
        
        element.setAttribute('stroke', element.getAttribute('data-original-stroke') || '');
        element.setAttribute('stroke-width', element.getAttribute('data-original-stroke-width') || '');
        element.setAttribute('fill', element.getAttribute('data-original-fill') || '');
        element.style.filter = element.getAttribute('data-original-filter') || '';
        element.style.animation = element.getAttribute('data-original-animation') || '';
        element.style.transition = '';
        
        element.removeAttribute('data-original-stroke');
        element.removeAttribute('data-original-stroke-width');
        element.removeAttribute('data-original-fill');
        element.removeAttribute('data-original-filter');
        element.removeAttribute('data-original-animation');
        element.classList.remove('step6-highlighted-intersection');
      }

      const svgContainer = document.querySelector(".scatter-plot-container svg");
      if (svgContainer) {
        const textElements = svgContainer.querySelectorAll("text.x-axis-first-value");
        textElements.forEach((el) => {
          const element = el as SVGTextElement;
          element.style.filter = "";
          element.style.fontWeight = "";
          element.style.fill = "";
          element.style.fontSize = "";
          element.style.animation = "";
          element.style.transition = "";
          element.classList.remove("x-axis-first-value");
        });

        const rectElements = svgContainer.querySelectorAll("rect");
        rectElements.forEach((el) => {
          const element = el as SVGRectElement;
          element.style.stroke = "";
          element.style.strokeWidth = "";
          element.style.animation = "";
          element.style.filter = "";
          element.style.transition = "";
        });

        const circleElements = svgContainer.querySelectorAll("circle");
        circleElements.forEach((el) => {
          const element = el as SVGCircleElement;
          element.style.stroke = "";
          element.style.strokeWidth = "";
          element.style.filter = "";
          element.style.transition = "";
        });
      }

      const intersectionHighlight = document.querySelector(
        ".intersection-highlight",
      );
      if (intersectionHighlight) {
        intersectionHighlight.remove();
      }

      const addButtons = document.querySelectorAll(
        ".subdomain-expand-button, .granularity-expand-button",
      );
      addButtons.forEach((el) => {
        const element = el as HTMLElement;
        element.style.boxShadow = "";
        element.style.transform = "";
        element.style.animation = "";
        element.style.transition = "";
      });

      const axisElements = document.querySelectorAll(".axis-value");
      const svgTexts = document.querySelectorAll("svg text[cursor='pointer']");

      axisElements.forEach((el) => {
        const element = el as HTMLElement;
        element.style.boxShadow = "";
        element.style.transform = "";
        element.style.animation = "";
        element.style.transition = "";
        element.style.filter = "";
        element.style.fontWeight = "";
      });

      svgTexts.forEach((el) => {
        const element = el as HTMLElement;
        element.style.animation = "";
        element.style.transition = "";
        element.style.filter = "";
        element.style.fontWeight = "";
      });
    };
  }, [currentStep, isActive]);

  const handleNext = () => {
    if (currentStepIndex < relevantSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    setCurrentStepIndex(0);
    onClose();
  };

  useEffect(() => {
    if (isActive) {
      setCurrentStepIndex(0);
    }
  }, [currentTrigger, isActive]);

  useEffect(() => {
    if (
      isActive &&
      (currentStep?.id === "domain" ||
        currentStep?.id === "intersections" ||
        currentStep?.id === "domain-coverage" ||
        currentStep?.id === "delete-dimension" ||
        currentStep?.id === "add-competency-questions" ||
        currentStep?.id === "refine-terminology")
    ) {
      forceUpdate({});
    }
  }, [isActive, currentStep]);

  if (!isActive || !currentStep) return null;

  const Icon = currentStep.icon;

  const getPositionStyles = () => {
    if (currentStep.id === "domain" && currentStep.targetElement) {
      const element = document.querySelector(currentStep.targetElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const leftPosition = Math.max(
          20,
          Math.min(viewportWidth - 340, rect.left + rect.width / 2 - 160),
        );
        const topPosition = rect.bottom + 15;

        return {
          position: "fixed" as const,
          zIndex: 50,
          left: `${leftPosition}px`,
          top: `${topPosition}px`,
          width: "320px",
        };
      }
    }

    if (currentStep.id === "intersections") {
      const addButton = document.querySelector(".subdomain-expand-button");
      if (addButton) {
        const rect = addButton.getBoundingClientRect();
        const leftPosition = rect.left + rect.width / 2 - 160; // Center horizontally with button
        const topPosition = rect.top - 235; // Position slightly above the button

        return {
          position: "fixed" as const,
          zIndex: 50,
          left: `${leftPosition}px`,
          top: `${topPosition}px`,
          width: "320px",
        };
      }
    }

    if (currentStep.id === "domain-coverage") {
      const addButton = document.querySelector(".granularity-expand-button");
      if (addButton) {
        const rect = addButton.getBoundingClientRect();
        const leftPosition = rect.right + 15; // Position directly to the right
        const topPosition = rect.top + rect.height / 2 - 60; // Center vertically with button

        return {
          position: "fixed" as const,
          zIndex: 50,
          left: `${leftPosition}px`,
          top: `${topPosition}px`,
          width: "320px",
        };
      }
    }

    if (currentStep.id === "delete-dimension") {
      const svgContainer = document.querySelector(
        ".scatter-plot-container svg",
      );
      if (svgContainer) {
        const allTexts = svgContainer.querySelectorAll("text");
        let firstXAxisText = null;
        for (let i = 0; i < allTexts.length; i++) {
          const text = allTexts[i] as SVGTextElement;
          const textContent = text.textContent?.trim();
          if (
            textContent &&
            textContent.length > 0 &&
            !textContent.includes("-level")
          ) {
            firstXAxisText = text;
            break;
          }
        }

        if (firstXAxisText) {
          const rect = firstXAxisText.getBoundingClientRect();
          const leftPosition = rect.left + rect.width / 2 - 160; // Center horizontally above the text
          const topPosition = rect.top - 170; // Position slightly above the text

          return {
            position: "fixed" as const,
            zIndex: 50,
            left: `${leftPosition}px`,
            top: `${topPosition}px`,
            width: "320px",
          };
        }
      }
    }

    if (currentStep.id === "add-competency-questions") {
      let targetIntersection = document.querySelector(".step6-highlighted-intersection") as SVGRectElement;
      
      if (!targetIntersection) {
        const intersections = document.querySelectorAll(".intersection-area-visual");
        if (intersections.length > 0) {
          targetIntersection = intersections[0] as SVGRectElement;
        }
      }
      
      if (targetIntersection) {
        const rect = targetIntersection.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const tooltipWidth = 320;
        
        let leftPosition = rect.right + 20;
        let topPosition = rect.top + rect.height / 2 - 60; // Center vertically with intersection
        
        if (leftPosition + tooltipWidth > viewportWidth - 20) {
          leftPosition = Math.max(20, rect.left - tooltipWidth - 20);
        }
        
        topPosition = Math.max(80, Math.min(topPosition, window.innerHeight - 150));

        return {
          position: "fixed" as const,
          zIndex: 50,
          left: `${leftPosition}px`,
          top: `${topPosition}px`,
          width: "320px",
        };
      }
    }

    if (currentStep.id === "refine-terminology") {
      const svgContainer = document.querySelector(".scatter-plot-container svg");
      if (svgContainer) {
        const terminologyTexts = svgContainer.querySelectorAll("text");
        let terminologyToHighlight = null;
        
        for (let i = 0; i < terminologyTexts.length; i++) {
          const text = terminologyTexts[i] as SVGTextElement;
          const textContent = text.textContent?.trim();
          
          if (textContent && 
              textContent.length > 0 && 
              !textContent.includes('-level') &&
              !textContent.includes('First-level') &&
              !textContent.includes('Second-level') &&
              !textContent.includes('Third-level')) {
            terminologyToHighlight = text;
            break;
          }
        }
        
        if (terminologyToHighlight) {
          const rect = terminologyToHighlight.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          const tooltipWidth = 320;
          const tooltipHeight = 150; // Approximate height
          const spacing = 60; // Clear space between tooltip and terminology
          
          let leftPosition = rect.left + rect.width / 2 - tooltipWidth / 2;
          let topPosition = rect.top - tooltipHeight - spacing; // Position well above
          
          if (leftPosition < 10) leftPosition = 10;
          if (leftPosition + tooltipWidth > viewportWidth - 10) {
            leftPosition = viewportWidth - tooltipWidth - 10;
          }
          
          if (topPosition < 10) {
            topPosition = rect.bottom + spacing;
          }
          
          if (topPosition + tooltipHeight > viewportHeight - 10) {
            topPosition = rect.top + rect.height / 2 - tooltipHeight / 2;
            leftPosition = rect.right + spacing;
            
            if (leftPosition + tooltipWidth > viewportWidth - 10) {
              leftPosition = rect.left - tooltipWidth - spacing;
            }
          }

          return {
            position: "fixed" as const,
            zIndex: 50,
            left: `${leftPosition}px`,
            top: `${topPosition}px`,
            width: "320px",
          };
        }
      }
    }

    return null;
  };

  const getCSSPositionClass = () => {
    const baseStyles = "fixed z-50 transform";

    switch (currentStep.position) {
      case "top-center":
        return `${baseStyles} top-20 left-1/2 -translate-x-1/2`;
      case "bottom-center":
        return `${baseStyles} bottom-20 left-1/2 -translate-x-1/2`;
      case "right-center":
        return `${baseStyles} right-4 top-1/2 -translate-y-1/2`;
      case "left-center":
        return `${baseStyles} left-4 top-1/2 -translate-y-1/2`;
      case "top-right":
        return `${baseStyles} top-20 right-4`;
      case "bottom-left":
        return `${baseStyles} bottom-20 left-4`;
      case "top-left":
        return `${baseStyles} top-20 left-4`;
      case "center":
        return `${baseStyles} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`;
      default:
        return `${baseStyles} top-20 left-1/2 -translate-x-1/2`;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" />

      <Card
        className={
          getPositionStyles()
            ? "w-80 bg-white border border-blue-200 shadow-2xl"
            : `${getCSSPositionClass()} w-80 bg-white border border-blue-200 shadow-2xl`
        }
        style={getPositionStyles() || undefined}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {currentStep.title}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {currentStep.content}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {relevantSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index <= currentStepIndex ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {currentStepIndex + 1} of {relevantSteps.length}
              </span>
              <Button
                onClick={handleNext}
                size="sm"
                className="h-7 px-3 text-xs"
              >
                {currentStepIndex === relevantSteps.length - 1
                  ? "Got it!"
                  : "Next"}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
