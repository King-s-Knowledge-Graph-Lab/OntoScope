import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Lightbulb, Target, Zap, MousePointer, Eye, Edit3, Grid3X3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: string;
  icon: any;
  highlight?: string;
  triggerCondition?: 'immediate' | 'after-api-key' | 'after-first-domain' | 'after-session-created' | 'hover-intersection';
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to OntoScope",
    description: "Your AI-powered ontology engineering companion",
    content: "OntoScope helps you systematically explore competency questions (CQs) for your domain. You'll create a visual space where Domain Coverage meets Terminology Granularity, making ontology scoping intuitive and comprehensive.",
    icon: Target,
    highlight: "You're ready to start! Let's create your first CQ space.",
    triggerCondition: 'after-api-key',
  },
  {
    id: "domain",
    title: "Step 1: Enter Your Domain",
    description: "Define your target ontology domain",
    content: "Look at the top navigation bar and find the 'Target Domain' input field. Enter your domain of interest (e.g., 'Healthcare Informatics', 'Smart Cities', 'Educational Technology'). The AI will automatically generate relevant subdomains and terminology levels.",
    icon: Target,
    highlight: "Enter a domain name in the 'Target Domain' field at the top, then click 'Generate Space'",
    triggerCondition: 'immediate',
  },
  {
    id: "scatter-plot",
    title: "Step 2: Explore Your CQ Space",
    description: "Navigate the visual space",
    content: "The scatter plot shows Domain Coverage (X-axis) vs Terminology Granularity (Y-axis). Each intersection can contain multiple CQs. Use your mouse to zoom in/out and pan around to explore different areas in detail.",
    icon: Eye,
    highlight: "Zoom in/out with your mouse wheel and drag to pan around the space",
    triggerCondition: 'after-session-created',
  },
  {
    id: "intersections",
    title: "Step 3: Add Competency Questions",
    description: "Generate CQs at intersections",
    content: "Hover over any intersection to see AI-generated CQ suggestions. Each suggestion includes the CQ text, suggested terminology, and CQ type (Subject, Property, Object). Click on an intersection to add new CQs to your design space.",
    icon: MousePointer,
    highlight: "Hover over intersection areas to see CQ suggestions, then click to add them",
    triggerCondition: 'after-session-created',
  },
  {
    id: "domain-coverage",
    title: "Step 4: Expand Domain Coverage",
    description: "Broaden your domain scope",
    content: "Use the '+' button in the bottom bar to generate additional subdomains. This expands the breadth of your domain coverage. You can also remove subdomains by hovering over them and clicking the '-' button that appears.",
    icon: Grid3X3,
    highlight: "Click the '+' button in the bottom 'Subdomains' bar to expand domain coverage",
    triggerCondition: 'after-session-created',
  },
  {
    id: "terminology",
    title: "Step 5: Add Terminology Levels",
    description: "Deepen terminology granularity",
    content: "Use the '+' button in the left bar to add deeper terminology levels. Each level represents units contained within the previous level - following 'is part of' relationships. You can remove the deepest level if needed.",
    icon: Zap,
    highlight: "Click the '+' button in the left 'Terminology Granularity' bar to add deeper levels",
    triggerCondition: 'after-session-created',
  },
  {
    id: "editing",
    title: "Step 6: Refine Your CQs",
    description: "Perfect your competency questions",
    content: "Click on any competency question marker in the space to open its details. You can edit the text directly, mark questions as irrelevant, generate new terminology suggestions, or adjust the CQ type. Changes save automatically.",
    icon: Edit3,
    highlight: "Click on any CQ marker in the space to edit and refine it",
    triggerCondition: 'after-session-created',
  },
];

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrigger?: 'after-api-key' | 'after-session-created' | 'immediate';
  hasSession?: boolean;
}

export function OnboardingGuide({ isOpen, onClose, currentTrigger = 'immediate', hasSession = false }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const relevantSteps = onboardingSteps.filter(step => {
    if (currentTrigger === 'after-api-key') {
      return step.triggerCondition === 'after-api-key' || step.triggerCondition === 'immediate';
    }
    if (currentTrigger === 'after-session-created') {
      return step.triggerCondition === 'after-session-created';
    }
    return step.triggerCondition === 'immediate' || step.triggerCondition === undefined;
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen, currentTrigger]);

  const handleNext = () => {
    if (currentStep < relevantSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const currentStepData = relevantSteps[currentStep];
  if (!currentStepData) return null;
  
  const Icon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 text-center">
            Getting Started Guide
          </DialogTitle>
          <p className="text-sm text-gray-500 text-center mt-2">
            {currentTrigger === 'after-api-key' ? 'Ready to create your first CQ space!' :
             currentTrigger === 'after-session-created' ? 'Learn how to explore your CQ space' :
             'Learn the basics of OntoScope'}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            {relevantSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="text-center">
            <Badge variant="secondary" className="text-sm">
              Step {currentStep + 1} of {relevantSteps.length}
            </Badge>
          </div>

          <Card className="border-none shadow-none">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">
                {currentStepData.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                {currentStepData.content}
              </p>
              
              {currentStepData.highlight && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-800 font-medium text-sm">
                      {currentStepData.highlight}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <Button
              onClick={handleNext}
              className="flex items-center space-x-2"
            >
              <span>
                {currentStep === relevantSteps.length - 1 ? "Got it!" : "Next"}
              </span>
              {currentStep !== relevantSteps.length - 1 && (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
