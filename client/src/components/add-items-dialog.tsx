import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SuggestedCQ {
  question: string;
  suggestedTerms: string[];
  type?: 'subject' | 'property' | 'object';
}

interface AddItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SuggestedCQ[];
  intersectionInfo: {
    domainCoverage: string;
    terminologyGranularity: string;
  } | null;
  onAddCQ: (cq: SuggestedCQ) => void;
  onAddAllCQs: () => void;
  onGenerateMore: () => void;
  isLoading: boolean;
  sessionId: string | null;
  apiKey: string;
  existingCQs?: Array<{question: string}>;
}

export function AddItemsDialog({
  isOpen,
  onClose,
  suggestions,
  intersectionInfo,
  onAddCQ,
  onAddAllCQs,
  onGenerateMore,
  isLoading,
  sessionId,
  apiKey,
  existingCQs = []
}: AddItemsDialogProps) {
  const [customCQ, setCustomCQ] = useState('');
  const [analyzingCustomCQ, setAnalyzingCustomCQ] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const handleAddCustomCQ = async () => {
    if (customCQ.trim() && intersectionInfo && sessionId) {
      const trimmedQuestion = customCQ.trim();
      const isDuplicate = existingCQs.some(cq => 
        cq.question.toLowerCase().trim() === trimmedQuestion.toLowerCase()
      );
      
      if (isDuplicate) {
        setDuplicateMessage('This question already exists in the space');
        setCustomCQ('');
        setTimeout(() => setDuplicateMessage(''), 3000);
        return;
      }
      
      setAnalyzingCustomCQ(true);
      try {
        const response = await fetch(`/api/cq-sessions/${sessionId}/analyze-custom-cq`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: customCQ.trim(),
            domainCoverage: intersectionInfo.domainCoverage,
            terminologyGranularity: intersectionInfo.terminologyGranularity,
            apiKey
          })
        });

        if (!response.ok) {
          throw new Error('Failed to analyze custom CQ');
        }

        const analysisResult = await response.json();

        const analyzedCQ: SuggestedCQ = {
          question: analysisResult.question,
          suggestedTerms: analysisResult.suggestedTerms,
          type: analysisResult.type
        };
        
        onAddCQ(analyzedCQ);
        setCustomCQ('');
      } catch (error) {
        console.error('Failed to analyze custom CQ:', error);
        const customSuggestion: SuggestedCQ = {
          question: customCQ.trim(),
          suggestedTerms: [],
          type: undefined
        };
        onAddCQ(customSuggestion);
        setCustomCQ('');
      } finally {
        setAnalyzingCustomCQ(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomCQ();
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[480px] max-w-[95vw] sm:max-w-[90vw] bg-white rounded-lg border border-gray-200 shadow-xl backdrop-blur-sm mx-2 sm:mx-auto overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base font-semibold text-gray-900">
            Add New CQs
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select from AI-generated competency question suggestions for this intersection
          </DialogDescription>
        </DialogHeader>
        
        {intersectionInfo && (
          <div className="text-xs text-gray-500 mb-3">
            AI-generated suggestions for:{' '}
            <span className="font-medium">
              {intersectionInfo.domainCoverage} × {intersectionInfo.terminologyGranularity}
            </span>
          </div>
        )}
        
        <div className="space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`p-3 border border-gray-200 rounded group ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1 sm:gap-0">
                  <p className="text-xs sm:text-sm text-gray-700 flex-1">{suggestion.question}</p>
                  {suggestion.type && (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        suggestion.type === 'subject' ? 'bg-blue-100 text-blue-800' :
                        suggestion.type === 'property' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {suggestion.type}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex gap-1 flex-wrap flex-1">
                    {suggestion.suggestedTerms.map((term, termIndex) => (
                      <Badge 
                        key={termIndex} 
                        variant="outline" 
                        className="text-xs bg-gray-100 text-gray-600"
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110 min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                    onClick={() => onAddCQ(suggestion)}
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {isLoading ? 'Generating suggestions...' : 
                'No suggestions available - try generating more'}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              Add Custom CQ
            </label>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter competency question..."
                value={customCQ}
                onChange={(e) => setCustomCQ(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 text-sm"
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={handleAddCustomCQ}
                disabled={!customCQ.trim() || isLoading || analyzingCustomCQ}
                className="px-3"
              >
                {analyzingCustomCQ ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {duplicateMessage && (
              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 mt-2">
                {duplicateMessage}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
          {suggestions.length > 0 && (
            <Button 
              className="w-full transition-all duration-200 hover:scale-105"
              onClick={onAddAllCQs}
              disabled={isLoading}
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add All CQs ({suggestions.length})
            </Button>
          )}
          <Button 
            className="w-full transition-all duration-200 hover:scale-105"
            onClick={onGenerateMore}
            disabled={isLoading || suggestions.length === 0}
            variant="outline"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoading ? 'Generating...' : 'Generate More Suggestions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
