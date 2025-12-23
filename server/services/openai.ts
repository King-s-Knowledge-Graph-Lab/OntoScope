import OpenAI from "openai";

function getOpenAIClient(apiKey: string) {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }
  return new OpenAI({
    apiKey: apiKey,
  });
}

export interface GeneratedCQSpace {
  domainCoverageValues: string[];
  terminologyGranularityValues: string[];
  competencyQuestions: Array<{
    question: string;
    domainCoverage: string;
    terminologyGranularity: string;
    suggestedTerms: string[];
    x: number;
    y: number;
  }>;
}

export interface SuggestedCQs {
  suggestions: Array<{
    question: string;
    suggestedTerms: string[];
    type?: "subject" | "property" | "object";
  }>;
}

export interface SuggestedDimensionValues {
  values: string[];
}

export interface AnalyzedCustomCQ {
  question: string;
  suggestedTerms: string[];
  type: "subject" | "property" | "object";
}

export async function generateInitialCQSpace(
  domain: string,
  apiKey: string,
): Promise<GeneratedCQSpace> {
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
          content:
            "You are an expert ontology engineer specializing in competency questions and domain modeling.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error(`Failed to generate initial CQ space: ${error}`);
  }
}

export async function generateCQSuggestions(
  domain: string,
  domainCoverage: string,
  terminologyGranularity: string,
  existingCQs: string[],
  existingTerms: string[],
  irrelevantCQs: string[],
  intersectionCQs: Array<{ type?: string; question: string }> = [],
  apiKey: string,
): Promise<SuggestedCQs> {
  const availableTypes = ["subject", "property", "object"];
  const maxSuggestions = availableTypes.length; // Always suggest all three types

  let granularityContext, granularityDescription;
  
  const levelMatch = terminologyGranularity.toLowerCase().match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)[- ]?level/);
  let levelNumber = 1;
  
  if (levelMatch) {
    const levelText = levelMatch[1];
    const levelMap: { [key: string]: number } = {
      'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
      'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10
    };
    levelNumber = levelMap[levelText] || parseInt(levelText) || 1;
  }
  
  if (levelNumber === 1) {
    granularityContext = "broad, general terminology at the highest conceptual level";
    granularityDescription = "Abstract, high-level terms representing major organizational units (e.g., 'Department', 'Activity', 'manages')";
  } else if (levelNumber === 2) {
    granularityContext = "intermediate terminology representing units contained within first-level concepts";
    granularityDescription = "Specialized units that are part of broader categories (e.g., 'Research group' ⊆ 'Department', 'Teaching activity' ⊆ 'Activity', 'supervises' ⊆ 'manages')";
  } else if (levelNumber === 3) {
    granularityContext = "specific terminology representing sub-units contained within second-level concepts";
    granularityDescription = "Concrete sub-units showing clear containment (e.g., 'Nlp lab' ⊆ 'Research group', 'Seminar' ⊆ 'Teaching activity', 'mentors' ⊆ 'supervises')";
  } else if (levelNumber === 4) {
    granularityContext = "detailed terminology representing specialized units within third-level concepts";
    granularityDescription = "Specialized sub-units with clear hierarchical containment (e.g., 'Computational linguistics team' ⊆ 'Nlp lab', 'Graduate seminar' ⊆ 'Seminar', 'advises thesis' ⊆ 'mentors')";
  } else if (levelNumber === 5) {
    granularityContext = "highly specific terminology representing micro-units within fourth-level concepts";
    granularityDescription = "Micro-specialized units showing deep containment hierarchy (e.g., 'Semantic parsing project' ⊆ 'Computational linguistics team', 'Dissertation seminar' ⊆ 'Graduate seminar', 'guides research' ⊆ 'advises thesis')";
  } else if (levelNumber === 6) {
    granularityContext = "extremely specific terminology representing atomic units within fifth-level concepts";
    granularityDescription = "Atomic-level units that may indicate excessive decomposition (e.g., 'Question answering module' ⊆ 'Semantic parsing project', 'Proposal defense' ⊆ 'Dissertation seminar', 'reviews methodology' ⊆ 'guides research')";
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
   - Examples: "Who enrollsIn Course?" → suggests "Student" (NOT "Course" or "enrollsIn")
   - Examples: "What manages Department?" → suggests "Administrator" (NOT "Department" or "manages")
   - Suggests: Subject class name that answers the question meaningfully

2. PROPERTY CQ: Uses object and subject to suggest terminology about the related property  
   - Pattern: "[Question word] is the relation between [subject] and [object]?"
   - Examples: "What is the relation between Student and Course?" → suggests "enrolls in" (NOT "Student" or "Course")
   - Examples: "Which is the relation between Professor and Research?" → suggests "conducts" (NOT "Professor" or "Research")
   - Suggests: Property name (MUST be verb or verb+preposition) that describes the relationship

3. OBJECT CQ: Uses subject and property to suggest terminology about the related object
   - Pattern: "[Question word] does [subject] [property]?"
   - Examples: "What does Student enrollIn?" → suggests "Course" (NOT "Student" or "enrollIn")
   - Examples: "What does Professor teach?" → suggests "Lecture" (NOT "Professor" or "teach")
   - Suggests: Object class name that is the target of the relationship

VALIDATION RULE: The suggested terminology must NEVER contain any words that appear in the question text itself.

IMPROVED FORMATION EXAMPLES for university domain:
1. Subject CQ: "Who enrollsIn Course?" → suggests "Student" ✓ (different from question words)
2. Property CQ: "What is the relation between Student and Course?" → suggests "enrolls in" ✓ (describes relationship, lowercase with first char capitalized)
3. Object CQ: "What does Student enrollIn?" → suggests "Course" ✓ (target of relationship)

BAD EXAMPLES (avoid these patterns):
❌ "Which AcademicRecordsDivision verifiesCredentials?" → suggests "AcademicRecordsDivision" (repeats question word)
❌ "Who approves ProcurementAuditTeam?" → suggests "ProcurementAuditTeam" (repeats question word)
❌ "What manages Department?" → suggests "Department" (repeats question word)

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
❌ "teacher" (noun)
❌ "manager" (noun)
❌ "leadership" (noun)
❌ "enrollment" (noun)
❌ "membership" (noun)
❌ "ownership" (noun)
❌ "relationship" (noun)
❌ "connection" (noun)
❌ "association" (noun)
❌ "administration" (noun)
❌ "supervision" (noun)

PROPERTY TERMINOLOGY VALIDATION RULES:
1. MANDATORY: Every property terminology must pass the verb test - it must describe an action or state
2. ZERO NOUNS: If a term can be preceded by "the" or "a/an", it's a noun and is FORBIDDEN
3. VERB TEST: Property terms must make sense in "X [property] Y" where property describes what X does to/with Y
4. Examples: "Student [enrolls in] Course" ✓, "Professor [teaches] Class" ✓, "Student [enrollment] Course" ❌ (noun)
5. Only capitalize first character, ALL other letters lowercase
6. Use simple, direct language - avoid complex constructions

NEVER suggest nouns for properties regardless of context, user input, or domain requirements.

IMPORTANT: Focus on TBox terminology (ontology schema/structure) with DISTINCTLY DIFFERENT granularity levels:

TERMINOLOGY GRANULARITY GUIDELINES: ${granularityDescription}
Suggest ${granularityContext}

PROGRESSIVE GRANULARITY EXAMPLES for "${domainCoverage}" subdomain at level ${levelNumber}:

CONTAINMENT HIERARCHY DEMONSTRATION:
* First-level (Organizational units): "Department", "Activity", "Resource", "manages", "works in", "uses"
* Second-level (Sub-units): "Research group" ⊆ "Department", "Teaching activity" ⊆ "Activity", "Library" ⊆ "Resource", "leads" ⊆ "manages", "teaches" ⊆ "works in", "borrows" ⊆ "uses"  
* Third-level (Specialized sub-units): "Nlp lab" ⊆ "Research group", "Seminar" ⊆ "Teaching activity", "Digital collection" ⊆ "Library", "mentors" ⊆ "leads", "lectures" ⊆ "teaches", "downloads" ⊆ "borrows"
* Fourth-level (Focused teams): "Computational linguistics team" ⊆ "Nlp lab", "Graduate seminar" ⊆ "Seminar", "Multimedia repository" ⊆ "Digital collection", "advises" ⊆ "mentors", "presents" ⊆ "lectures", "streams" ⊆ "downloads"
* Fifth-level (Project groups): "Semantic parsing project" ⊆ "Computational linguistics team", "Dissertation seminar" ⊆ "Graduate seminar", "Video archive" ⊆ "Multimedia repository", "guides" ⊆ "advises", "shows" ⊆ "presents", "saves" ⊆ "streams"
* Sixth-level+ (Atomic units - overload risk): "Question answering module" ⊆ "Semantic parsing project", "Proposal defense" ⊆ "Dissertation seminar", "Lecture recording" ⊆ "Video archive", "reviews" ⊆ "guides", "explains" ⊆ "shows", "stores" ⊆ "saves"

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
  * Level 4-5: More specific verbs contained within broader ones ("mentors" ⊆ "manages", "teaches" ⊆ "works in")  
  * Level 6+: Highly specific verbs showing fine-grained containment ("guides" ⊆ "mentors", "explains" ⊆ "teaches")
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
- Subject CQs: "Who manages department?" → suggests "Dean" ✓, "Which supervises project?" → suggests "Manager" ✓
- Property CQs: "What is the relation between professor and department?" → suggests "works in" ✓, "Which is the relation between student and library?" → suggests "uses" ✓
- Object CQs: "What does student enroll in?" → suggests "Course" ✓, "Where does professor work?" → suggests "Office" ✓

CRITICAL SINGULAR/PLURAL EXAMPLES:
✅ "What is the main department?" → suggests "Computer Science Department" (singular)
✅ "What are the departments?" → suggests "Computer Science, Mathematics, Physics" (plural list)
✅ "Which professor leads?" → suggests "Research Director" (singular)
✅ "Which students participate?" → suggests "Graduate Students, Undergraduates" (plural)
❌ "What is the department?" → suggests "Departments" (WRONG - should be singular)
❌ "What are the functions?" → suggests "Function" (WRONG - should be plural)
❌ "Which professor?" → suggests "Professors" (WRONG - should be singular)
❌ "Which students?" → suggests "Student" (WRONG - should be plural)

EXAMPLE INVALID QUESTIONS (avoid these):
❌ "Which AcademicRecordsDivision verifiesCredentials?" → suggests "AcademicRecordsDivision" (repeats from question)
❌ "Who approves ProcurementAuditTeam?" → suggests "ProcurementAuditTeam" (repeats from question)
❌ "What does Department manage?" → suggests "Department" (repeats from question)

ENSURE READABILITY: Questions must be grammatically correct and easily understood by domain experts.

FINAL VALIDATION CHECKLIST FOR EACH CQ:
✓ Does the suggested terminology contain ANY words from the question? If YES, reject and regenerate.
✓ Is the suggested terminology a meaningful answer to the question? If NO, reject and regenerate.
✓ For Property CQs: Is the suggested term a verb or verb+preposition? If NO, reject and regenerate.
✓ Does the terminology follow the containment hierarchy for level ${levelNumber}? If NO, reject and regenerate.
✓ CRITICAL SINGULAR/PLURAL CHECK: Does the terminology match the grammatical form expected by the question? If NO, reject and regenerate.
✓ CRITICAL: Does the CQ question appear in existing CQs list? If YES, reject and regenerate.
✓ CRITICAL: Does the suggested terminology appear in existing terminology list? If YES, reject and regenerate.
✓ CRITICAL: Does the CQ question appear in irrelevant CQs list? If YES, reject and regenerate.
✓ ALL suggestions must be completely NEW and DIFFERENT from any existing content.

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
          content:
            "You are an expert ontology engineer specializing in TBox terminology and structured competency questions. ABSOLUTE CRITICAL RULES: 1) ZERO TOLERANCE for duplicates - READ ALL EXISTING CONTENT CAREFULLY and NEVER suggest any CQ or terminology that appears in existing lists. 2) For Property CQs, you MUST suggest only verbs or verb+preposition combinations. NEVER suggest nouns for properties. 3) The suggested terminology must NEVER contain any words that appear in the question text. 4) The suggested terminology must be a meaningful, different answer to the question. 5) MANDATORY VALIDATION: Before including ANY suggestion, cross-check against ALL existing CQs, terminology, and irrelevant lists. 6) If ANY suggestion matches existing content, you MUST completely reject it and generate a truly unique alternative. 7) FINAL CHECK: Re-read all existing content and confirm zero overlap.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{"suggestions": []}',
    );
    
    if (result.suggestions) {
      result.suggestions = await Promise.all(result.suggestions.map(async (suggestion: any) => {
        let suggestedTerms = (suggestion.suggestedTerms || []).map((term: string) => term.toLowerCase().trim());
        
        if (suggestion.type === "property") {
          let attempts = 0;
          const maxAttempts = 5;
          
          while (attempts < maxAttempts) {
            const nounsDetected = suggestedTerms.filter((term: string) => containsNoun(term));
            
            if (nounsDetected.length === 0) {
              break; // All terms are valid verbs/verb+preposition
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
                temperature: 0.7,
              });
              
              const regeneratedResult = JSON.parse(regeneratedResponse.choices[0].message.content || '{"suggestedTerms": []}');
              suggestedTerms = (regeneratedResult.suggestedTerms || []).map((term: string) => term.toLowerCase().trim());
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
          suggestedTerms: suggestedTerms
        };
      }));
    }
    
    return result;
  } catch (error) {
    throw new Error(`Failed to generate CQ suggestions: ${error}`);
  }
}

export async function generateDimensionValueSuggestions(
  dimension: "domain_coverage" | "terminology_granularity",
  domain: string,
  existingValues: string[],
  existingCQs: string[] = [],
  apiKey: string,
): Promise<SuggestedDimensionValues> {
  const dimensionName =
    dimension === "domain_coverage" ? "Subdomains" : "Terminology Granularity";

  let prompt = "";
  let nextLevelName: string | undefined;
  
  if (dimension === "domain_coverage") {
    prompt = `You are an expert in ontology engineering specializing in comprehensive domain analysis. Your task is to perform a GAP ANALYSIS of the domain "${domain}" and identify 2-3 NEW SUBDOMAINS that represent MISSING or UNDERREPRESENTED aspects.

CURRENT DOMAIN COVERAGE: ${existingValues.join(", ")}${existingCQs.length > 0 
      ? `\n\nEXISTING COMPETENCY QUESTIONS CONTEXT:\n${existingCQs.slice(0, 10).join('\n')}\n(These questions show what aspects are already covered)`
      : ''}

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
    const existingLevels = existingValues.map(val => {
      const match = val.toLowerCase().match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)[- ]?level/);
      if (match) {
        const levelMap: { [key: string]: number } = {
          'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
          'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
          'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15
        };
        return levelMap[match[1]] || parseInt(match[1]) || 0;
      }
      return 0;
    }).filter(n => n > 0);
    
    const maxLevel = existingLevels.length > 0 ? Math.max(...existingLevels) : 0;
    const nextLevel = maxLevel + 1;
    
    const getOrdinalName = (num: number): string => {
      const names = [
        '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
        'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth'
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
          content:
            "You are an expert ontology engineer specializing in domain modeling and competency questions. ABSOLUTE CRITICAL RULE: ZERO TOLERANCE for duplicates - NEVER suggest any subdomain that appears in or resembles existing values. VALIDATION MANDATORY: Before including ANY suggestion, verify it does NOT appear in existing lists. If ANY suggestion matches existing content, you MUST reject it and generate a completely different alternative.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"values": []}');
    
    if (dimension === "terminology_granularity" && typeof nextLevelName !== 'undefined') {
      return { values: [nextLevelName] };
    }
    
    return result;
  } catch (error) {
    throw new Error(`Failed to generate dimension value suggestions: ${error}`);
  }
}

export async function generateTerminologySuggestions(
  domain: string,
  question: string,
  type: "subject" | "property" | "object",
  domainCoverage: string,
  terminologyGranularity: string,
  existingTerms: string[],
  apiKey: string
): Promise<string[]> {
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
          content:
            "You are an expert ontology engineer specializing in TBox terminology. ABSOLUTE CRITICAL RULES: 1) ZERO TOLERANCE for duplicates - NEVER suggest terminology that appears in existing lists. READ THE EXISTING LIST CAREFULLY and ensure ZERO overlap. 2) PROPERTY CQs: ABSOLUTE ZERO TOLERANCE FOR NOUNS - suggest ONLY verbs or verb+preposition combinations. FORBIDDEN NOUNS: teacher, manager, enrollment, leadership, relationship, connection, administration, supervision, membership, ownership. NOUN TEST: if it can be preceded by 'the' or 'a/an', it's a noun and is FORBIDDEN. 3) MANDATORY VALIDATION: Before including ANY suggestion, cross-check it against the ENTIRE existing terminology list. 4) If ANY suggestion matches existing content in ANY way, you MUST reject it completely and generate a truly unique alternative. 5) Use simple verbs: 'works in' NOT 'participates in', 'uses' NOT 'utilizes', 'teaches' NOT 'instruction'. 6) FINAL CHECK: Re-read existing terms and confirm your suggestions are 100% new and unique.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{"suggestions": []}',
    );
    
    const suggestions = result.suggestions || [];
    let filteredSuggestions = suggestions
      .map((suggestion: string) => suggestion.toLowerCase().trim()) // FORCE ALL TO LOWERCASE
      .filter((suggestion: string) => {
        const existingTermsLower = existingTerms.map(term => term.toLowerCase().trim());
        return !existingTermsLower.includes(suggestion);
      });

    if (type === "property") {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const nounsDetected = filteredSuggestions.filter((term: string) => containsNoun(term));
        
        if (nounsDetected.length === 0) {
          break; // All terms are valid verbs/verb+preposition
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
            temperature: 0.8,
          });
          
          const regeneratedResult = JSON.parse(regeneratedResponse.choices[0].message.content || '{"suggestions": []}');
          filteredSuggestions = (regeneratedResult.suggestions || [])
            .map((suggestion: string) => suggestion.toLowerCase().trim())
            .filter((suggestion: string) => {
              const existingTermsLower = existingTerms.map(term => term.toLowerCase().trim());
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

function containsNoun(term: string): boolean {
  const nounPatterns = [
    /\w+(tion|sion|ment|ness|ship|hood|ity|ence|ance|ing)$/,
    /\b(teacher|instructor|educator|trainer|coach|guide|leader|manager|director|coordinator|assistant|specialist|analyst|designer|developer|researcher|scientist|engineer|technician|officer|representative|consultant|advisor|mentor|supervisor|administrator|executive|official|expert|professional|worker|employee|staff|member|user|client|customer|student|learner|participant|attendee|visitor|guest|host|speaker|presenter)\b/,
    /\b(enrollment|leadership|relationship|connection|administration|supervision|membership|ownership|association|participation|instruction|education|governance|management|coordination|facilitation|operation|maintenance|development|creation|implementation|execution|monitoring|evaluation|analysis|processing|handling|control|direction|oversight)\b/,
    /\b(process|procedure|method|approach|technique|strategy|system|structure|framework|model|design|plan|program|project|initiative|effort|activity|task|job|work|service|function|role|responsibility|duty|obligation|requirement)\b/
  ];

  return nounPatterns.some(pattern => pattern.test(term.toLowerCase()));
}

export async function analyzeCustomCQ(
  question: string,
  domain: string,
  domainCoverage: string,
  terminologyGranularity: string,
  existingCQs: string[],
  existingTerms: string[],
  irrelevantCQs: string[],
  apiKey: string,
): Promise<AnalyzedCustomCQ> {
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
- "Who teaches Computer Science courses?" → TYPE: subject, TERM: "Professor" (entity that teaches)
- "What is the relation between Student and Course?" → TYPE: property, TERM: "enrolls in" (relationship verb, lowercase)
- "What does Student enroll in?" → TYPE: object, TERM: "Course" (target of enrollment)
- "How are Faculty and Department connected?" → TYPE: property, TERM: "belongs to" (relationship verb, lowercase)
- "What manages departments?" → TYPE: subject, TERM: "Administrator" (NOT property - doesn't ask about relations)

SINGULAR/PLURAL CONSISTENCY EXAMPLES:
✅ "What is the department?" → TYPE: subject, TERM: "Computer Science Department" (singular)
✅ "What are the courses?" → TYPE: object, TERM: "Algorithms, Programming" (plural)
✅ "Which professor leads?" → TYPE: subject, TERM: "Research Director" (singular)
✅ "Which students participate?" → TYPE: subject, TERM: "Graduate Students" (plural)
❌ "What is the department?" → TERM: "Departments" (WRONG - should be singular)
❌ "What are the courses?" → TERM: "Course" (WRONG - should be plural)

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
    
    let suggestedTerms = (result.suggestedTerms || []).map((term: string) => term.toLowerCase().trim()); // FORCE ALL TO LOWERCASE
    
    if ((result.type || "subject") === "property") {
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        const nounsDetected = suggestedTerms.filter((term: string) => containsNoun(term));
        
        if (nounsDetected.length === 0) {
          break; // All terms are valid verbs/verb+preposition
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
            temperature: 0.7,
          });
          
          const regeneratedResult = JSON.parse(regeneratedResponse.choices[0].message.content || '{"suggestedTerms": []}');
          suggestedTerms = (regeneratedResult.suggestedTerms || []).map((term: string) => term.toLowerCase().trim());
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
      question: question, // Always use original question, never rephrase
      suggestedTerms: suggestedTerms,
      type: result.type || "subject",
    };
  } catch (error) {
    console.error("Error analyzing custom CQ:", error);
    throw new Error("Failed to analyze custom CQ");
  }
}
