import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Sparkles } from 'lucide-react';

interface SubdomainSuggestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
  onAddSubdomain: (subdomain: string) => void;
  onGenerateMore: () => void;
  isLoading: boolean;
  currentSubdomainCount?: number;
  existingSubdomains?: string[];
}

export function SubdomainSuggestionsDialog({
  isOpen,
  onClose,
  suggestions,
  onAddSubdomain,
  onGenerateMore,
  isLoading,
  currentSubdomainCount = 0,
  existingSubdomains = []
}: SubdomainSuggestionsDialogProps) {
  const [customSubdomain, setCustomSubdomain] = useState('');
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const handleAddCustomSubdomain = () => {
    const trimmedSubdomain = customSubdomain.trim();
    if (trimmedSubdomain) {
      const isDuplicate = existingSubdomains.some(existing => 
        existing.toLowerCase().trim() === trimmedSubdomain.toLowerCase()
      );
      
      if (isDuplicate) {
        setDuplicateMessage('This subdomain already exists on the X-axis');
        setCustomSubdomain('');
        setTimeout(() => setDuplicateMessage(''), 3000);
        return;
      }
      
      onAddSubdomain(trimmedSubdomain);
      setCustomSubdomain('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomSubdomain();
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-80 bg-white rounded-lg border border-gray-200 shadow-xl backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-gray-900">
            Add New Subdomain
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            AI-generated subdomains representing missing aspects of your domain
          </DialogDescription>
        </DialogHeader>
        

        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => {
              const isDuplicate = existingSubdomains.some(existing => 
                existing.toLowerCase().trim() === suggestion.toLowerCase().trim()
              );
              
              return (
                <div 
                  key={index}
                  className={`p-3 border rounded group ${
                    isDuplicate 
                      ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50" 
                      : "border-gray-200 hover:bg-gray-50 cursor-pointer"
                  }`}
                  title={isDuplicate ? "This subdomain already exists on the X-axis" : ""}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isDuplicate 
                        ? "text-gray-400 dark:text-gray-500" 
                        : "text-gray-700"
                    }`}>
                      {suggestion}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`transition-all duration-200 ${
                        isDuplicate 
                          ? "cursor-not-allowed opacity-30" 
                          : "text-primary opacity-0 group-hover:opacity-100 hover:scale-110"
                      }`}
                      onClick={() => !isDuplicate && onAddSubdomain(suggestion)}
                      disabled={isLoading || isDuplicate}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {isLoading ? 'Generating subdomain suggestions...' : 'No suggestions available'}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              Add Custom Subdomain
            </label>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter subdomain name..."
                value={customSubdomain}
                onChange={(e) => setCustomSubdomain(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 text-sm"
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={handleAddCustomSubdomain}
                disabled={!customSubdomain.trim() || isLoading}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {duplicateMessage && (
              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 mt-2">
                {duplicateMessage}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <Button 
            className="w-full transition-all duration-200 hover:scale-105"
            onClick={onGenerateMore}
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoading ? 'Generating...' : 'Generate More Suggestions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
