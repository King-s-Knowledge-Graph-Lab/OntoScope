// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  cqSessions;
  dimensionValues;
  competencyQuestions;
  deletedDimensionValues;
  deletedTerminologies;
  deletedCompetencyQuestions;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.cqSessions = /* @__PURE__ */ new Map();
    this.dimensionValues = /* @__PURE__ */ new Map();
    this.competencyQuestions = /* @__PURE__ */ new Map();
    this.deletedDimensionValues = /* @__PURE__ */ new Map();
    this.deletedTerminologies = /* @__PURE__ */ new Map();
    this.deletedCompetencyQuestions = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createCQSession(insertSession) {
    const id = randomUUID();
    const session = {
      ...insertSession,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.cqSessions.set(id, session);
    return session;
  }
  async getCQSession(id) {
    return this.cqSessions.get(id);
  }
  async createDimensionValue(insertDimensionValue) {
    const id = randomUUID();
    const dimensionValue = {
      ...insertDimensionValue,
      id,
      sessionId: insertDimensionValue.sessionId || null,
      isRelevant: true
    };
    this.dimensionValues.set(id, dimensionValue);
    return dimensionValue;
  }
  async getDimensionValuesBySession(sessionId) {
    return Array.from(this.dimensionValues.values()).filter(
      (dv) => dv.sessionId === sessionId && dv.isRelevant
    );
  }
  async updateDimensionValueRelevance(id, isRelevant) {
    const dimensionValue = this.dimensionValues.get(id);
    if (dimensionValue) {
      dimensionValue.isRelevant = isRelevant;
      this.dimensionValues.set(id, dimensionValue);
    }
  }
  async deleteDimensionValue(id) {
    const dimensionValue = this.dimensionValues.get(id);
    if (dimensionValue) {
      if (dimensionValue.sessionId) {
        await this.createDeletedDimensionValue({
          sessionId: dimensionValue.sessionId,
          dimension: dimensionValue.dimension,
          value: dimensionValue.value
        });
      }
      this.dimensionValues.delete(id);
      const cqsToDelete = Array.from(this.competencyQuestions.values()).filter((cq) => {
        if (dimensionValue.dimension === "domain_coverage") {
          return cq.domainCoverage === dimensionValue.value && cq.sessionId === dimensionValue.sessionId;
        } else if (dimensionValue.dimension === "terminology_granularity") {
          return cq.terminologyGranularity === dimensionValue.value && cq.sessionId === dimensionValue.sessionId;
        }
        return false;
      });
      cqsToDelete.forEach((cq) => {
        this.competencyQuestions.delete(cq.id);
      });
    }
  }
  async createDeletedDimensionValue(insertDeletedValue) {
    const id = randomUUID();
    const deletedValue = {
      id,
      sessionId: insertDeletedValue.sessionId || null,
      dimension: insertDeletedValue.dimension,
      value: insertDeletedValue.value,
      deletedAt: /* @__PURE__ */ new Date()
    };
    this.deletedDimensionValues.set(id, deletedValue);
    return deletedValue;
  }
  async getDeletedDimensionValuesBySession(sessionId) {
    return Array.from(this.deletedDimensionValues.values()).filter(
      (deletedValue) => deletedValue.sessionId === sessionId
    );
  }
  async createDeletedTerminology(insertDeletedTerminology) {
    const id = randomUUID();
    const deletedTerminology = {
      id,
      sessionId: insertDeletedTerminology.sessionId || null,
      terminology: insertDeletedTerminology.terminology,
      deletedAt: /* @__PURE__ */ new Date()
    };
    this.deletedTerminologies.set(id, deletedTerminology);
    return deletedTerminology;
  }
  async getDeletedTerminologiesBySession(sessionId) {
    return Array.from(this.deletedTerminologies.values()).filter(
      (deletedTerminology) => deletedTerminology.sessionId === sessionId
    );
  }
  async createDeletedCompetencyQuestion(insertDeletedCQ) {
    const id = randomUUID();
    const deletedCQ = {
      id,
      sessionId: insertDeletedCQ.sessionId || null,
      question: insertDeletedCQ.question,
      deletedAt: /* @__PURE__ */ new Date()
    };
    this.deletedCompetencyQuestions.set(id, deletedCQ);
    return deletedCQ;
  }
  async getDeletedCompetencyQuestionsBySession(sessionId) {
    return Array.from(this.deletedCompetencyQuestions.values()).filter(
      (deletedCQ) => deletedCQ.sessionId === sessionId
    );
  }
  async deleteCompetencyQuestion(id) {
    this.competencyQuestions.delete(id);
  }
  async createCompetencyQuestion(insertCQ) {
    const id = randomUUID();
    const cq = {
      ...insertCQ,
      id,
      sessionId: insertCQ.sessionId || null,
      suggestedTerms: insertCQ.suggestedTerms || null,
      type: insertCQ.type || null,
      isRelevant: true
    };
    this.competencyQuestions.set(id, cq);
    return cq;
  }
  async getCompetencyQuestion(id) {
    return this.competencyQuestions.get(id);
  }
  async getCompetencyQuestionsBySession(sessionId) {
    return Array.from(this.competencyQuestions.values()).filter(
      (cq) => cq.sessionId === sessionId
    );
  }
  async updateCompetencyQuestionRelevance(id, isRelevant) {
    const cq = this.competencyQuestions.get(id);
    if (cq) {
      cq.isRelevant = isRelevant;
      this.competencyQuestions.set(id, cq);
    }
  }
  async updateCompetencyQuestionTerminology(id, suggestedTerms) {
    const cq = this.competencyQuestions.get(id);
    if (cq) {
      cq.suggestedTerms = suggestedTerms;
      this.competencyQuestions.set(id, cq);
    }
  }
  async updateCompetencyQuestion(id, updates) {
    const cq = this.competencyQuestions.get(id);
    if (cq) {
      Object.assign(cq, updates);
      this.competencyQuestions.set(id, cq);
    }
  }
  async getRelevantCQsBySession(sessionId) {
    return Array.from(this.competencyQuestions.values()).filter(
      (cq) => cq.sessionId === sessionId && cq.isRelevant
    );
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var cqSessions = pgTable("cq_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: text("domain").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var dimensionValues = pgTable("dimension_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  dimension: text("dimension").notNull(),
  // "domain_coverage" or "terminology_granularity"
  value: text("value").notNull(),
  isRelevant: boolean("is_relevant").default(true)
});
var competencyQuestions = pgTable("competency_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  question: text("question").notNull(),
  domainCoverage: text("domain_coverage").notNull(),
  terminologyGranularity: text("terminology_granularity").notNull(),
  suggestedTerms: jsonb("suggested_terms").$type().default([]),
  type: text("type"),
  // "subject", "property", or "object"
  isRelevant: boolean("is_relevant").default(true),
  x: real("x").notNull(),
  // normalized position 0-1
  y: real("y").notNull()
  // normalized position 0-1
});
var deletedDimensionValues = pgTable("deleted_dimension_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  dimension: text("dimension").notNull(),
  // "domain_coverage" or "terminology_granularity"
  value: text("value").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow()
});
var deletedTerminologies = pgTable("deleted_terminologies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  terminology: text("terminology").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow()
});
var deletedCompetencyQuestions = pgTable("deleted_competency_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  question: text("question").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertCQSessionSchema = createInsertSchema(cqSessions).pick({
  domain: true
});
var insertDimensionValueSchema = createInsertSchema(dimensionValues).omit({
  id: true
});
var insertCompetencyQuestionSchema = createInsertSchema(competencyQuestions).omit({
  id: true
});
var insertDeletedDimensionValueSchema = createInsertSchema(deletedDimensionValues).omit({
  id: true,
  deletedAt: true
});
var insertDeletedTerminologySchema = createInsertSchema(deletedTerminologies).omit({
  id: true,
  deletedAt: true
});
var insertDeletedCompetencyQuestionSchema = createInsertSchema(deletedCompetencyQuestions).omit({
  id: true,
  deletedAt: true
});

// server/services/openai.ts
import OpenAI from "openai";
function getOpenAIClient(apiKey) {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }
  return new OpenAI({
    apiKey
  });
}
async function generateInitialCQSpace(domain, apiKey) {
  const prompt = `You are an expert in ontology engineering. Generate an initial design space for the domain: "${domain}".

Please provide:
1. Exactly 3 FIRST-LEVEL SUBCATEGORIES of "${domain}" for the X-axis that best represent the target domain (e.g., for "Healthcare informatics" could be "Clinical", "Devices", "Records") - each must be a single word or short phrase
2. Exactly 3 hierarchical levels for "Terminology granularity" dimension for the Y-axis: ["First-level", "Second-level", "Third-level"]

IMPORTANT: Do NOT generate any competency questions in the initial space. Only provide the dimension values.

READABILITY REQUIREMENTS:
- Use easy-to-read style with minimal capitalization
- Only capitalize the first character of each term
- Do not use capital letters elsewhere in terms
- Avoid conjunction-heavy language
- Keep terminology simple and clear

The subdomains should be:
- Core aspects of the target domain
- Distinct and non-overlapping
- Representative of the main areas within "${domain}"
- Single word or phrase for clean UI presentation

Respond with valid JSON in this exact format:
{
  "domainCoverageValues": ["subdomain1", "subdomain2", "subdomain3"],
  "terminologyGranularityValues": ["First-level", "Second-level", "Third-level"],
  "competencyQuestions": []
}`;
  try {
    const response = await getOpenAIClient(apiKey).chat.completions.create({
      model: "gpt-4.1",
      
      messages: [
        {
          role: "system",
          content: "You are an expert ontology engineer specializing in competency questions and domain modeling."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error(`Failed to generate initial CQ space: ${error}`);
  }
}
async function generateCQSuggestions(domain, domainCoverage, terminologyGranularity, existingCQs, existingTerms, irrelevantCQs, intersectionCQs = [], apiKey) {
  const availableTypes = ["subject", "property", "object"];
  const maxSuggestions = availableTypes.length;
  let granularityContext, granularityDescription;
  const levelMatch = terminologyGranularity.toLowerCase().match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)[- ]?level/);
  let levelNumber = 1;
  if (levelMatch) {
    const levelText = levelMatch[1];
    const levelMap = {
      "first": 1,
      "second": 2,
      "third": 3,
      "fourth": 4,
      "fifth": 5,
      "sixth": 6,
      "seventh": 7,
      "eighth": 8,
      "ninth": 9,
      "tenth": 10
    };
    levelNumber = levelMap[levelText] || parseInt(levelText) || 1;
  }
  if (levelNumber === 1) {
    granularityContext = "broad, general terminology at the highest conceptual level";
    granularityDescription = "Abstract, high-level terms representing major organizational units (e.g., 'Department', 'Activity', 'manages')";
  } else if (levelNumber === 2) {
    granularityContext = "intermediate terminology representing units contained within first-level concepts";
    granularityDescription = "Specialized units that are part of broader categories (e.g., 'Research group' \u2286 'Department', 'Teaching activity' \u2286 'Activity', 'supervises' \u2286 'manages')";
  } else if (levelNumber === 3) {
    granularityContext = "specific terminology representing sub-units contained within second-level concepts";
    granularityDescription = "Concrete sub-units showing clear containment (e.g., 'Nlp lab' \u2286 'Research group', 'Seminar' \u2286 'Teaching activity', 'mentors' \u2286 'supervises')";
  } else if (levelNumber === 4) {
    granularityContext = "detailed terminology representing specialized units within third-level concepts";
    granularityDescription = "Specialized sub-units with clear hierarchical containment (e.g., 'Computational linguistics team' \u2286 'Nlp lab', 'Graduate seminar' \u2286 'Seminar', 'advises thesis' \u2286 'mentors')";
  } else if (levelNumber === 5) {
    granularityContext = "highly specific terminology representing micro-units within fourth-level concepts";
    granularityDescription = "Micro-specialized units showing deep containment hierarchy (e.g., 'Semantic parsing project' \u2286 'Computational linguistics team', 'Dissertation seminar' \u2286 'Graduate seminar', 'guides research' \u2286 'advises thesis')";
  } else if (levelNumber === 6) {
    granularityContext = "extremely specific terminology representing atomic units within fifth-level concepts";
    granularityDescription = "Atomic-level units that may indicate excessive decomposition (e.g., 'Question answering module' \u2286 'Semantic parsing project', 'Proposal defense' \u2286 'Dissertation seminar', 'reviews methodology' \u2286 'guides research')";
  } else if (levelNumber >= 7) {
    granularityContext = `maximum granularity at level ${levelNumber} - potentially indicating overload through excessive decomposition`;
    granularityDescription = `Ultra-specialized sub-units that demonstrate the limits of useful hierarchical decomposition and may indicate semantic overload`;
  } else {
    granularityContext = "terms appropriate for the specified level with clear containment relationships";
    granularityDescription = "Level-appropriate terminology following containment principles";
  }
  const prompt = `You are an expert in ontology engineering. Generate ${maxSuggestions} highly varied competency questions for the domain "${domain}" with the following characteristics:
- Subdomain: ${domainCoverage}
- Terminology Granularity: ${terminologyGranularity}

Available CQ types (max 3 per type): ${availableTypes.join(", ")}
Current intersection CQs: ${intersectionCQs.map((cq) => `[${cq.type}] ${cq.question}`).join("; ")}

CRITICAL DUPLICATION PREVENTION:
- EXISTING CQs TO AVOID COMPLETELY: ${existingCQs.join("; ")}
- EXISTING TERMINOLOGY TO AVOID COMPLETELY: ${existingTerms.join("; ")}
- PREVIOUSLY MARKED IRRELEVANT (NEVER suggest again): ${irrelevantCQs.join("; ")}
- YOU MUST CHECK every suggestion against these lists before including it
- ANY suggestion that matches or is similar to existing items MUST be rejected and replaced
- ZERO TOLERANCE for any duplicates or near-duplicates

CRITICAL REQUIREMENTS:
1. Generate HIGHLY VARIED questions that represent the intersection as completely as possible
2. ZERO TOLERANCE: Ensure NO duplicate CQs or terminology terms - check every suggestion against existing lists
3. Only use available types: ${availableTypes.join(", ")}
4. Each question must be significantly different from existing intersection CQs
5. Focus on different aspects of the subdomain to maximize coverage
6. CRITICAL: The suggested terminology MUST NOT repeat any words from the question itself
7. The suggested terminology must be a meaningful, different answer to the question
8. CRITICAL SINGULAR/PLURAL CONSISTENCY: The terminology must match the grammatical form expected by the question
   - If question asks "What is the..." (singular), suggest singular terminology
   - If question asks "What are the..." (plural), suggest plural terminology  
   - If question asks "Which department..." (singular), suggest singular terminology
   - If question asks "Which students..." (plural), suggest plural terminology
9. VALIDATION REQUIRED: Before finalizing any suggestion, verify it does NOT appear in existing CQs, terminology, or irrelevant lists
10. REPLACE ANY DUPLICATES: If a suggestion matches existing content, generate a completely different alternative

READABILITY REQUIREMENTS:
- Use easy-to-read style with minimal capitalization
- Only capitalize the first character of each sentence and term
- CRITICAL: ALL terminology suggestions must be in lowercase only
- Do not use capital letters elsewhere in sentences or terms
- Avoid conjunction-heavy language
- Keep questions natural, readable, and easy to understand

Generate CQs following these types (only use available types):

CQ FORMATION RULES:
- Questions can start with: "What", "When", "Which", "Who", "Where", "Whose", or "Whom"
- All CQs must be readable and easy to understand
- Use natural language that clearly conveys the intended meaning

1. SUBJECT CQ: Uses object and property to suggest terminology about the related subject
   - Pattern: "[Question word] [property] [object]?"
   - Examples: "Who enrollsIn Course?" \u2192 suggests "Student" (NOT "Course" or "enrollsIn")
   - Examples: "What manages Department?" \u2192 suggests "Administrator" (NOT "Department" or "manages")
   - Suggests: Subject class name that answers the question meaningfully

2. PROPERTY CQ: Uses object and subject to suggest terminology about the related property  
   - Pattern: "[Question word] is the relation between [subject] and [object]?"
   - Examples: "What is the relation between Student and Course?" \u2192 suggests "enrolls in" (NOT "Student" or "Course")
   - Examples: "Which is the relation between Professor and Research?" \u2192 suggests "conducts" (NOT "Professor" or "Research")
   - Suggests: Property name (MUST be verb or verb+preposition) that describes the relationship

3. OBJECT CQ: Uses subject and property to suggest terminology about the related object
   - Pattern: "[Question word] does [subject] [property]?"
   - Examples: "What does Student enrollIn?" \u2192 suggests "Course" (NOT "Student" or "enrollIn")
   - Examples: "What does Professor teach?" \u2192 suggests "Lecture" (NOT "Professor" or "teach")
   - Suggests: Object class name that is the target of the relationship

VALIDATION RULE: The suggested terminology must NEVER contain any words that appear in the question text itself.

IMPROVED FORMATION EXAMPLES for university domain:
1. Subject CQ: "Who enrollsIn Course?" \u2192 suggests "Student" \u2713 (different from question words)
2. Property CQ: "What is the relation between Student and Course?" \u2192 suggests "enrolls in" \u2713 (describes relationship, lowercase with first char capitalized)
3. Object CQ: "What does Student enrollIn?" \u2192 suggests "Course" \u2713 (target of relationship)

BAD EXAMPLES (avoid these patterns):
\u274C "Which AcademicRecordsDivision verifiesCredentials?" \u2192 suggests "AcademicRecordsDivision" (repeats question word)
\u274C "Who approves ProcurementAuditTeam?" \u2192 suggests "ProcurementAuditTeam" (repeats question word)
\u274C "What manages Department?" \u2192 suggests "Department" (repeats question word)

QUESTION FORMATION REQUIREMENTS:
1. Use varied question words: "What", "When", "Which", "Who", "Where", "Whose", "Whom"
2. Make questions natural, readable, and easy to understand
3. Choose appropriate question words that match the context:
   - "Who" for person-related subjects
   - "What" for thing/concept-related terms  
   - "Which" for selection among options
   - "Where" for location-related terms
   - "When" for time-related terms
   - "Whose" for possession/ownership
   - "Whom" for object of action

CRITICAL FOR PROPERTY CQs: The suggested terminology MUST be ONLY verbs or verb+preposition combinations. ZERO TOLERANCE for nouns in any form:

ALLOWED PROPERTY TERMINOLOGIES (verbs and prepositions only):
- "teaches" (simple verb)
- "belongs to" (verb + preposition)
- "works in" (verb + preposition)
- "manages" (simple verb)
- "located in" (verb + preposition)  
- "comes from" (verb + preposition)
- "uses" (simple verb)
- "leads" (simple verb)
- "reports to" (verb + preposition)

ABSOLUTELY FORBIDDEN PROPERTY TERMINOLOGIES (contain nouns):
\u274C "teacher" (noun)
\u274C "manager" (noun)
\u274C "leadership" (noun)
\u274C "enrollment" (noun)
\u274C "membership" (noun)
\u274C "ownership" (noun)
\u274C "relationship" (noun)
\u274C "connection" (noun)
\u274C "association" (noun)
\u274C "administration" (noun)
\u274C "supervision" (noun)

PROPERTY TERMINOLOGY VALIDATION RULES:
1. MANDATORY: Every property terminology must pass the verb test - it must describe an action or state
2. ZERO NOUNS: If a term can be preceded by "the" or "a/an", it's a noun and is FORBIDDEN
3. VERB TEST: Property terms must make sense in "X [property] Y" where property describes what X does to/with Y
4. Examples: "Student [enrolls in] Course" \u2713, "Professor [teaches] Class" \u2713, "Student [enrollment] Course" \u274C (noun)
5. Only capitalize first character, ALL other letters lowercase
6. Use simple, direct language - avoid complex constructions

NEVER suggest nouns for properties regardless of context, user input, or domain requirements.

IMPORTANT: Focus on TBox terminology (ontology schema/structure) with DISTINCTLY DIFFERENT granularity levels:

TERMINOLOGY GRANULARITY GUIDELINES: ${granularityDescription}
Suggest ${granularityContext}

PROGRESSIVE GRANULARITY EXAMPLES for "${domainCoverage}" subdomain at level ${levelNumber}:

CONTAINMENT HIERARCHY DEMONSTRATION:
* First-level (Organizational units): "Department", "Activity", "Resource", "manages", "works in", "uses"
* Second-level (Sub-units): "Research group" \u2286 "Department", "Teaching activity" \u2286 "Activity", "Library" \u2286 "Resource", "leads" \u2286 "manages", "teaches" \u2286 "works in", "borrows" \u2286 "uses"  
* Third-level (Specialized sub-units): "Nlp lab" \u2286 "Research group", "Seminar" \u2286 "Teaching activity", "Digital collection" \u2286 "Library", "mentors" \u2286 "leads", "lectures" \u2286 "teaches", "downloads" \u2286 "borrows"
* Fourth-level (Focused teams): "Computational linguistics team" \u2286 "Nlp lab", "Graduate seminar" \u2286 "Seminar", "Multimedia repository" \u2286 "Digital collection", "advises" \u2286 "mentors", "presents" \u2286 "lectures", "streams" \u2286 "downloads"
* Fifth-level (Project groups): "Semantic parsing project" \u2286 "Computational linguistics team", "Dissertation seminar" \u2286 "Graduate seminar", "Video archive" \u2286 "Multimedia repository", "guides" \u2286 "advises", "shows" \u2286 "presents", "saves" \u2286 "streams"
* Sixth-level+ (Atomic units - overload risk): "Question answering module" \u2286 "Semantic parsing project", "Proposal defense" \u2286 "Dissertation seminar", "Lecture recording" \u2286 "Video archive", "reviews" \u2286 "guides", "explains" \u2286 "shows", "stores" \u2286 "saves"

CURRENT LEVEL REQUIREMENTS (${terminologyGranularity}):
${granularityDescription}
- Generate terminology that represents units CONTAINED WITHIN level ${levelNumber - 1} terms
- Follow "is part of" relationships, not complexity escalation
- Each term should be a clear sub-unit of the previous level

TERMINOLOGY CONSTRUCTION RULES:
- CLASS NAMES: Must demonstrate clear containment relationships ("is part of")
  * Level 1-3: Organizational units and their natural sub-units
  * Level 4-5: Specialized teams and focused groups within broader units
  * Level 6+: Atomic-level units that may indicate excessive decomposition
  
- PROPERTY NAMES: MUST be ONLY verbs or verb+preposition combinations (ABSOLUTE ZERO TOLERANCE FOR NOUNS!)
  * Level 1-3: Simple relationship verbs ("manages", "works in", "uses")
  * Level 4-5: More specific verbs contained within broader ones ("mentors" \u2286 "manages", "teaches" \u2286 "works in")  
  * Level 6+: Highly specific verbs showing fine-grained containment ("guides" \u2286 "mentors", "explains" \u2286 "teaches")
  * VERB-ONLY VALIDATION: Every property must describe an action - test with "X [property] Y"
  * FORBIDDEN NOUNS: NO "teacher", "enrollment", "leadership", "membership", "ownership", "administration", "supervision", "relationship", "connection"
  * Use simple, direct verbs: "works in" NOT "participates in", "uses" NOT "utilizes", "has" NOT "possesses"
  * CRITICAL: Only first character capitalized, all other letters lowercase: "works in" not "Works In"
  * NOUN TEST: If it can be preceded by "the" or "a/an", it's a noun and is FORBIDDEN for properties

CONTAINMENT ASSESSMENT FOR LEVEL ${levelNumber}:
${levelNumber >= 4 ? `At this deep containment level, terminology should represent increasingly specific sub-units that help users assess whether the decomposition is becoming counterproductive. Generate sub-units that are clearly contained within previous levels but may indicate excessive hierarchical decomposition.` : `Generate appropriately contained sub-units for this foundational level.`}

Each CQ suggests EXACTLY ONE terminology term based on its type and hierarchy level.

VALIDATION REQUIREMENTS BEFORE GENERATING:
1. Check that the suggested terminology does NOT contain any words from the question
2. Ensure the terminology is a meaningful answer to the question
3. Verify the terminology follows the containment hierarchy for the current level
4. Confirm property terms are verbs/verb+preposition (no nouns)

EXAMPLE VALID QUESTIONS (terminology is different from question words):
- Subject CQs: "Who manages department?" \u2192 suggests "Dean" \u2713, "Which supervises project?" \u2192 suggests "Manager" \u2713
- Property CQs: "What is the relation between professor and department?" \u2192 suggests "works in" \u2713, "Which is the relation between student and library?" \u2192 suggests "uses" \u2713
- Object CQs: "What does student enroll in?" \u2192 suggests "Course" \u2713, "Where does professor work?" \u2192 suggests "Office" \u2713

CRITICAL SINGULAR/PLURAL EXAMPLES:
\u2705 "What is the main department?" \u2192 suggests "Computer Science Department" (singular)
\u2705 "What are the departments?" \u2192 suggests "Computer Science, Mathematics, Physics" (plural list)
\u2705 "Which professor leads?" \u2192 suggests "Research Director" (singular)
\u2705 "Which students participate?" \u2192 suggests "Graduate Students, Undergraduates" (plural)
\u274C "What is the department?" \u2192 suggests "Departments" (WRONG - should be singular)
\u274C "What are the functions?" \u2192 suggests "Function" (WRONG - should be plural)
\u274C "Which professor?" \u2192 suggests "Professors" (WRONG - should be singular)
\u274C "Which students?" \u2192 suggests "Student" (WRONG - should be plural)

EXAMPLE INVALID QUESTIONS (avoid these):
\u274C "Which AcademicRecordsDivision verifiesCredentials?" \u2192 suggests "AcademicRecordsDivision" (repeats from question)
\u274C "Who approves ProcurementAuditTeam?" \u2192 suggests "ProcurementAuditTeam" (repeats from question)
\u274C "What does Department manage?" \u2192 suggests "Department" (repeats from question)

ENSURE READABILITY: Questions must be grammatically correct and easily understood by domain experts.

FINAL VALIDATION CHECKLIST FOR EACH CQ:
\u2713 Does the suggested terminology contain ANY words from the question? If YES, reject and regenerate.
\u2713 Is the suggested terminology a meaningful answer to the question? If NO, reject and regenerate.
\u2713 For Property CQs: Is the suggested term a verb or verb+preposition? If NO, reject and regenerate.
\u2713 Does the terminology follow the containment hierarchy for level ${levelNumber}? If NO, reject and regenerate.
\u2713 CRITICAL SINGULAR/PLURAL CHECK: Does the terminology match the grammatical form expected by the question? If NO, reject and regenerate.
\u2713 CRITICAL: Does the CQ question appear in existing CQs list? If YES, reject and regenerate.
\u2713 CRITICAL: Does the suggested terminology appear in existing terminology list? If YES, reject and regenerate.
\u2713 CRITICAL: Does the CQ question appear in irrelevant CQs list? If YES, reject and regenerate.
\u2713 ALL suggestions must be completely NEW and DIFFERENT from any existing content.

Respond with valid JSON in this exact format (include only available types):
{
  "suggestions": [
    {
      "question": "Natural, readable question using appropriate question word",
      "suggestedTerms": ["SingleAppropriateTermForLevel_NO_REPETITION_FROM_QUESTION"],
      "type": "available_type"
    }
  ]
}`;
  try {
    const response = await getOpenAIClient(apiKey).chat.completions.create({
      model: "gpt-4.1",
     
      messages: [
        {
          role: "system",
          content: "You are an expert ontology engineer specializing in TBox terminology and structured competency questions. ABSOLUTE CRITICAL RULES: 1) ZERO TOLERANCE for duplicates - READ ALL EXISTING CONTENT CAREFULLY and NEVER suggest any CQ or terminology that appears in existing lists. 2) For Property CQs, you MUST suggest only verbs or verb+preposition combinations. NEVER suggest nouns for properties. 3) The suggested terminology must NEVER contain any words that appear in the question text. 4) The suggested terminology must be a meaningful, different answer to the question. 5) MANDATORY VALIDATION: Before including ANY suggestion, cross-check against ALL existing CQs, terminology, and irrelevant lists. 6) If ANY suggestion matches existing content, you MUST completely reject it and generate a truly unique alternative. 7) FINAL CHECK: Re-read all existing content and confirm zero overlap."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8
    });
    const result = JSON.parse(
      response.choices[0].message.content || '{"suggestions": []}'
    );
    if (result.suggestions) {
      result.suggestions = await Promise.all(result.suggestions.map(async (suggestion) => {
        let suggestedTerms = (suggestion.suggestedTerms || []).map((term) => term.toLowerCase().trim());
        if (suggestion.type === "property") {
          let attempts = 0;
          const maxAttempts = 5;
          while (attempts < maxAttempts) {
            const nounsDetected = suggestedTerms.filter((term) => containsNoun(term));
            if (nounsDetected.length === 0) {
              break;
            }
            console.log(`Property terminology validation in generateCQSuggestions attempt ${attempts + 1}: Found ${nounsDetected.length} terms with nouns: ${nounsDetected.join(", ")}`);
            try {
              const regeneratedResponse = await getOpenAIClient(apiKey).chat.completions.create({
                model: "gpt-4.1",
                messages: [
                  {
                    role: "system",
                    content: "You are an expert ontology engineer. CRITICAL: Generate ONLY verbs or verb+preposition combinations. ABSOLUTELY FORBIDDEN: any nouns."
                  },
                  {
                    role: "user",
                    content: `Generate exactly ${suggestedTerms.length} NEW property terminology suggestions that are ONLY verbs or verb+preposition combinations. Must be lowercase. Examples: "teaches", "works in", "belongs to", "manages", "uses", "reports to". RESPOND WITH JSON: {"suggestedTerms": ["verb1", "verb2", "verb3"]}`
                  }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
              });
              const regeneratedResult = JSON.parse(regeneratedResponse.choices[0].message.content || '{"suggestedTerms": []}');
              suggestedTerms = (regeneratedResult.suggestedTerms || []).map((term) => term.toLowerCase().trim());
            } catch (regenerationError) {
              console.error(`Property terminology regeneration failed in generateCQSuggestions attempt ${attempts + 1}:`, regenerationError);
              break;
            }
            attempts++;
          }
          if (attempts === maxAttempts) {
            console.warn(`Property terminology validation in generateCQSuggestions: Max attempts reached, some terms may still contain nouns`);
          }
        }
        return {
          ...suggestion,
          suggestedTerms
        };
      }));
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to generate CQ suggestions: ${error}`);
  }
}
async function generateDimensionValueSuggestions(dimension, domain, existingValues, existingCQs = [], apiKey) {
  const dimensionName = dimension === "domain_coverage" ? "Subdomains" : "Terminology Granularity";
  let prompt = "";
  let nextLevelName;
  if (dimension === "domain_coverage") {
    prompt = `You are an expert in ontology engineering specializing in comprehensive domain analysis. Your task is to perform a GAP ANALYSIS of the domain "${domain}" and identify 2-3 NEW SUBDOMAINS that represent MISSING or UNDERREPRESENTED aspects.

CURRENT DOMAIN COVERAGE: ${existingValues.join(", ")}${existingCQs.length > 0 ? `

EXISTING COMPETENCY QUESTIONS CONTEXT:
${existingCQs.slice(0, 10).join("\n")}
(These questions show what aspects are already covered)` : ""}

ANALYSIS REQUIRED:
1. First, mentally map out the complete landscape of "${domain}"
2. Identify what major aspects/areas are MISSING from the current subdomains
3. Consider different perspectives: functional, structural, temporal, stakeholder-based, process-based, etc.
4. Look for coverage gaps that would represent completely different facets of "${domain}"

CRITICAL DUPLICATION PREVENTION:
- EXISTING X-AXIS VALUES TO AVOID COMPLETELY: ${existingValues.join(", ")}
- YOU MUST CHECK every suggestion against this list before including it
- ANY suggestion that matches or is semantically similar to existing values MUST be rejected and replaced
- ZERO TOLERANCE for any duplicates or near-duplicates

CRITICAL REQUIREMENTS:
- Generate subdomains that represent COMPLETELY DIFFERENT aspects of "${domain}" not covered by: ${existingValues.join(", ")}
- Focus on filling coverage GAPS to achieve comprehensive domain representation
- Each suggestion must be clearly distinguishable from existing subdomains
- Avoid any semantic overlap or similarity with existing ones
- Use single words or very short phrases (1-2 words max)
- Ensure suggestions are first-level subcategories of "${domain}"
- VALIDATION REQUIRED: Before finalizing, verify NO suggestion appears in or resembles existing values

READABILITY REQUIREMENTS:
- Use easy-to-read style with minimal capitalization
- Only capitalize the first character of each subdomain
- Do not use capital letters elsewhere in subdomains
- Avoid conjunction-heavy language
- Keep subdomain names simple and clear

EXAMPLES of gap-filling thinking:
- If existing subdomains focus on "who" and "what", suggest "where", "when", or "how" aspects
- If existing subdomains are structural, suggest functional or behavioral aspects
- If existing subdomains are internal, suggest external or environmental aspects
- If existing subdomains are core entities, suggest supporting processes or contexts

DOMAIN COMPLETENESS CHECK: What essential aspects of "${domain}" are completely missing from current coverage that would make the representation more comprehensive?

Respond with valid JSON in this format:
{
  "values": ["subdomain1", "subdomain2", "subdomain3"]
}`;
  } else {
    const existingLevels = existingValues.map((val) => {
      const match = val.toLowerCase().match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)[- ]?level/);
      if (match) {
        const levelMap = {
          "first": 1,
          "second": 2,
          "third": 3,
          "fourth": 4,
          "fifth": 5,
          "sixth": 6,
          "seventh": 7,
          "eighth": 8,
          "ninth": 9,
          "tenth": 10,
          "eleventh": 11,
          "twelfth": 12,
          "thirteenth": 13,
          "fourteenth": 14,
          "fifteenth": 15
        };
        return levelMap[match[1]] || parseInt(match[1]) || 0;
      }
      return 0;
    }).filter((n) => n > 0);
    const maxLevel = existingLevels.length > 0 ? Math.max(...existingLevels) : 0;
    const nextLevel = maxLevel + 1;
    const getOrdinalName = (num) => {
      const names = [
        "",
        "First",
        "Second",
        "Third",
        "Fourth",
        "Fifth",
        "Sixth",
        "Seventh",
        "Eighth",
        "Ninth",
        "Tenth",
        "Eleventh",
        "Twelfth",
        "Thirteenth",
        "Fourteenth",
        "Fifteenth",
        "Sixteenth",
        "Seventeenth",
        "Eighteenth",
        "Nineteenth",
        "Twentieth"
      ];
      if (num <= 20) {
        return names[num];
      } else {
        return `${num}th`;
      }
    };
    nextLevelName = `${getOrdinalName(nextLevel)}-level`;
    prompt = `You are an expert in ontology engineering. Generate ONLY the next sequential hierarchical granularity level.

EXISTING GRANULARITY LEVELS: ${existingValues.join(", ")}

CRITICAL REQUIREMENT: You must return EXACTLY this level name: "${nextLevelName}"

This represents the next sequential granularity level in the hierarchy. The terminology within this level will be more specific and detailed than existing levels, but the LEVEL NAME itself is fixed and sequential.

EXAMPLES of sequential naming:
- After "First-level", "Second-level", "Third-level" comes "Fourth-level"
- After "Fourth-level" comes "Fifth-level"
- After "Fifth-level" comes "Sixth-level"
- And so on...

Respond with valid JSON in this EXACT format:
{
  "values": ["${nextLevelName}"]
}`;
  }
  try {
    const response = await getOpenAIClient(apiKey).chat.completions.create({
      model: "gpt-4.1",
     
      messages: [
        {
          role: "system",
          content: "You are an expert ontology engineer specializing in domain modeling and competency questions. ABSOLUTE CRITICAL RULE: ZERO TOLERANCE for duplicates - NEVER suggest any subdomain that appears in or resembles existing values. VALIDATION MANDATORY: Before including ANY suggestion, verify it does NOT appear in existing lists. If ANY suggestion matches existing content, you MUST reject it and generate a completely different alternative."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    const result = JSON.parse(response.choices[0].message.content || '{"values": []}');
    if (dimension === "terminology_granularity" && typeof nextLevelName !== "undefined") {
      return { values: [nextLevelName] };
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to generate dimension value suggestions: ${error}`);
  }
}
async function generateTerminologySuggestions(domain, question, type, domainCoverage, terminologyGranularity, existingTerms, apiKey) {
  const prompt = `You are an expert in ontology engineering. Generate 3 new terminology suggestions for this competency question that are different from existing ones.

DOMAIN: "${domain}"
QUESTION: "${question}"
CQ TYPE: "${type}"
DOMAIN COVERAGE: "${domainCoverage}"
GRANULARITY: "${terminologyGranularity}"

ABSOLUTE ZERO TOLERANCE DUPLICATION PREVENTION:
- EXISTING TERMINOLOGY TO AVOID COMPLETELY: ${existingTerms.join(", ")}
- CRITICAL: EVERY suggestion must be verified as COMPLETELY NEW and UNIQUE
- FORBIDDEN: ANY term that appears in the existing list in ANY form (exact match, partial match, similar variation)
- MANDATORY: Before finalizing ANY suggestion, cross-check against the entire existing list
- REJECTION REQUIRED: If ANY suggestion matches existing terminology, it MUST be completely rejected and replaced with a truly unique alternative
- VALIDATION: Each suggestion must be 100% different from all existing terms

ABSOLUTE REQUIREMENTS:
1. Generate exactly 3 NEW terminology suggestions
2. Each must be a valid answer to the question type "${type}"
3. MANDATORY: ALL suggestions must be 100% UNIQUE and NEVER appear in existing terms: ${existingTerms.join(", ")}
4. Each suggestion must be COMPLETELY DIFFERENT from each other (zero duplicates within response)
5. Match the granularity level "${terminologyGranularity}" precisely
6. CRITICAL SINGULAR/PLURAL CONSISTENCY: Match the grammatical form expected by the CQ type
   - Subject CQs typically expect singular entities: "professor", "department", "student"  
   - Object CQs can be singular or plural based on context: "course" or "courses"
   - Property CQs use verbs: "teaches", "manages", "belongs to"
7. FINAL VALIDATION STEP: Before outputting ANY suggestion, verify it does NOT exist in the forbidden list: ${existingTerms.join(", ")}
8. DOUBLE-CHECK: Read through existing terms again and ensure your suggestions are completely new

READABILITY REQUIREMENTS:
- CRITICAL: ALL terminology suggestions must be in lowercase only
- Do not capitalize any letters in terminology suggestions
- Use easy-to-read style with no capitalization for terms
- Avoid conjunction-heavy language
- Keep terminology simple and clear

TYPE-SPECIFIC RULES:
${type === "property" ? `
- PROPERTY CQ: ABSOLUTE ZERO TOLERANCE FOR NOUNS - suggest ONLY verbs or verb+preposition combinations
- FORBIDDEN NOUNS: teacher, manager, enrollment, leadership, relationship, connection, administration, supervision, membership, ownership, association, participation, instruction, education, governance
- NOUN TEST: If a term can be preceded by "the" or "a/an", it's a noun and is FORBIDDEN
- VERB-ONLY EXAMPLES: "teaches", "works in", "belongs to", "manages", "uses", "reports to", "leads", "guides"
- ABSOLUTELY WRONG: "teacher", "enrollment", "manager", "participation", "leadership", "relationship", "connection", "administration", "supervision", "membership", "ownership"
- Use simple, direct verbs only: "works in" NOT "participates in", "uses" NOT "utilizes", "teaches" NOT "instruction"` : `
- ${type.toUpperCase()} CQ: Suggest appropriate ${type} class names
- Use single words or short phrases appropriate for the granularity level`}

GRANULARITY MATCHING:
- Generate terms that match the specificity level of "${terminologyGranularity}"
- More specific levels should suggest more detailed/specialized terms
- Less specific levels should suggest broader/general terms

Respond with valid JSON in this exact format:
{
  "suggestions": ["term1", "term2", "term3"]
}`;
  try {
    const response = await getOpenAIClient(apiKey).chat.completions.create({
      model: "gpt-4.1",
     
      messages: [
        {
          role: "system",
          content: "You are an expert ontology engineer specializing in TBox terminology. ABSOLUTE CRITICAL RULES: 1) ZERO TOLERANCE for duplicates - NEVER suggest terminology that appears in existing lists. READ THE EXISTING LIST CAREFULLY and ensure ZERO overlap. 2) PROPERTY CQs: ABSOLUTE ZERO TOLERANCE FOR NOUNS - suggest ONLY verbs or verb+preposition combinations. FORBIDDEN NOUNS: teacher, manager, enrollment, leadership, relationship, connection, administration, supervision, membership, ownership. NOUN TEST: if it can be preceded by 'the' or 'a/an', it's a noun and is FORBIDDEN. 3) MANDATORY VALIDATION: Before including ANY suggestion, cross-check it against the ENTIRE existing terminology list. 4) If ANY suggestion matches existing content in ANY way, you MUST reject it completely and generate a truly unique alternative. 5) Use simple verbs: 'works in' NOT 'participates in', 'uses' NOT 'utilizes', 'teaches' NOT 'instruction'. 6) FINAL CHECK: Re-read existing terms and confirm your suggestions are 100% new and unique."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8
    });
    const result = JSON.parse(
      response.choices[0].message.content || '{"suggestions": []}'
    );
    const suggestions = result.suggestions || [];
    let filteredSuggestions = suggestions.map((suggestion) => suggestion.toLowerCase().trim()).filter((suggestion) => {
      const existingTermsLower = existingTerms.map((term) => term.toLowerCase().trim());
      return !existingTermsLower.includes(suggestion);
    });
    if (type === "property") {
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const nounsDetected = filteredSuggestions.filter((term) => containsNoun(term));
        if (nounsDetected.length === 0) {
          break;
        }
        console.log(`Property terminology validation attempt ${attempts + 1}: Found ${nounsDetected.length} terms with nouns: ${nounsDetected.join(", ")}`);
        try {
          const regeneratedResponse = await getOpenAIClient(apiKey).chat.completions.create({
            model: "gpt-4.1",
            messages: [
              {
                role: "system",
                content: "You are an expert ontology engineer. CRITICAL: Generate ONLY verbs or verb+preposition combinations. ABSOLUTELY FORBIDDEN: any nouns, including teacher, manager, enrollment, leadership, relationship, connection, administration, supervision, membership, ownership, association, participation, instruction, education, governance, director, coordinator, assistant, specialist, analyst, designer, developer, researcher, scientist, engineer, technician, officer, representative, consultant, advisor, mentor, supervisor, administrator, executive, official, expert, professional, worker, employee, staff, member, user, client, customer, student, learner, participant, attendee, visitor, guest, host, speaker, presenter, instructor, educator, trainer, coach, guide, leader, manager, operator, controller, handler, processor, generator, creator, producer, maker, builder, designer, planner, organizer, coordinator, facilitator, mediator, moderator, reviewer, evaluator, assessor, examiner, inspector, auditor, monitor, tracker, observer, recorder, reporter, analyst, researcher, investigator, explorer, discoverer, inventor, innovator, developer, programmer, coder, architect, designer, artist, creator, author, writer, editor, publisher, distributor, supplier, provider, vendor, seller, buyer, purchaser, consumer, user, client, customer."
              },
              {
                role: "user",
                content: `Generate exactly 3 NEW property terminology suggestions that are ONLY verbs or verb+preposition combinations for: "${question}". FORBIDDEN TERMS: ${existingTerms.concat(filteredSuggestions).join(", ")}. Must be lowercase. Examples: "teaches", "works in", "belongs to", "manages", "uses", "reports to", "leads", "guides", "supports", "oversees", "coordinates", "facilitates", "operates", "maintains", "develops", "creates", "implements", "executes", "monitors", "evaluates", "analyzes", "processes", "handles", "controls", "directs", "supervises", "administers". RESPOND WITH JSON: {"suggestions": ["verb1", "verb2", "verb3"]}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8
          });
          const regeneratedResult = JSON.parse(regeneratedResponse.choices[0].message.content || '{"suggestions": []}');
          filteredSuggestions = (regeneratedResult.suggestions || []).map((suggestion) => suggestion.toLowerCase().trim()).filter((suggestion) => {
            const existingTermsLower = existingTerms.map((term) => term.toLowerCase().trim());
            return !existingTermsLower.includes(suggestion);
          });
        } catch (regenerationError) {
          console.error(`Property terminology regeneration failed on attempt ${attempts + 1}:`, regenerationError);
          break;
        }
        attempts++;
      }
      if (attempts === maxAttempts) {
        console.warn(`Property terminology validation: Max attempts reached, some terms may still contain nouns`);
      } else {
        console.log(`Property terminology validation successful after ${attempts + 1} attempts`);
      }
    }
    return filteredSuggestions;
  } catch (error) {
    throw new Error(`Failed to generate terminology suggestions: ${error}`);
  }
}
function containsNoun(term) {
  const nounPatterns = [
    // Common noun suffixes
    /\w+(tion|sion|ment|ness|ship|hood|ity|ence|ance|ing)$/,
    // Professional titles and roles (always nouns)
    /\b(teacher|instructor|educator|trainer|coach|guide|leader|manager|director|coordinator|assistant|specialist|analyst|designer|developer|researcher|scientist|engineer|technician|officer|representative|consultant|advisor|mentor|supervisor|administrator|executive|official|expert|professional|worker|employee|staff|member|user|client|customer|student|learner|participant|attendee|visitor|guest|host|speaker|presenter)\b/,
    // Academic/institutional terms
    /\b(enrollment|leadership|relationship|connection|administration|supervision|membership|ownership|association|participation|instruction|education|governance|management|coordination|facilitation|operation|maintenance|development|creation|implementation|execution|monitoring|evaluation|analysis|processing|handling|control|direction|oversight)\b/,
    // Process nouns - key indicators
    /\b(process|procedure|method|approach|technique|strategy|system|structure|framework|model|design|plan|program|project|initiative|effort|activity|task|job|work|service|function|role|responsibility|duty|obligation|requirement)\b/
  ];
  return nounPatterns.some((pattern) => pattern.test(term.toLowerCase()));
}
async function analyzeCustomCQ(question, domain, domainCoverage, terminologyGranularity, existingCQs, existingTerms, irrelevantCQs, apiKey) {
  const prompt = `You are an expert ontology engineer specializing in TBox terminology classification. Analyze this custom competency question to determine its type and generate appropriate terminology.

Domain: "${domain}"
Domain Coverage: "${domainCoverage}"
Terminology Granularity: "${terminologyGranularity}"
Custom Question: "${question}"

CRITICAL DUPLICATION PREVENTION:
- EXISTING CQs TO AVOID COMPLETELY: ${existingCQs.join("; ")}
- EXISTING TERMINOLOGY TO AVOID COMPLETELY: ${existingTerms.join("; ")}
- PREVIOUSLY MARKED IRRELEVANT (NEVER suggest again): ${irrelevantCQs.join("; ")}
- YOU MUST CHECK every suggestion against these lists before including it
- ANY suggestion that matches or is similar to existing items MUST be rejected and replaced
- ZERO TOLERANCE for any duplicates or near-duplicates

READABILITY REQUIREMENTS:
- CRITICAL: ALL terminology suggestions must be in lowercase only
- Do not capitalize any letters in terminology suggestions
- Use easy-to-read style with no capitalization for terms
- Avoid conjunction-heavy language
- Keep terminology simple and clear

CRITICAL CQ TYPE CLASSIFICATION GUIDELINES:

1. SUBJECT CQ: Asks about entities/classes that perform actions or have properties
   - Patterns: "Who [verb]...?", "What [entity] [verb]...?", "Which [entity]...?"
   - Examples: "Who teaches courses?", "What manages departments?", "Which entity enrolls in programs?"
   - Suggests: Class/entity names that answer the question

2. PROPERTY CQ: Asks about relationships, connections, or how things relate
   - REQUIRED PATTERNS: "What is the relation between...?", "How are X and Y related?", "What connects...?", "How do X relate to Y?"
   - Property CQs MUST follow the "What is the relation between [subject] and [object]?" format when asking about relationships
   - Examples: "What is the relation between Student and Course?", "How are Professor and Department related?"
   - Suggests: ONLY verbs or verb+preposition combinations (e.g., "enrolls in", "belongs to", "teaches") - ZERO TOLERANCE for nouns

3. OBJECT CQ: Asks about the target/result of an action or relationship
   - Patterns: "What does [subject] [verb]?", "Where does [subject] [verb]?", "When does [subject] [verb]?"
   - Examples: "What does Student enrollIn?", "Where does Professor teach?", "What does Department offer?"
   - Suggests: Object class names that are targets of the relationship

STRICT PROPERTY CQ DETECTION:
- ONLY classify as "property" if the question EXPLICITLY asks about the relation/relationship between two entities
- Required patterns: "What is the relation between X and Y?", "How are X and Y related?", "What connects X and Y?"
- Questions like "How does X relate to Y?" or "What relationship exists between X and Y?" qualify
- Do NOT classify as property unless the question directly asks about relationships/connections
- Be conservative: when in doubt, classify as subject or object instead

TERMINOLOGY VALIDATION RULES:
- CRITICAL: Suggested terminology must NEVER contain words from the question text
- For Property CQs: ONLY use verbs or verb+preposition (ABSOLUTE ZERO TOLERANCE FOR NOUNS like "relationship", "connection", "enrollment", "teacher", "manager", "leadership", "membership", "ownership", "administration", "supervision")
- Terminology must be a meaningful, different answer to the question  
- Match the specificity of "${terminologyGranularity}" level
- Be relevant to "${domainCoverage}" subdomain
- ZERO TOLERANCE: Ensure terminology does NOT appear in existing terminology list
- CRITICAL SINGULAR/PLURAL CONSISTENCY: Match terminology form to question grammar
- VALIDATION REQUIRED: Before finalizing any suggestion, verify it does NOT appear in existing CQs, terminology, or irrelevant lists

ANALYSIS EXAMPLES:
- "Who teaches Computer Science courses?" \u2192 TYPE: subject, TERM: "Professor" (entity that teaches)
- "What is the relation between Student and Course?" \u2192 TYPE: property, TERM: "enrolls in" (relationship verb, lowercase)
- "What does Student enroll in?" \u2192 TYPE: object, TERM: "Course" (target of enrollment)
- "How are Faculty and Department connected?" \u2192 TYPE: property, TERM: "belongs to" (relationship verb, lowercase)
- "What manages departments?" \u2192 TYPE: subject, TERM: "Administrator" (NOT property - doesn't ask about relations)

SINGULAR/PLURAL CONSISTENCY EXAMPLES:
\u2705 "What is the department?" \u2192 TYPE: subject, TERM: "Computer Science Department" (singular)
\u2705 "What are the courses?" \u2192 TYPE: object, TERM: "Algorithms, Programming" (plural)
\u2705 "Which professor leads?" \u2192 TYPE: subject, TERM: "Research Director" (singular)
\u2705 "Which students participate?" \u2192 TYPE: subject, TERM: "Graduate Students" (plural)
\u274C "What is the department?" \u2192 TERM: "Departments" (WRONG - should be singular)
\u274C "What are the courses?" \u2192 TERM: "Course" (WRONG - should be plural)

IMPORTANT: Do NOT rephrase or reformulate the user's question. Preserve the exact wording and only determine the type.

Respond with valid JSON in this exact format:
{
  "question": "${question}",
  "type": "subject|property|object",
  "suggestedTerms": ["single_term"]
}`;
  try {
    const openai = getOpenAIClient(apiKey);
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      
      messages: [
        {
          role: "system",
          content: "You are an expert ontology engineer. ABSOLUTE CRITICAL RULES: 1) ZERO TOLERANCE for duplicates - ensure suggested terminology is completely new and different from existing CQs, terminology, and irrelevant items. 2) Do NOT rephrase user questions - preserve exact wording. 3) Only classify as 'property' if the question explicitly asks about relations between entities. 4) PROPERTY CQs: ABSOLUTE ZERO TOLERANCE FOR NOUNS - suggest ONLY verbs or verb+preposition combinations. Test: if it can be preceded by 'the' or 'a/an', it's a noun and is FORBIDDEN. FORBIDDEN NOUNS: teacher, manager, enrollment, leadership, relationship, connection, administration, supervision, membership, ownership. 5) Validate that suggested terminology never repeats words from the question. 6) CRITICAL SINGULAR/PLURAL CONSISTENCY: Match terminology form to question grammar. 7) VALIDATION MANDATORY: Before including ANY suggestion, verify it does NOT appear in existing content. 8) If ANY suggestion matches existing content, generate a completely different alternative. 9) Use easy-to-read style with minimal capitalization - only capitalize first character. 10) Use simple verbs: 'works in' NOT 'participates in', 'uses' NOT 'utilizes', 'teaches' NOT 'instruction'."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    let suggestedTerms = (result.suggestedTerms || []).map((term) => term.toLowerCase().trim());
    if ((result.type || "subject") === "property") {
      let attempts = 0;
      const maxAttempts = 5;
      while (attempts < maxAttempts) {
        const nounsDetected = suggestedTerms.filter((term) => containsNoun(term));
        if (nounsDetected.length === 0) {
          break;
        }
        console.log(`Property terminology validation in analyzeCustomCQ attempt ${attempts + 1}: Found ${nounsDetected.length} terms with nouns: ${nounsDetected.join(", ")}`);
        try {
          const regeneratedResponse = await getOpenAIClient(apiKey).chat.completions.create({
            model: "gpt-4.1",
            messages: [
              {
                role: "system",
                content: "You are an expert ontology engineer. CRITICAL: For property CQs, generate ONLY verbs or verb+preposition combinations. ABSOLUTELY FORBIDDEN: any nouns."
              },
              {
                role: "user",
                content: `Generate exactly 1 NEW property terminology suggestion that is ONLY a verb or verb+preposition combination for: "${question}". Must be lowercase. Examples: "teaches", "works in", "belongs to", "manages", "uses", "reports to". RESPOND WITH JSON: {"suggestedTerms": ["verb1"]}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
          });
          const regeneratedResult = JSON.parse(regeneratedResponse.choices[0].message.content || '{"suggestedTerms": []}');
          suggestedTerms = (regeneratedResult.suggestedTerms || []).map((term) => term.toLowerCase().trim());
        } catch (regenerationError) {
          console.error(`Property terminology regeneration failed in analyzeCustomCQ attempt ${attempts + 1}:`, regenerationError);
          break;
        }
        attempts++;
      }
      if (attempts === maxAttempts) {
        console.warn(`Property terminology validation in analyzeCustomCQ: Max attempts reached, some terms may still contain nouns`);
      }
    }
    return {
      question,
      // Always use original question, never rephrase
      suggestedTerms,
      type: result.type || "subject"
    };
  } catch (error) {
    console.error("Error analyzing custom CQ:", error);
    throw new Error("Failed to analyze custom CQ");
  }
}

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  app2.post("/api/cq-sessions", async (req, res) => {
    try {
      const { domain, apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ message: "OpenAI API key is required" });
      }
      const validatedData = insertCQSessionSchema.parse({ domain });
      const session = await storage.createCQSession({ domain: validatedData.domain });
      const generatedSpace = await generateInitialCQSpace(validatedData.domain, apiKey);
      const domainCoverageValues = await Promise.all(
        generatedSpace.domainCoverageValues.map(
          (value) => storage.createDimensionValue({
            sessionId: session.id,
            dimension: "domain_coverage",
            value
          })
        )
      );
      const terminologyGranularityValues = await Promise.all(
        generatedSpace.terminologyGranularityValues.map(
          (value) => storage.createDimensionValue({
            sessionId: session.id,
            dimension: "terminology_granularity",
            value
          })
        )
      );
      const competencyQuestions2 = await Promise.all(
        generatedSpace.competencyQuestions.map(
          (cq) => storage.createCompetencyQuestion({
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
        competencyQuestions: competencyQuestions2
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create CQ session" });
    }
  });
  app2.get("/api/cq-sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const [dimensionValues2, competencyQuestions2] = await Promise.all([
        storage.getDimensionValuesBySession(sessionId),
        storage.getCompetencyQuestionsBySession(sessionId)
      ]);
      const domainCoverageValues = dimensionValues2.filter((dv) => dv.dimension === "domain_coverage");
      const terminologyGranularityValues = dimensionValues2.filter((dv) => dv.dimension === "terminology_granularity");
      res.json({
        session,
        domainCoverageValues,
        terminologyGranularityValues,
        competencyQuestions: competencyQuestions2.filter((cq) => cq.isRelevant)
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get CQ session" });
    }
  });
  app2.post("/api/cq-sessions/:sessionId/suggest-cqs", async (req, res) => {
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
      const existingCQs = relevantCQs.map((cq) => cq.question);
      const existingTerms = relevantCQs.flatMap((cq) => cq.suggestedTerms || []);
      const irrelevantCQs = allCQs.filter((cq) => !cq.isRelevant).map((cq) => cq.question);
      const deletedQuestions = deletedCQs.map((dcq) => dcq.question);
      const intersectionCQs = relevantCQs.filter((cq) => cq.domainCoverage === domainCoverage && cq.terminologyGranularity === terminologyGranularity).map((cq) => ({ type: cq.type || void 0, question: cq.question }));
      const suggestions = await generateCQSuggestions(
        session.domain,
        domainCoverage,
        terminologyGranularity,
        existingCQs,
        existingTerms,
        [...irrelevantCQs, ...deletedQuestions],
        // Combine irrelevant and deleted CQs
        intersectionCQs,
        apiKey
      );
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate CQ suggestions" });
    }
  });
  app2.post("/api/cq-sessions/:sessionId/suggest-dimension-values", async (req, res) => {
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
      const dimensionValues2 = await storage.getDimensionValuesBySession(sessionId);
      const existingValues = dimensionValues2.filter((dv) => dv.dimension === dimension).map((dv) => dv.value);
      const deletedDimensionValues2 = await storage.getDeletedDimensionValuesBySession(sessionId);
      const deletedValues = deletedDimensionValues2.filter((dv) => dv.dimension === dimension).map((dv) => dv.value);
      const combinedValues = [...existingValues, ...deletedValues];
      const excludedValues = Array.from(new Set(combinedValues));
      console.log(`Excluding ${excludedValues.length} values from suggestions (${existingValues.length} existing + ${deletedValues.length} deleted)`);
      const allCQs = dimension === "domain_coverage" ? (await storage.getCompetencyQuestionsBySession(sessionId)).filter((cq) => cq.isRelevant).map((cq) => cq.question) : [];
      const suggestions = await generateDimensionValueSuggestions(
        dimension,
        session.domain,
        excludedValues,
        // Use excluded values instead of just existing ones
        allCQs,
        apiKey
      );
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate dimension value suggestions" });
    }
  });
  app2.post("/api/cq-sessions/:sessionId/competency-questions", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const cqData = insertCompetencyQuestionSchema.parse({
        ...req.body,
        sessionId
      });
      const existingCQs = await storage.getCompetencyQuestionsBySession(sessionId);
      const isDuplicate = existingCQs.some(
        (cq) => cq.question.toLowerCase().trim() === cqData.question.toLowerCase().trim()
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
  app2.post("/api/cq-sessions/:sessionId/dimension-values", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const dimensionData = insertDimensionValueSchema.parse({
        ...req.body,
        sessionId
      });
      const existingDimensionValues = await storage.getDimensionValuesBySession(sessionId);
      const isDuplicate = existingDimensionValues.some(
        (dv) => dv.dimension === dimensionData.dimension && dv.value.toLowerCase().trim() === dimensionData.value.toLowerCase().trim()
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
  app2.patch("/api/competency-questions/:cqId/relevance", async (req, res) => {
    try {
      const { cqId } = req.params;
      const { isRelevant } = z.object({ isRelevant: z.boolean() }).parse(req.body);
      await storage.updateCompetencyQuestionRelevance(cqId, isRelevant);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update CQ relevance" });
    }
  });
  app2.patch("/api/competency-questions/:cqId", async (req, res) => {
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
  app2.delete("/api/competency-questions/:cqId/terminology/:terminology", async (req, res) => {
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
      const updatedTerms = (cq.suggestedTerms || []).filter(
        (term) => term !== decodeURIComponent(terminology)
      );
      await storage.updateCompetencyQuestionTerminology(cqId, updatedTerms);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete terminology" });
    }
  });
  app2.delete("/api/competency-questions/:cqId", async (req, res) => {
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
  app2.patch("/api/dimension-values/:dimensionId/relevance", async (req, res) => {
    try {
      const { dimensionId } = req.params;
      const { isRelevant } = z.object({ isRelevant: z.boolean() }).parse(req.body);
      await storage.updateDimensionValueRelevance(dimensionId, isRelevant);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update dimension value relevance" });
    }
  });
  app2.delete("/api/dimension-values/:dimensionId", async (req, res) => {
    try {
      const { dimensionId } = req.params;
      await storage.deleteDimensionValue(dimensionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete dimension value" });
    }
  });
  app2.delete("/api/cq-sessions/:sessionId/granularity-levels/:levelValue", async (req, res) => {
    try {
      const { sessionId, levelValue } = req.params;
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const terminologyGranularityValues = await storage.getDimensionValuesBySession(sessionId);
      const granularityLevel = terminologyGranularityValues.find(
        (dv) => dv.value === levelValue && dv.dimension === "terminology_granularity"
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
  app2.post("/api/cq-sessions/:sessionId/analyze-custom-cq", async (req, res) => {
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
      const isDuplicate = allCQs.some(
        (cq) => cq.question.toLowerCase().trim() === question.toLowerCase().trim()
      );
      if (isDuplicate) {
        return res.status(400).json({ message: "Duplicate competency question - this question already exists in the session" });
      }
      const relevantCQs = await storage.getRelevantCQsBySession(sessionId);
      const existingCQs = relevantCQs.map((cq) => cq.question);
      const existingTerms = relevantCQs.flatMap((cq) => cq.suggestedTerms || []);
      const irrelevantCQs = allCQs.filter((cq) => !cq.isRelevant).map((cq) => cq.question);
      const deletedCQs = await storage.getDeletedCompetencyQuestionsBySession(sessionId);
      const deletedQuestions = deletedCQs.map((dcq) => dcq.question);
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
  app2.get("/api/cq-sessions/:sessionId/export", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getCQSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const competencyQuestions2 = await storage.getRelevantCQsBySession(sessionId);
      const domainCoverageValues = await storage.getDimensionValuesBySession(sessionId);
      const terminologyGranularityValues = await storage.getDimensionValuesBySession(sessionId);
      const relevantDomainValues = domainCoverageValues.filter((dv) => dv.dimension === "domain_coverage" && dv.isRelevant).map((dv) => dv.value);
      const relevantGranularityValues = terminologyGranularityValues.filter((dv) => dv.dimension === "terminology_granularity" && dv.isRelevant).map((dv) => dv.value);
      const intersectionMap = /* @__PURE__ */ new Map();
      competencyQuestions2.forEach((cq) => {
        const key = `${cq.domainCoverage}|${cq.terminologyGranularity}`;
        if (!intersectionMap.has(key)) {
          intersectionMap.set(key, []);
        }
        intersectionMap.get(key).push({
          id: cq.id,
          question: cq.question,
          type: cq.type || "subject",
          terminologies: cq.suggestedTerms || [],
          position: {
            x: cq.x,
            y: cq.y
          },
          created: (/* @__PURE__ */ new Date()).toISOString()
          // Fallback since createdAt is not in current schema
        });
      });
      const intersections = [];
      const sortedIntersections = Array.from(intersectionMap.entries()).sort(([keyA], [keyB]) => {
        const [domainA, granularityA] = keyA.split("|");
        const [domainB, granularityB] = keyB.split("|");
        if (domainA !== domainB) {
          return domainA.localeCompare(domainB);
        }
        return granularityA.localeCompare(granularityB);
      });
      sortedIntersections.forEach(([key, cqs]) => {
        const [domainCoverage, terminologyGranularity] = key.split("|");
        intersections.push({
          domain_coverage: domainCoverage,
          terminology_granularity: terminologyGranularity,
          competency_questions: cqs
        });
      });
      const exportData = {
        meta: {
          schema_version: "1.0",
          exported_at: (/* @__PURE__ */ new Date()).toISOString(),
          domain: session.domain,
          session_id: session.id,
          total_questions: competencyQuestions2.length,
          total_intersections: intersections.length
        },
        dimensions: {
          domain_coverage_values: relevantDomainValues,
          terminology_granularity_values: relevantGranularityValues
        },
        intersections,
        summary: {
          questions_by_type: competencyQuestions2.reduce((acc, cq) => {
            const type = cq.type || "subject";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {}),
          questions_by_intersection: intersections.map((i) => ({
            intersection: `${i.domain_coverage} \xD7 ${i.terminology_granularity}`,
            count: i.competency_questions.length
          }))
        }
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="ontochat-${session.domain.replace(/\s+/g, "-").toLowerCase()}-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to export CQ space" });
    }
  });
  app2.post("/api/competency-questions/:cqId/suggest-terminology", async (req, res) => {
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
      const allExistingTerms = allCQsInSession.flatMap((sessionCq) => sessionCq.suggestedTerms || []).filter((term, index, array) => array.indexOf(term) === index);
      const deletedTerminologies2 = await storage.getDeletedTerminologiesBySession(cq.sessionId);
      const deletedTerms = deletedTerminologies2.map((dt) => dt.terminology);
      const combinedTerms = [...allExistingTerms, ...deletedTerms];
      const excludedTerms = Array.from(new Set(combinedTerms));
      console.log(`Space-wide terminology check: ${excludedTerms.length} excluded terms (${allExistingTerms.length} existing + ${deletedTerms.length} deleted) from ${allCQsInSession.length} CQs`);
      let uniqueTerminology = [];
      let attempt = 1;
      const maxAttempts = 10;
      let allAttemptedTerms = [...excludedTerms];
      while (uniqueTerminology.length < 3 && attempt <= maxAttempts) {
        console.log(`Terminology generation attempt ${attempt}/${maxAttempts} - targeting 3 unique suggestions`);
        const newTerminology = await generateTerminologySuggestions(
          session.domain,
          cq.question,
          cq.type || "subject",
          cq.domainCoverage,
          cq.terminologyGranularity,
          allAttemptedTerms,
          // Include all previous attempts to avoid repeating them
          apiKey
        );
        const filteredNew = newTerminology.filter((term) => {
          const termLower = term.toLowerCase().trim();
          const existingLower = allAttemptedTerms.map((t) => t.toLowerCase().trim());
          if (existingLower.includes(termLower)) {
            return false;
          }
          if (cq.type === "property") {
            return validatePropertyTerminology([term], "property").length > 0;
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
      res.json({ suggestions: uniqueTerminology.slice(0, 3) });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate terminology suggestions" });
    }
  });
  const validatePropertyTerminology = (terms, cqType) => {
    if (cqType !== "property") return terms;
    const forbiddenNouns = [
      "teacher",
      "manager",
      "enrollment",
      "leadership",
      "relationship",
      "connection",
      "administration",
      "supervision",
      "membership",
      "ownership",
      "association",
      "participation",
      "instruction",
      "education",
      "governance",
      "management",
      "service",
      "system",
      "process",
      "structure",
      "organization",
      "department",
      "division",
      "unit",
      "team",
      "group",
      "office",
      "facility"
    ];
    return terms.filter((term) => {
      const trimmedTerm = term.trim().toLowerCase();
      if (forbiddenNouns.some((noun) => trimmedTerm.includes(noun))) {
        return false;
      }
      const nounEndings = /\b\w+(tion|sion|ment|ness|ship|ity|ence|ance|ing|er|or|ist|ian)$/i;
      if (nounEndings.test(trimmedTerm)) {
        return false;
      }
      return true;
    });
  };
  app2.patch("/api/competency-questions/:cqId/terminology", async (req, res) => {
    try {
      const { cqId } = req.params;
      const { suggestedTerms } = z.object({
        suggestedTerms: z.array(z.string())
      }).parse(req.body);
      const cq = await storage.getCompetencyQuestion(cqId);
      if (!cq) {
        return res.status(404).json({ message: "Competency question not found" });
      }
      const validatedTerms = validatePropertyTerminology(suggestedTerms, cq.type || "subject");
      await storage.updateCompetencyQuestionTerminology(cqId, validatedTerms);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update terminology" });
    }
  });
  app2.get("/api/check-openai-key", (req, res) => {
    res.json({ hasKey: false, message: "Users must provide their own OpenAI API key" });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  delete process.env.OPENAI_API_KEY;
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
