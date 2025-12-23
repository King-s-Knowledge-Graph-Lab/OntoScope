import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';

interface GranularitySuggestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onAddGranularityLevel: (level: string) => void;
  onGenerateMore: () => void;
  isLoading: boolean;
  currentLevelCount?: number;
}

export function GranularitySuggestionsDialog({
  isOpen,
  onClose,
  suggestions,
  onAddGranularityLevel,
  onGenerateMore,
  isLoading,
  currentLevelCount = 0
}: GranularitySuggestionsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-80 bg-white rounded-lg border border-gray-200 shadow-xl backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-gray-900">
            Add New Granularity Level
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            AI-generated hierarchical granularity levels for deeper terminology exploration
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 font-medium">{suggestion}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      Hierarchical level for progressively specific terminology
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    onClick={() => onAddGranularityLevel(suggestion)}
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
                {isLoading ? 'Generating granularity level suggestions...' : 'No suggestions available'}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <Button 
            className="w-full transition-all duration-200 hover:scale-105"
            onClick={onGenerateMore}
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoading ? 'Generating...' : 'Generate More Levels'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}