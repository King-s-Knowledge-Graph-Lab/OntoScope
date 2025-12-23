import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { CompetencyQuestion, DimensionValue } from "@shared/schema";

interface AxisValueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  axisValue: string | null;
  axisType: "domain" | "granularity";
  competencyQuestions: CompetencyQuestion[];
  domainCoverageValues: DimensionValue[];
  terminologyGranularityValues: DimensionValue[];
}

interface IntersectionInfo {
  domainCoverage: string;
  terminologyGranularity: string;
  cqs: CompetencyQuestion[];
  subjectCQs: CompetencyQuestion[];
  propertyCQs: CompetencyQuestion[];
  objectCQs: CompetencyQuestion[];
  totalTerminologies: number;
}

export function AxisValueDialog({
  isOpen,
  onClose,
  onDelete,
  axisValue,
  axisType,
  competencyQuestions,
  domainCoverageValues,
  terminologyGranularityValues,
}: AxisValueDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!axisValue) return null;

  const canDeleteGranularityLevel = (value: string): boolean => {
    const extractLevelNumber = (val: string): number => {
      const match = val.toLowerCase().match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|\d+)[- ]?level/);
      if (match) {
        const levelMap: { [key: string]: number } = {
          'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
          'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
          'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15
        };
        return levelMap[match[1]] || parseInt(match[1]) || 0;
      }
      return 0;
    };

    const allLevels = terminologyGranularityValues
      .filter(val => val.isRelevant)
      .map(val => extractLevelNumber(val.value))
      .filter(level => level > 0);

    if (allLevels.length <= 1) return true;
    
    const maxLevel = Math.max(...allLevels);
    const currentLevel = extractLevelNumber(value);
    
    return currentLevel === maxLevel;
  };

  const canDelete = axisType === "domain" || 
    (axisType === "granularity" && canDeleteGranularityLevel(axisValue));

  const intersections: IntersectionInfo[] = [];

  if (axisType === "domain") {
    terminologyGranularityValues
      .filter(val => val.isRelevant)
      .forEach(granularityValue => {
        const intersectionCQs = competencyQuestions.filter(cq => 
          cq.isRelevant && 
          cq.domainCoverage === axisValue && 
          cq.terminologyGranularity === granularityValue.value
        );

        const subjectCQs = intersectionCQs.filter(cq => cq.type === 'subject');
        const propertyCQs = intersectionCQs.filter(cq => cq.type === 'property');
        const objectCQs = intersectionCQs.filter(cq => cq.type === 'object');

        const allTerminologies = new Set<string>();
        intersectionCQs.forEach(cq => {
          if (cq.suggestedTerms) {
            cq.suggestedTerms.forEach(term => allTerminologies.add(term));
          }
        });

        intersections.push({
          domainCoverage: axisValue,
          terminologyGranularity: granularityValue.value,
          cqs: intersectionCQs,
          subjectCQs,
          propertyCQs,
          objectCQs,
          totalTerminologies: allTerminologies.size,
        });
      });
  } else {
    domainCoverageValues
      .filter(val => val.isRelevant)
      .forEach(domainValue => {
        const intersectionCQs = competencyQuestions.filter(cq => 
          cq.isRelevant && 
          cq.domainCoverage === domainValue.value && 
          cq.terminologyGranularity === axisValue
        );

        const subjectCQs = intersectionCQs.filter(cq => cq.type === 'subject');
        const propertyCQs = intersectionCQs.filter(cq => cq.type === 'property');
        const objectCQs = intersectionCQs.filter(cq => cq.type === 'object');

        const allTerminologies = new Set<string>();
        intersectionCQs.forEach(cq => {
          if (cq.suggestedTerms) {
            cq.suggestedTerms.forEach(term => allTerminologies.add(term));
          }
        });

        intersections.push({
          domainCoverage: domainValue.value,
          terminologyGranularity: axisValue,
          cqs: intersectionCQs,
          subjectCQs,
          propertyCQs,
          objectCQs,
          totalTerminologies: allTerminologies.size,
        });
      });
  }

  const totalCQs = intersections.reduce((sum, intersection) => sum + intersection.cqs.length, 0);
  const totalSubjectCQs = intersections.reduce((sum, intersection) => sum + intersection.subjectCQs.length, 0);
  const totalPropertyCQs = intersections.reduce((sum, intersection) => sum + intersection.propertyCQs.length, 0);
  const totalObjectCQs = intersections.reduce((sum, intersection) => sum + intersection.objectCQs.length, 0);
  const totalTerminologies = intersections.reduce((sum, intersection) => sum + intersection.totalTerminologies, 0);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {axisType === "domain" ? "Subdomain" : "Granularity Level"}: {axisValue}
          </DialogTitle>
          <DialogDescription>
            Summary of competency questions and terminologies across all intersections for this {axisType === "domain" ? "subdomain" : "granularity level"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Overall Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total CQs:</span>
                  <Badge variant="secondary">{totalCQs}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Terminologies:</span>
                  <Badge variant="secondary">{totalTerminologies}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600 dark:text-blue-400">Subject CQs:</span>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {totalSubjectCQs}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-600 dark:text-green-400">Property CQs:</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {totalPropertyCQs}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-purple-600 dark:text-purple-400">Object CQs:</span>
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {totalObjectCQs}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Intersections ({intersections.length})
            </h3>
            <div className="space-y-3">
              {intersections.map((intersection, index) => (
                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {axisType === "domain" 
                        ? `${intersection.domainCoverage} × ${intersection.terminologyGranularity}`
                        : `${intersection.domainCoverage} × ${intersection.terminologyGranularity}`
                      }
                    </h4>
                    <div className="flex gap-2">
                      <Badge variant="outline">{intersection.cqs.length} CQs</Badge>
                      <Badge variant="outline">{intersection.totalTerminologies} terms</Badge>
                    </div>
                  </div>
                  
                  {intersection.cqs.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-blue-600 dark:text-blue-400 font-medium">Subject</div>
                        <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                          {intersection.subjectCQs.length}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {intersection.subjectCQs.reduce((sum, cq) => sum + (cq.suggestedTerms?.length || 0), 0)} terms
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 dark:text-green-400 font-medium">Property</div>
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">
                          {intersection.propertyCQs.length}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {intersection.propertyCQs.reduce((sum, cq) => sum + (cq.suggestedTerms?.length || 0), 0)} terms
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-purple-600 dark:text-purple-400 font-medium">Object</div>
                        <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          {intersection.objectCQs.length}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {intersection.objectCQs.reduce((sum, cq) => sum + (cq.suggestedTerms?.length || 0), 0)} terms
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {canDelete && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Delete this {axisType === "domain" ? "subdomain" : "granularity level"} and all associated competency questions.
                  </p>
                  {showDeleteConfirm && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      This action cannot be undone. Click delete again to confirm.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {showDeleteConfirm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant={showDeleteConfirm ? "destructive" : "outline"}
                    size="sm"
                    onClick={handleDelete}
                    className={!showDeleteConfirm ? "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950" : ""}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {showDeleteConfirm ? "Confirm Delete" : "Delete"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {!canDelete && axisType === "granularity" && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Only the deepest granularity level can be deleted when multiple levels exist.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}