import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, X, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import type { CompetencyQuestion } from '@shared/schema';

interface CQDetailsDialogProps {
  cq: CompetencyQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteCQ: (cqId: string) => void;
  sessionId: string;
  apiKey: string;
  allSessionCQs?: Array<{suggestedTerms?: string[]}>;
}

export function CQDetailsDialog({ 
  cq, 
  isOpen, 
  onClose, 
  onDeleteCQ,
  sessionId,
  apiKey,
  allSessionCQs = []
}: CQDetailsDialogProps) {
  const [newTerminology, setNewTerminology] = useState('');
  const [suggestedTerminologies, setSuggestedTerminologies] = useState<string[]>([]);
  const [localTerminologies, setLocalTerminologies] = useState<string[]>([]);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState('');
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    if (cq) {
      setLocalTerminologies(cq.suggestedTerms || []);
      setEditedQuestion(cq.question);
      setIsEditingQuestion(false);
      setSuggestedTerminologies([]);
    }
  }, [cq?.id, cq?.suggestedTerms]);

  const suggestTerminologyMutation = useMutation({
    mutationFn: async () => {
      if (!cq) throw new Error('No CQ selected');
      const response = await apiRequest('POST', `/api/competency-questions/${cq.id}/suggest-terminology`, { apiKey });
      return response.json();
    },
    onSuccess: (data) => {
      const suggestions = data.suggestions || [];
      setSuggestedTerminologies(suggestions);
      
      if (suggestions.length > 0 && localTerminologies.length === 0) {
        handleAddTerminology(suggestions[0]);
      }
    },
    onError: () => {
    }
  });

  const updateTerminologyMutation = useMutation({
    mutationFn: async (newTerminologies: string[]) => {
      if (!cq) throw new Error('No CQ selected');
      await apiRequest('PATCH', `/api/competency-questions/${cq.id}/terminology`, {
        suggestedTerms: newTerminologies
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cq-sessions", sessionId] });
    },
    onError: () => {
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (newQuestion: string) => {
      if (!cq) throw new Error('No CQ selected');
      
      const analysisResponse = await apiRequest('POST', `/api/cq-sessions/${sessionId}/analyze-custom-cq`, {
        question: newQuestion,
        domainCoverage: cq.domainCoverage,
        terminologyGranularity: cq.terminologyGranularity,
        apiKey
      });
      const analysisResult = await analysisResponse.json();
      
      await apiRequest('PATCH', `/api/competency-questions/${cq.id}`, {
        question: newQuestion,
        type: analysisResult.type,
        suggestedTerms: analysisResult.suggestedTerms || []
      });
      
      return { 
        question: newQuestion,
        type: analysisResult.type,
        suggestedTerms: analysisResult.suggestedTerms || []
      };
    },
    onSuccess: (result) => {
      if (cq) {
        cq.question = result.question;
        cq.type = result.type;
        cq.suggestedTerms = result.suggestedTerms;
      }
      setIsEditingQuestion(false);
      setLocalTerminologies(result.suggestedTerms);
      setSuggestedTerminologies([]);
      
      queryClient.invalidateQueries({ queryKey: ["/api/cq-sessions", sessionId] });
    },
    onError: () => {
    }
  });

  const validatePropertyTerminology = (term: string): boolean => {
    if (!cq || (cq.type || 'subject') !== 'property') return true;
    
    const trimmedTerm = term.trim().toLowerCase();
    
    const forbiddenNouns = [
      'teacher', 'manager', 'enrollment', 'leadership', 'relationship', 
      'connection', 'administration', 'supervision', 'membership', 'ownership',
      'association', 'participation', 'instruction', 'education', 'governance',
      'management', 'service', 'system', 'process', 'structure', 'organization',
      'department', 'division', 'unit', 'team', 'group', 'office', 'facility'
    ];
    
    if (forbiddenNouns.some(noun => trimmedTerm.includes(noun))) {
      return false;
    }
    
    const nounIndicators = /\b(the|a|an)\s+/i;
    const testPhrase = `the ${trimmedTerm}`;
    
    const nounEndings = /\b\w+(tion|sion|ment|ness|ship|ity|ence|ance|ing|er|or|ist|ian)$/i;
    
    if (nounEndings.test(trimmedTerm)) {
      return false;
    }
    
    return true;
  };

  const handleAddTerminology = (term: string) => {
    const trimmedTerm = term.trim();
    
    const allExistingTerms = allSessionCQs.flatMap(cq => cq.suggestedTerms || []);
    const isDuplicate = allExistingTerms.some(existing => 
      existing.toLowerCase().trim() === trimmedTerm.toLowerCase()
    );
    
    if (!trimmedTerm) {
      return;
    }
    
    if (isDuplicate) {
      setDuplicateMessage('This terminology already exists in the space');
      setNewTerminology('');
      setTimeout(() => setDuplicateMessage(''), 3000);
      return;
    }
    
    if (!validatePropertyTerminology(trimmedTerm)) {
      return;
    }
    
    const newTerminologies = [...localTerminologies, trimmedTerm];
    setLocalTerminologies(newTerminologies);
    updateTerminologyMutation.mutate(newTerminologies);
    
    setSuggestedTerminologies(prev => prev.filter(t => t !== trimmedTerm));
  };

  const handleRemoveTerminology = async (term: string) => {
    if (!cq?.sessionId) return;
    
    try {
      await apiRequest('DELETE', `/api/competency-questions/${cq.id}/terminology/${encodeURIComponent(term)}`, {});
      
      const newTerminologies = localTerminologies.filter(t => t !== term);
      setLocalTerminologies(newTerminologies);
      
      queryClient.invalidateQueries({ queryKey: ["/api/cq-sessions", sessionId] });
      
    } catch (error) {
      console.error('Failed to delete terminology:', error);
      const newTerminologies = localTerminologies.filter(t => t !== term);
      setLocalTerminologies(newTerminologies);
      updateTerminologyMutation.mutate(newTerminologies);
    }
  };

  const handleCustomTerminologySubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTerminology.trim()) {
      handleAddTerminology(newTerminology.trim());
      setNewTerminology('');
    }
  };

  const handleQuestionEdit = () => {
    setIsEditingQuestion(true);
  };

  const handleQuestionSave = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editedQuestion.trim() && editedQuestion !== cq?.question) {
      updateQuestionMutation.mutate(editedQuestion.trim());
    } else if (e.key === 'Escape') {
      setEditedQuestion(cq?.question || '');
      setIsEditingQuestion(false);
    }
  };

  const handleQuestionBlur = () => {
    if (editedQuestion.trim() && editedQuestion !== cq?.question) {
      updateQuestionMutation.mutate(editedQuestion.trim());
    } else {
      setEditedQuestion(cq?.question || '');
      setIsEditingQuestion(false);
    }
  };

  if (!cq) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Competency Question Details
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage terminology and view position
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Question</h3>
                {!isEditingQuestion && (
                  <Edit3 
                    className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer" 
                    onClick={handleQuestionEdit}
                  />
                )}
              </div>
              {cq.type && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs font-medium px-2 py-1 ${
                    cq.type === 'subject' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                    cq.type === 'property' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                  }`}
                >
                  {cq.type}
                </Badge>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
              {isEditingQuestion ? (
                <Input
                  value={editedQuestion}
                  onChange={(e) => setEditedQuestion(e.target.value)}
                  onKeyDown={handleQuestionSave}
                  onBlur={handleQuestionBlur}
                  className="text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  placeholder="Enter question..."
                  autoFocus
                  disabled={updateQuestionMutation.isPending}
                />
              ) : (
                <p 
                  className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 -m-1 transition-colors"
                  onClick={handleQuestionEdit}
                  title="Click to edit question"
                >
                  {cq.question}
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Terminology ({localTerminologies.length})
            </h3>
            
            <div className="min-h-[50px] bg-gray-50 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
              {localTerminologies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {localTerminologies.map((term, index) => (
                    <div 
                      key={index}
                      className="group relative bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-all"
                      onMouseEnter={(e) => {
                        const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                        if (deleteBtn) deleteBtn.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                        if (deleteBtn) deleteBtn.style.opacity = '0';
                      }}
                    >
                      {term}
                      <button
                        className="delete-btn absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-xs hover:bg-red-600 opacity-0"
                        onClick={() => handleRemoveTerminology(term)}
                        style={{ opacity: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-3">
                  No terminology added
                </p>
              )}
            </div>

            <div className="space-y-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => suggestTerminologyMutation.mutate()}
                  disabled={suggestTerminologyMutation.isPending}
                  className="w-full h-8 text-xs"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  {suggestTerminologyMutation.isPending ? 'Generating...' : 'Generate Additional Terminologies'}
                </Button>
                
                <Input
                  placeholder="Add custom terminology (press Enter)"
                  value={newTerminology}
                  onChange={(e) => setNewTerminology(e.target.value)}
                  onKeyDown={handleCustomTerminologySubmit}
                  className="h-8 text-xs"
                />
                
                {duplicateMessage && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                    {duplicateMessage}
                  </div>
                )}
              </div>

              {suggestedTerminologies.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    AI Suggestions ({suggestedTerminologies.length})
                  </h5>
                  <div className="space-y-1">
                    {suggestedTerminologies.map((term, index) => {
                      const allExistingTerms = allSessionCQs.flatMap(cq => cq.suggestedTerms || []);
                      const isDuplicate = allExistingTerms.some(existing => 
                        existing.toLowerCase().trim() === term.toLowerCase().trim()
                      );
                      const isValidProperty = validatePropertyTerminology(term);
                      const isClickable = !isDuplicate && isValidProperty;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => isClickable && handleAddTerminology(term)}
                          disabled={!isClickable}
                          className={`flex items-center justify-start w-full p-2 border rounded transition-colors text-left ${
                            isClickable 
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer" 
                              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
                          }`}
                          title={
                            isDuplicate 
                              ? "This terminology already exists in the space"
                              : !isValidProperty 
                                ? "Invalid terminology for property CQ (must be verb or verb+preposition)"
                                : ""
                          }
                        >
                          <Plus className={`w-3 h-3 mr-2 ${
                            isClickable 
                              ? "text-green-600 dark:text-green-400" 
                              : "text-gray-400 dark:text-gray-500"
                          }`} />
                          <span className={`text-xs ${
                            isClickable 
                              ? "text-gray-800 dark:text-gray-200" 
                              : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {term}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Position
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Domain Coverage
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {cq.domainCoverage}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Terminology Granularity
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {cq.terminologyGranularity}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDeleteCQ(cq.id);
                  onClose();
                }}
                className="h-8 px-4 text-xs transition-all duration-200"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Question
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
