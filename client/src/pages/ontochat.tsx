import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScatterPlot } from "@/components/scatter-plot";
import { CQDetailsDialog } from "@/components/cq-details-dialog";
import { AddItemsDialog } from "@/components/add-items-dialog";
import { SubdomainSuggestionsDialog } from "@/components/subdomain-suggestions-dialog";
import { GranularitySuggestionsDialog } from "@/components/granularity-suggestions-dialog";
import { ContextualOnboarding } from "@/components/contextual-onboarding";
import { AxisValueDialog } from "@/components/axis-value-dialog";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Download, ThumbsDown, Plus } from "lucide-react";
import logoPath from "@assets/image_1759861178181.png";
import type {
  CompetencyQuestion,
  DimensionValue,
  CQSession,
} from "@shared/schema";

interface CQSessionData {
  session: CQSession;
  domainCoverageValues: DimensionValue[];
  terminologyGranularityValues: DimensionValue[];
  competencyQuestions: CompetencyQuestion[];
}

export default function OntoScope() {
  const [domain, setDomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedCQ, setSelectedCQ] = useState<CompetencyQuestion | null>(null);
  const [showCQDetails, setShowCQDetails] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [intersectionInfo, setIntersectionInfo] = useState<{
    domainCoverage: string;
    terminologyGranularity: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{
      question: string;
      suggestedTerms: string[];
      type?: "subject" | "property" | "object";
    }>
  >([]);
  const [showSubdomainSuggestions, setShowSubdomainSuggestions] =
    useState(false);
  const [subdomainSuggestions, setSubdomainSuggestions] = useState<string[]>(
    [],
  );
  const [showGranularitySuggestions, setShowGranularitySuggestions] =
    useState(false);
  const [granularitySuggestions, setGranularitySuggestions] = useState<
    string[]
  >([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingTrigger, setOnboardingTrigger] = useState<'after-api-key' | 'after-session-created' | 'after-cq-added' | 'immediate'>('immediate');
  const [hasTriggeredStep7, setHasTriggeredStep7] = useState(false);
  const [scatterPlotRendered, setScatterPlotRendered] = useState(false);
  const [showAxisValueDialog, setShowAxisValueDialog] = useState(false);
  const [selectedAxisValue, setSelectedAxisValue] = useState<{
    value: string;
    type: "domain" | "granularity";
  } | null>(null);

  const { data: sessionData, isLoading: isLoadingSession } =
    useQuery<CQSessionData>({
      queryKey: ["/api/cq-sessions", currentSessionId],
      enabled: !!currentSessionId,
    });

  useEffect(() => {
    if (!sessionData || !currentSessionId || hasTriggeredStep7) {
      return;
    }

    const hasCQsWithTerminology = sessionData.competencyQuestions && 
      sessionData.competencyQuestions.some(cq => 
        cq.suggestedTerms && cq.suggestedTerms.length > 0
      );

    if (hasCQsWithTerminology) {
      const checkTerminologyRendered = () => {
        const svgContainer = document.querySelector(".scatter-plot-container svg");
        if (svgContainer) {
          const terminologyTexts = svgContainer.querySelectorAll("text");
          let hasRenderedTerminology = false;
          
          for (let i = 0; i < terminologyTexts.length; i++) {
            const text = terminologyTexts[i] as SVGTextElement;
            const textContent = text.textContent?.trim();
            
            if (textContent && 
                textContent.length > 0 && 
                !textContent.includes('-level') &&
                !textContent.includes('First-level') &&
                !textContent.includes('Second-level') &&
                !textContent.includes('Third-level')) {
              hasRenderedTerminology = true;
              break;
            }
          }
          
          if (hasRenderedTerminology) {
            setOnboardingTrigger('after-cq-added');
            setShowOnboarding(true);
            setHasTriggeredStep7(true);
            console.log("Step 7 onboarding triggered after terminology rendering");
          }
        }
      };

      setTimeout(checkTerminologyRendered, 100);
      setTimeout(checkTerminologyRendered, 500);
      setTimeout(checkTerminologyRendered, 1000);
    }
  }, [sessionData, currentSessionId, hasTriggeredStep7]);

  const createSessionMutation = useMutation({
    mutationFn: async (data: { domain: string; apiKey: string }) => {
      const response = await apiRequest("POST", "/api/cq-sessions", data);
      return response.json();
    },
    onSuccess: (data: CQSessionData) => {
      setCurrentSessionId(data.session.id);
      setHasTriggeredStep7(false);
      setScatterPlotRendered(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cq-sessions"] });
      
      setOnboardingTrigger('after-session-created');
    },
    onError: (error) => {
    },
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: async (params: {
      domainCoverage: string;
      terminologyGranularity: string;
      apiKey: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/cq-sessions/${currentSessionId}/suggest-cqs`,
        params,
      );
      return response.json();
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
    },
    onError: (error) => {
    },
  });

  const addCQMutation = useMutation({
    mutationFn: async (cqData: {
      question: string;
      domainCoverage: string;
      terminologyGranularity: string;
      suggestedTerms: string[];
      type?: string;
      x: number;
      y: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/cq-sessions/${currentSessionId}/competency-questions`,
        cqData,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cq-sessions", currentSessionId],
      });
      setShowAddItems(false);
    },
  });

  const markIrrelevantMutation = useMutation({
    mutationFn: async (cqId: string) => {
      const response = await apiRequest(
        "PATCH",
        `/api/competency-questions/${cqId}/relevance`,
        { isRelevant: false },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cq-sessions", currentSessionId],
      });
      setShowCQDetails(false);

    },
  });

  const markDimensionIrrelevantMutation = useMutation({
    mutationFn: async (dimensionId: string) => {
      const response = await apiRequest(
        "PATCH",
        `/api/dimension-values/${dimensionId}/relevance`,
        { isRelevant: false },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cq-sessions", currentSessionId],
      });

    },
  });

  const deleteGranularityLevelMutation = useMutation({
    mutationFn: async (levelValue: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/cq-sessions/${currentSessionId}/granularity-levels/${encodeURIComponent(levelValue)}`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cq-sessions", currentSessionId],
      });

    },
    onError: (error) => {
    },
  });

  const generateSubdomainSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/cq-sessions/${currentSessionId}/suggest-dimension-values`,
        { dimension: "domain_coverage", apiKey },
      );
      return response.json();
    },
    onSuccess: (data) => {
      setSubdomainSuggestions(data.values || []);
    },
    onError: (error) => {
    },
  });

  const generateGranularitySuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/cq-sessions/${currentSessionId}/suggest-dimension-values`,
        { dimension: "terminology_granularity", apiKey },
      );
      return response.json();
    },
    onSuccess: (data) => {
      setGranularitySuggestions(data.values || []);
    },
    onError: (error) => {
    },
  });

  const addSubdomainMutation = useMutation({
    mutationFn: async (subdomain: string) => {
      const response = await apiRequest(
        "POST",
        `/api/cq-sessions/${currentSessionId}/dimension-values`,
        {
          dimension: "domain_coverage",
          value: subdomain,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cq-sessions", currentSessionId],
      });
      setShowSubdomainSuggestions(false);

    },
  });

  const addGranularityLevelMutation = useMutation({
    mutationFn: async (level: string) => {
      const response = await apiRequest(
        "POST",
        `/api/cq-sessions/${currentSessionId}/dimension-values`,
        {
          dimension: "terminology_granularity",
          value: level,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cq-sessions", currentSessionId],
      });
      setShowGranularitySuggestions(false);

    },
  });

  const deleteDimensionMutation = useMutation({
    mutationFn: async (dimensionId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/dimension-values/${dimensionId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cq-sessions", currentSessionId],
      });

    },
    onError: (error) => {
    },
  });

  const handleExport = async () => {
    if (!currentSessionId) return;

    try {
      const response = await fetch(
        `/api/cq-sessions/${currentSessionId}/export`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cq-space-${sessionData?.session.domain.replace(/\s+/g, "-").toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);


    } catch (error) {
    }
  };

  const handleGenerateSpace = () => {
    if (!domain.trim() || !apiKey.trim() || !apiKey.startsWith('sk-')) {
      return;
    }
    createSessionMutation.mutate({ domain, apiKey });
  };

  const handleCQClick = (cq: CompetencyQuestion) => {
    setSelectedCQ(cq);
    setShowCQDetails(true);
  };

  const handleIntersectionHover = (
    x: number,
    y: number,
    domainCoverage: string,
    terminologyGranularity: string,
  ) => {
    setIntersectionInfo({ domainCoverage, terminologyGranularity });

    const subdomainCount =
      sessionData?.domainCoverageValues.filter((dv) => dv.isRelevant).length ||
      0;

    if (currentSessionId && apiKey) {
      generateSuggestionsMutation.mutate({
        domainCoverage,
        terminologyGranularity,
        apiKey,
      });
    }
    setShowAddItems(true);
  };

  const handleCanvasLeave = () => {
  };

  const handleScatterPlotRenderComplete = () => {
    if (!scatterPlotRendered && onboardingTrigger === 'after-session-created') {
      setScatterPlotRendered(true);
      setTimeout(() => {
        setShowOnboarding(true);
      }, 200);
    }
  };

  const handleAddCQ = (suggestion: {
    question: string;
    suggestedTerms: string[];
    type?: "subject" | "property" | "object";
  }) => {
    if (!intersectionInfo || !sessionData) return;

    const domainIndex = sessionData.domainCoverageValues.findIndex(
      (dv) => dv.value === intersectionInfo.domainCoverage,
    );
    const granularityIndex = sessionData.terminologyGranularityValues.findIndex(
      (dv) => dv.value === intersectionInfo.terminologyGranularity,
    );

    const xPositions = [0.2, 0.5, 0.8];
    const yPositions = [0.2, 0.5, 0.8];

    addCQMutation.mutate({
      question: suggestion.question,
      domainCoverage: intersectionInfo.domainCoverage,
      terminologyGranularity: intersectionInfo.terminologyGranularity,
      suggestedTerms: suggestion.suggestedTerms,
      type: suggestion.type,
      x: xPositions[domainIndex] || 0.5,
      y: yPositions[granularityIndex] || 0.5,
    });
  };

  const handleExpandSubdomains = () => {
    if (currentSessionId && apiKey) {
      generateSubdomainSuggestionsMutation.mutate();
      setShowSubdomainSuggestions(true);
    }
  };

  const handleAddSubdomain = (subdomain: string) => {
    addSubdomainMutation.mutate(subdomain);
  };

  const handleExpandGranularitySuggestions = () => {
    if (currentSessionId && apiKey) {
      generateGranularitySuggestionsMutation.mutate();
      setShowGranularitySuggestions(true);
    }
  };

  const handleAddGranularityLevel = (level: string) => {
    addGranularityLevelMutation.mutate(level);
  };

  const handleDeleteSubdomain = (value: string) => {
    const dimensionValue = sessionData?.domainCoverageValues.find(
      (dv) => dv.value === value,
    );
    if (dimensionValue) {
      deleteDimensionMutation.mutate(dimensionValue.id);
    }
  };

  const handleDeleteGranularityLevel = (value: string) => {
    if (currentSessionId) {
      deleteGranularityLevelMutation.mutate(value);
    }
  };

  const handleAxisValueClick = (value: string, axisType: "domain" | "granularity") => {
    setSelectedAxisValue({ value, type: axisType });
    setShowAxisValueDialog(true);
  };

  const handleAxisValueDelete = () => {
    if (!selectedAxisValue) return;
    
    if (selectedAxisValue.type === "domain") {
      handleDeleteSubdomain(selectedAxisValue.value);
    } else {
      handleDeleteGranularityLevel(selectedAxisValue.value);
    }
    
    setShowAxisValueDialog(false);
    setSelectedAxisValue(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/50 px-2 sm:px-4 md:px-6 py-2 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between z-10 shadow-lg gap-2 sm:gap-0">
        <div className="flex items-center">
          <img 
            src={logoPath} 
            alt="OntoScope" 
            className="h-8 sm:h-10 md:h-12 w-auto"
            data-testid="img-logo"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <Label
              htmlFor="domain-input"
              className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Target Domain:
            </Label>
            <Input
              id="domain-input"
              type="text"
              placeholder="e.g., Healthcare Informatics"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full sm:w-48 md:w-64 bg-white/70 dark:bg-slate-700/70 border-slate-300 dark:border-slate-600 backdrop-blur-sm shadow-sm text-sm"
              disabled={!apiKey}
            />
          </div>
          <Button
            onClick={handleGenerateSpace}
            disabled={
              createSessionMutation.isPending || !domain.trim() || !apiKey
            }
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg transition-all duration-200 hover:scale-105 w-full sm:w-auto text-sm py-2 px-3"
          >
            <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            {createSessionMutation.isPending ? "Generating..." : "Generate Space"}
          </Button>
        </div>

        <Button
          onClick={handleExport}
          disabled={!currentSessionId}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg transition-all duration-200 hover:scale-105 w-full sm:w-auto text-sm py-2 px-3"
        >
          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Done & Export</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>
      <div className="flex-1 relative flex">
        {sessionData && (
          <div className="w-12 sm:w-16 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-r border-white/30 dark:border-slate-700/30 flex flex-col items-center justify-center py-2 sm:py-4 shadow-inner">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExpandGranularitySuggestions}
              disabled={generateGranularitySuggestionsMutation.isPending}
              className="granularity-expand-button bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 transition-all duration-200 hover:scale-105 text-xs px-1 sm:px-2 py-1 shadow-sm backdrop-blur-sm"
              title="Add deeper granularity level"
            >
              <Plus className="w-2 h-2 sm:w-3 sm:h-3" />
            </Button>
            <span className="transform -rotate-90 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap mt-16 sm:mt-20 mb-16 sm:mb-20">
              <span className="hidden sm:inline">Terminology Granularity</span>
              <span className="sm:hidden">Granularity</span>
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            {sessionData ? (
              <ScatterPlot
                competencyQuestions={sessionData.competencyQuestions}
                domainCoverageValues={sessionData.domainCoverageValues}
                terminologyGranularityValues={
                  sessionData.terminologyGranularityValues
                }
                onCQClick={handleCQClick}
                onIntersectionHover={handleIntersectionHover}
                onCanvasLeave={handleCanvasLeave}
                onExpandSubdomains={handleExpandSubdomains}
                onAxisValueClick={handleAxisValueClick}
                onRenderComplete={handleScatterPlotRenderComplete}
              />

            ) : !apiKey ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center max-w-md w-full">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                    Welcome to OntoScope
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 px-2">To get started, please enter your OpenAI API key. This will enable the AI-powered ontology scoping process.</p>
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const key = tempApiKey.trim();
                          if (key && key.startsWith('sk-')) {
                            setApiKey(key);
                            setOnboardingTrigger('after-api-key');
                            setShowOnboarding(true); // Show contextual onboarding
                          }
                        }
                      }}
                      className="w-full text-sm"
                    />
                    <Button
                      onClick={() => {
                        const key = tempApiKey.trim();
                        if (key && key.startsWith('sk-')) {
                          setApiKey(key);
                          setOnboardingTrigger('after-api-key');
                          setShowOnboarding(true); // Show contextual onboarding
                        }
                      }}
                      disabled={!tempApiKey.trim() || !tempApiKey.startsWith('sk-')}
                      className="w-full transition-all duration-200 hover:scale-105"
                    >
                      Enter
                    </Button>
                    <p className="text-xs text-gray-500">
                      Enter your OpenAI API key above, then click Enter or press
                      Enter key
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">
                    Welcome to OntoScope
                  </h2>
                  <p className="text-sm text-gray-500">Generate a CQ space for your target domain to begin ontology scoping</p>
                </div>
              </div>
            )}
          </div>

          {sessionData && (
            <div className="h-14 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-t border-white/30 dark:border-slate-700/30 flex items-center justify-center px-4 shadow-inner">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Subdomains
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExpandSubdomains}
                  disabled={generateSubdomainSuggestionsMutation.isPending}
                  className="subdomain-expand-button bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 transition-all duration-200 hover:scale-105 shadow-sm backdrop-blur-sm"
                  title="Add New Subdomain"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <CQDetailsDialog
        cq={selectedCQ}
        isOpen={showCQDetails}
        onClose={() => setShowCQDetails(false)}
        onDeleteCQ={(cqId) => markIrrelevantMutation.mutate(cqId)}
        sessionId={currentSessionId || ''}
        apiKey={apiKey}
        allSessionCQs={sessionData?.competencyQuestions?.map(cq => ({
          ...cq,
          suggestedTerms: cq.suggestedTerms || undefined
        })) || []}
      />
      <AddItemsDialog
        isOpen={showAddItems}
        onClose={() => setShowAddItems(false)}
        suggestions={suggestions}
        intersectionInfo={intersectionInfo}
        onAddCQ={handleAddCQ}
        onAddAllCQs={() => {
          if (suggestions.length > 0) {
            suggestions.forEach((suggestion) => handleAddCQ(suggestion));
            setShowAddItems(false);
          }
        }}
        onGenerateMore={() => {
          if (intersectionInfo && currentSessionId && apiKey) {
            generateSuggestionsMutation.mutate({ ...intersectionInfo, apiKey });
          }
        }}
        isLoading={generateSuggestionsMutation.isPending}
        sessionId={currentSessionId}
        apiKey={apiKey}
        existingCQs={sessionData?.competencyQuestions || []}
      />
      <SubdomainSuggestionsDialog
        isOpen={showSubdomainSuggestions}
        onClose={() => setShowSubdomainSuggestions(false)}
        suggestions={subdomainSuggestions}
        onAddSubdomain={handleAddSubdomain}
        onGenerateMore={() => {
          if (currentSessionId && apiKey) {
            generateSubdomainSuggestionsMutation.mutate();
          }
        }}
        isLoading={generateSubdomainSuggestionsMutation.isPending}
        currentSubdomainCount={
          sessionData?.domainCoverageValues.filter((dv) => dv.isRelevant)
            .length || 0
        }
        existingSubdomains={sessionData?.domainCoverageValues.map(dv => dv.value) || []}
      />
      <GranularitySuggestionsDialog
        isOpen={showGranularitySuggestions}
        onClose={() => setShowGranularitySuggestions(false)}
        suggestions={granularitySuggestions}
        onAddGranularityLevel={handleAddGranularityLevel}
        onGenerateMore={() => {
          if (currentSessionId && apiKey) {
            generateGranularitySuggestionsMutation.mutate();
          }
        }}
        isLoading={generateGranularitySuggestionsMutation.isPending}
        currentLevelCount={
          sessionData?.terminologyGranularityValues.filter(
            (dv) => dv.isRelevant,
          ).length || 0
        }
      />
      
      {sessionData && selectedAxisValue && (
        <AxisValueDialog
          isOpen={showAxisValueDialog}
          onClose={() => {
            setShowAxisValueDialog(false);
            setSelectedAxisValue(null);
          }}
          onDelete={handleAxisValueDelete}
          axisValue={selectedAxisValue.value}
          axisType={selectedAxisValue.type}
          competencyQuestions={sessionData.competencyQuestions}
          domainCoverageValues={sessionData.domainCoverageValues}
          terminologyGranularityValues={sessionData.terminologyGranularityValues}
        />
      )}
      
      <ContextualOnboarding
        isActive={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        currentTrigger={onboardingTrigger}
        hasSession={!!sessionData}
      />
    </div>
  );
}
