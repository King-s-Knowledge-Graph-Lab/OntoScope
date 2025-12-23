import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCQSessionSchema, insertCompetencyQuestionSchema, insertDimensionValueSchema } from "@shared/schema";
import { generateInitialCQSpace, generateCQSuggestions, generateDimensionValueSuggestions, generateTerminologySuggestions, analyzeCustomCQ } from "./services/openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/cq-sessions", async (req, res) => {
    try {
      const { domain, apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "OpenAI API key is required" });
      }
      
      const validatedData = insertCQSessionSchema.parse({ domain });
      
      const session = await storage.createCQSession({ domain: validatedData.domain });
      
      const generatedSpace = await generateInitialCQSpace(validatedData.domain, apiKey);
      
      const domainCoverageValues = await Promise.all(
        generatedSpace.domainCoverageValues.map(value =>
          storage.createDimensionValue({
            sessionId: session.id,
            dimension: "domain_coverage",
            value
          })
        )
      );
      
      const terminologyGranularityValues = await Promise.all(
        generatedSpace.terminologyGranularityValues.map(value =>
          storage.createDimensionValue({
            sessionId: session.id,
            dimension: "terminology_granularity", 
            value
          })
        )
      );
      
      const competencyQuestions = await Promise.all(
        generatedSpace.competencyQuestions.map(cq =>
          storage.createCompetencyQuestion({
            sessionId: session.id,
            question: cq.question,
            domainCoverage: cq.domainCoverage,
            terminologyGranularity: cq.terminologyGranularity,
            suggestedTerms: cq.suggestedTerms,
            x: cq.x,
            y: cq.y
          })
        )
      );
      
      res.json({
        session,
        domainCoverageValues,
        terminologyGranularityValues,
        competencyQuestions
      });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create CQ session" });
    }
  });

  app.get("/api/cq-sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const [dimensionValues, competencyQuestions] = await Promise.all([
        storage.getDimensionValuesBySession(sessionId),
        storage.getCompetencyQuestionsBySession(sessionId)
      ]);
      
      const domainCoverageValues = dimensionValues.filter(dv => dv.dimension === "domain_coverage");
      const terminologyGranularityValues = dimensionValues.filter(dv => dv.dimension === "terminology_granularity");
      
      res.json({
        session,
        domainCoverageValues,
        terminologyGranularityValues,
        competencyQuestions: competencyQuestions.filter(cq => cq.isRelevant)
      });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get CQ session" });
    }
  });

  app.post("/api/cq-sessions/:sessionId/suggest-cqs", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { domainCoverage, terminologyGranularity, apiKey } = z.object({
        domainCoverage: z.string(),
        terminologyGranularity: z.string(),
        apiKey: z.string()
      }).parse(req.body);
      
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const [allCQs, relevantCQs, deletedCQs] = await Promise.all([
        storage.getCompetencyQuestionsBySession(sessionId),
        storage.getRelevantCQsBySession(sessionId),
        storage.getDeletedCompetencyQuestionsBySession(sessionId)
      ]);
      
      const existingCQs = relevantCQs.map(cq => cq.question);
      const existingTerms = relevantCQs.flatMap(cq => cq.suggestedTerms || []);
      const irrelevantCQs = allCQs.filter(cq => !cq.isRelevant).map(cq => cq.question);
      const deletedQuestions = deletedCQs.map(dcq => dcq.question);
      
      const intersectionCQs = relevantCQs
        .filter(cq => cq.domainCoverage === domainCoverage && cq.terminologyGranularity === terminologyGranularity)
        .map(cq => ({ type: cq.type || undefined, question: cq.question }));
      
      const suggestions = await generateCQSuggestions(
        session.domain,
        domainCoverage,
        terminologyGranularity,
        existingCQs,
        existingTerms,
        [...irrelevantCQs, ...deletedQuestions],  // Combine irrelevant and deleted CQs
        intersectionCQs,
        apiKey
      );
      
      res.json(suggestions);
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate CQ suggestions" });
    }
  });

  app.post("/api/cq-sessions/:sessionId/suggest-dimension-values", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { dimension, apiKey } = z.object({
        dimension: z.enum(["domain_coverage", "terminology_granularity"]),
        apiKey: z.string()
      }).parse(req.body);
      
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const dimensionValues = await storage.getDimensionValuesBySession(sessionId);
      const existingValues = dimensionValues
        .filter(dv => dv.dimension === dimension)
        .map(dv => dv.value);

      let excludedValues: string[];
      
      if (dimension === "terminology_granularity") {
        excludedValues = existingValues;
      } else {
        const deletedDimensionValues = await storage.getDeletedDimensionValuesBySession(sessionId);
        const deletedValues = deletedDimensionValues
          .filter(dv => dv.dimension === dimension)
          .map(dv => dv.value);
        
        const combinedValues = [...existingValues, ...deletedValues];
        excludedValues = Array.from(new Set(combinedValues));
      }
      
      if (dimension === "terminology_granularity") {
        console.log(`Terminology granularity: Using ${excludedValues.length} current values to determine next level`);
      } else {
        const deletedCount = excludedValues.length - existingValues.length;
        console.log(`Excluding ${excludedValues.length} values from suggestions (${existingValues.length} existing + ${deletedCount} deleted)`);
      }
      
      const allCQs = dimension === "domain_coverage" 
        ? (await storage.getCompetencyQuestionsBySession(sessionId))
            .filter(cq => cq.isRelevant)
            .map(cq => cq.question)
        : [];

      const suggestions = await generateDimensionValueSuggestions(
        dimension,
        session.domain,
        excludedValues, // Use excluded values instead of just existing ones
        allCQs,
        apiKey
      );
      
      res.json(suggestions);
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate dimension value suggestions" });
    }
  });

  app.post("/api/cq-sessions/:sessionId/competency-questions", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const cqData = insertCompetencyQuestionSchema.parse({
        ...req.body,
        sessionId
      });
      
      const existingCQs = await storage.getCompetencyQuestionsBySession(sessionId);
      const isDuplicate = existingCQs.some(cq => 
        cq.question.toLowerCase().trim() === cqData.question.toLowerCase().trim()
      );
      
      if (isDuplicate) {
        return res.status(400).json({ message: "Duplicate competency question - this question already exists in the session" });
      }
      
      const newCQ = await storage.createCompetencyQuestion(cqData);
      res.json(newCQ);
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to add competency question" });
    }
  });

  app.post("/api/cq-sessions/:sessionId/dimension-values", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const dimensionData = insertDimensionValueSchema.parse({
        ...req.body,
        sessionId
      });
      
      const existingDimensionValues = await storage.getDimensionValuesBySession(sessionId);
      const isDuplicate = existingDimensionValues.some(dv => 
        dv.dimension === dimensionData.dimension && 
        dv.value.toLowerCase().trim() === dimensionData.value.toLowerCase().trim()
      );
      
      if (isDuplicate) {
        return res.status(400).json({ message: "This value already exists on the " + (dimensionData.dimension === "domain_coverage" ? "X-axis" : "Y-axis") });
      }
      
      const newDimensionValue = await storage.createDimensionValue(dimensionData);
      res.json(newDimensionValue);
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to add dimension value" });
    }
  });

  app.patch("/api/competency-questions/:cqId/relevance", async (req, res) => {
    try {
      const { cqId } = req.params;
      const { isRelevant } = z.object({ isRelevant: z.boolean() }).parse(req.body);
      
      await storage.updateCompetencyQuestionRelevance(cqId, isRelevant);
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update CQ relevance" });
    }
  });

  app.patch("/api/competency-questions/:cqId", async (req, res) => {
    try {
      const { cqId } = req.params;
      const updateData = z.object({ 
        question: z.string().optional(),
        type: z.string().optional(),
        suggestedTerms: z.array(z.string()).optional()
      }).parse(req.body);
      
      await storage.updateCompetencyQuestion(cqId, updateData);
      
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update CQ" });
    }
  });

  app.delete("/api/competency-questions/:cqId/terminology/:terminology", async (req, res) => {
    try {
      const { cqId, terminology } = req.params;
      
      const cq = await storage.getCompetencyQuestion(cqId);
      if (!cq || !cq.sessionId) {
        return res.status(404).json({ message: "Competency question not found or has no session" });
      }
      
      await storage.createDeletedTerminology({
        sessionId: cq.sessionId,
        terminology: decodeURIComponent(terminology)
      });
      
      const updatedTerms = (cq.suggestedTerms || []).filter(term => 
        term !== decodeURIComponent(terminology)
      );
      await storage.updateCompetencyQuestionTerminology(cqId, updatedTerms);
      
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete terminology" });
    }
  });

  app.delete("/api/competency-questions/:cqId", async (req, res) => {
    try {
      const { cqId } = req.params;
      
      const cq = await storage.getCompetencyQuestion(cqId);
      if (!cq || !cq.sessionId) {
        return res.status(404).json({ message: "Competency question not found or has no session" });
      }
      
      await storage.createDeletedCompetencyQuestion({
        sessionId: cq.sessionId,
        question: cq.question
      });
      
      await storage.deleteCompetencyQuestion(cqId);
      
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete competency question" });
    }
  });

  app.patch("/api/dimension-values/:dimensionId/relevance", async (req, res) => {
    try {
      const { dimensionId } = req.params;
      const { isRelevant } = z.object({ isRelevant: z.boolean() }).parse(req.body);
      
      await storage.updateDimensionValueRelevance(dimensionId, isRelevant);
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update dimension value relevance" });
    }
  });

  app.delete("/api/dimension-values/:dimensionId", async (req, res) => {
    try {
      const { dimensionId } = req.params;
      
      await storage.deleteDimensionValue(dimensionId);
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete dimension value" });
    }
  });

  app.delete("/api/cq-sessions/:sessionId/granularity-levels/:levelValue", async (req, res) => {
    try {
      const { sessionId, levelValue } = req.params;
      
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const terminologyGranularityValues = await storage.getDimensionValuesBySession(sessionId);
      const granularityLevel = terminologyGranularityValues.find(
        dv => dv.value === levelValue && dv.dimension === "terminology_granularity"
      );

      if (!granularityLevel) {
        return res.status(404).json({ message: "Granularity level not found" });
      }

      await storage.deleteDimensionValue(granularityLevel.id);
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete granularity level" });
    }
  });

  app.post("/api/cq-sessions/:sessionId/analyze-custom-cq", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { question, domainCoverage, terminologyGranularity, apiKey } = z.object({
        question: z.string(),
        domainCoverage: z.string(),
        terminologyGranularity: z.string(),
        apiKey: z.string()
      }).parse(req.body);
      
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const allCQs = await storage.getCompetencyQuestionsBySession(sessionId);
      const isDuplicate = allCQs.some(cq => 
        cq.question.toLowerCase().trim() === question.toLowerCase().trim()
      );
      
      if (isDuplicate) {
        return res.status(400).json({ message: "Duplicate competency question - this question already exists in the session" });
      }
      
      const relevantCQs = await storage.getRelevantCQsBySession(sessionId);
      const existingCQs = relevantCQs.map(cq => cq.question);
      const existingTerms = relevantCQs.flatMap(cq => cq.suggestedTerms || []);
      const irrelevantCQs = allCQs.filter(cq => !cq.isRelevant).map(cq => cq.question);

      const deletedCQs = await storage.getDeletedCompetencyQuestionsBySession(sessionId);
      const deletedQuestions = deletedCQs.map(dcq => dcq.question);
      
      const allExcludedQuestions = [...existingCQs, ...irrelevantCQs, ...deletedQuestions];
      
      const analyzedCQ = await analyzeCustomCQ(
        question,
        session.domain,
        domainCoverage,
        terminologyGranularity,
        existingCQs,
        existingTerms,
        [...irrelevantCQs, ...deletedQuestions],
        apiKey
      );
      
      res.json(analyzedCQ);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to analyze custom CQ" });
    }
  });

  app.get("/api/cq-sessions/:sessionId/export", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const competencyQuestions = await storage.getRelevantCQsBySession(sessionId);
      const domainCoverageValues = await storage.getDimensionValuesBySession(sessionId);
      const terminologyGranularityValues = await storage.getDimensionValuesBySession(sessionId);
      
      const relevantDomainValues = domainCoverageValues
        .filter(dv => dv.dimension === "domain_coverage" && dv.isRelevant)
        .map(dv => dv.value);
      const relevantGranularityValues = terminologyGranularityValues
        .filter(dv => dv.dimension === "terminology_granularity" && dv.isRelevant)
        .map(dv => dv.value);
      
      const intersectionMap = new Map<string, any[]>();
      competencyQuestions.forEach(cq => {
        const key = `${cq.domainCoverage}|${cq.terminologyGranularity}`;
        if (!intersectionMap.has(key)) {
          intersectionMap.set(key, []);
        }
        intersectionMap.get(key)!.push({
          id: cq.id,
          question: cq.question,
          type: cq.type || "subject",
          terminologies: cq.suggestedTerms || [],
          position: {
            x: cq.x,
            y: cq.y
          },
          created: new Date().toISOString() // Fallback since createdAt is not in current schema
        });
      });
      
      const intersections: any[] = [];
      
      const sortedIntersections = Array.from(intersectionMap.entries()).sort(([keyA], [keyB]) => {
        const [domainA, granularityA] = keyA.split('|');
        const [domainB, granularityB] = keyB.split('|');
        if (domainA !== domainB) {
          return domainA.localeCompare(domainB);
        }
        return granularityA.localeCompare(granularityB);
      });
      
      sortedIntersections.forEach(([key, cqs]) => {
        const [domainCoverage, terminologyGranularity] = key.split('|');
        intersections.push({
          domain_coverage: domainCoverage,
          terminology_granularity: terminologyGranularity,
          competency_questions: cqs
        });
      });
      
      const exportData = {
        meta: {
          schema_version: "1.0",
          exported_at: new Date().toISOString(),
          domain: session.domain,
          session_id: session.id,
          total_questions: competencyQuestions.length,
          total_intersections: intersections.length
        },
        dimensions: {
          domain_coverage_values: relevantDomainValues,
          terminology_granularity_values: relevantGranularityValues
        },
        intersections: intersections,
        summary: {
          questions_by_type: competencyQuestions.reduce((acc, cq) => {
            const type = cq.type || "subject";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          questions_by_intersection: intersections.map(i => ({
            intersection: `${i.domain_coverage} × ${i.terminology_granularity}`,
            count: i.competency_questions.length
          }))
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="ontoscope-${session.domain.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to export CQ space" });
    }
  });

  app.post("/api/competency-questions/:cqId/suggest-terminology", async (req, res) => {
    try {
      const { cqId } = req.params;
      const { apiKey } = z.object({
        apiKey: z.string()
      }).parse(req.body);
      
      const cq = await storage.getCompetencyQuestion(cqId);
      if (!cq) {
        return res.status(404).json({ message: "Competency question not found" });
      }
      
      if (!cq.sessionId) {
        return res.status(400).json({ message: "CQ has no associated session" });
      }
      const session = await storage.getCQSession(cq.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const allCQsInSession = await storage.getCompetencyQuestionsBySession(cq.sessionId);
      const allExistingTerms = allCQsInSession
        .flatMap(sessionCq => sessionCq.suggestedTerms || [])
        .filter((term, index, array) => array.indexOf(term) === index); // Remove duplicates from the list itself
      
      const deletedTerminologies = await storage.getDeletedTerminologiesBySession(cq.sessionId);
      const deletedTerms = deletedTerminologies.map(dt => dt.terminology);
      
      const combinedTerms = [...allExistingTerms, ...deletedTerms];
      const excludedTerms = Array.from(new Set(combinedTerms));
      
      console.log(`Space-wide terminology check: ${excludedTerms.length} excluded terms (${allExistingTerms.length} existing + ${deletedTerms.length} deleted) from ${allCQsInSession.length} CQs`);
      
      let uniqueTerminology: string[] = [];
      let attempt = 1;
      const maxAttempts = 10;
      let allAttemptedTerms = [...excludedTerms];
      
      while (uniqueTerminology.length < 3 && attempt <= maxAttempts) {
        console.log(`Terminology generation attempt ${attempt}/${maxAttempts} - targeting 3 unique suggestions`);
        
        const newTerminology = await generateTerminologySuggestions(
          session.domain,
          cq.question,
          (cq.type || "subject") as "subject" | "property" | "object",
          cq.domainCoverage,
          cq.terminologyGranularity,
          allAttemptedTerms, // Include all previous attempts to avoid repeating them
          apiKey
        );
        
        const filteredNew = newTerminology.filter((term: string) => {
          const termLower = term.toLowerCase().trim();
          const existingLower = allAttemptedTerms.map(t => t.toLowerCase().trim());
          
          if (existingLower.includes(termLower)) {
            return false;
          }
          
          if (cq.type === 'property') {
            return validatePropertyTerminology([term], 'property').length > 0;
          }
          
          return true;
        });
        
        const needed = 3 - uniqueTerminology.length;
        const toAdd = filteredNew.slice(0, needed);
        uniqueTerminology.push(...toAdd);
        
        allAttemptedTerms.push(...newTerminology);
        
        console.log(`Attempt ${attempt}: Generated ${newTerminology.length} raw, ${filteredNew.length} unique, ${toAdd.length} added. Total unique: ${uniqueTerminology.length}/3`);
        
        attempt++;
      }
      
      console.log(`Final result: ${uniqueTerminology.length} unique terminology suggestions after ${attempt - 1} attempts`);
      res.json({ suggestions: uniqueTerminology.slice(0, 3) }); // Ensure max 3 suggestions
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate terminology suggestions" });
    }
  });

  const validatePropertyTerminology = (terms: string[], cqType: string): string[] => {
    if (cqType !== 'property') return terms; // Only validate property CQs
    
    const forbiddenNouns = [
      'teacher', 'manager', 'enrollment', 'leadership', 'relationship', 
      'connection', 'administration', 'supervision', 'membership', 'ownership',
      'association', 'participation', 'instruction', 'education', 'governance',
      'management', 'service', 'system', 'process', 'structure', 'organization',
      'department', 'division', 'unit', 'team', 'group', 'office', 'facility'
    ];
    
    return terms.filter(term => {
      const trimmedTerm = term.trim().toLowerCase();
      
      if (forbiddenNouns.some(noun => trimmedTerm.includes(noun))) {
        return false;
      }
      
      const nounEndings = /\b\w+(tion|sion|ment|ness|ship|ity|ence|ance|ing|er|or|ist|ian)$/i;
      if (nounEndings.test(trimmedTerm)) {
        return false;
      }
      
      return true;
    });
  };

  app.patch("/api/competency-questions/:cqId/terminology", async (req, res) => {
    try {
      const { cqId } = req.params;
      const { suggestedTerms } = z.object({ 
        suggestedTerms: z.array(z.string()) 
      }).parse(req.body);
      
      const cq = await storage.getCompetencyQuestion(cqId);
      if (!cq) {
        return res.status(404).json({ message: "Competency question not found" });
      }
      
      const validatedTerms = validatePropertyTerminology(suggestedTerms, cq.type || 'subject');
      
      await storage.updateCompetencyQuestionTerminology(cqId, validatedTerms);
      res.json({ success: true });
      
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update terminology" });
    }
  });

  app.get('/api/check-openai-key', (req, res) => {
    res.json({ hasKey: false, message: "Users must provide their own OpenAI API key" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
