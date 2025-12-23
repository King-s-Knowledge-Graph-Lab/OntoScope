import { type User, type InsertUser, type CQSession, type InsertCQSession, type DimensionValue, type InsertDimensionValue, type CompetencyQuestion, type InsertCompetencyQuestion, type DeletedDimensionValue, type InsertDeletedDimensionValue, type DeletedTerminology, type InsertDeletedTerminology, type DeletedCompetencyQuestion, type InsertDeletedCompetencyQuestion } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createCQSession(session: InsertCQSession): Promise<CQSession>;
  getCQSession(id: string): Promise<CQSession | undefined>;
  
  createDimensionValue(dimensionValue: InsertDimensionValue): Promise<DimensionValue>;
  getDimensionValuesBySession(sessionId: string): Promise<DimensionValue[]>;
  updateDimensionValueRelevance(id: string, isRelevant: boolean): Promise<void>;
  deleteDimensionValue(id: string): Promise<void>;
  
  createDeletedDimensionValue(deletedValue: InsertDeletedDimensionValue): Promise<DeletedDimensionValue>;
  getDeletedDimensionValuesBySession(sessionId: string): Promise<DeletedDimensionValue[]>;
  
  createDeletedTerminology(deletedTerminology: InsertDeletedTerminology): Promise<DeletedTerminology>;
  getDeletedTerminologiesBySession(sessionId: string): Promise<DeletedTerminology[]>;
  
  createDeletedCompetencyQuestion(deletedCQ: InsertDeletedCompetencyQuestion): Promise<DeletedCompetencyQuestion>;
  getDeletedCompetencyQuestionsBySession(sessionId: string): Promise<DeletedCompetencyQuestion[]>;
  
  createCompetencyQuestion(cq: InsertCompetencyQuestion): Promise<CompetencyQuestion>;
  getCompetencyQuestion(id: string): Promise<CompetencyQuestion | undefined>;
  getCompetencyQuestionsBySession(sessionId: string): Promise<CompetencyQuestion[]>;
  updateCompetencyQuestionRelevance(id: string, isRelevant: boolean): Promise<void>;
  updateCompetencyQuestionTerminology(id: string, suggestedTerms: string[]): Promise<void>;
  updateCompetencyQuestion(id: string, updates: Partial<CompetencyQuestion>): Promise<void>;
  deleteCompetencyQuestion(id: string): Promise<void>;
  getRelevantCQsBySession(sessionId: string): Promise<CompetencyQuestion[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private cqSessions: Map<string, CQSession>;
  private dimensionValues: Map<string, DimensionValue>;
  private competencyQuestions: Map<string, CompetencyQuestion>;
  private deletedDimensionValues: Map<string, DeletedDimensionValue>;
  private deletedTerminologies: Map<string, DeletedTerminology>;
  private deletedCompetencyQuestions: Map<string, DeletedCompetencyQuestion>;

  constructor() {
    this.users = new Map();
    this.cqSessions = new Map();
    this.dimensionValues = new Map();
    this.competencyQuestions = new Map();
    this.deletedDimensionValues = new Map();
    this.deletedTerminologies = new Map();
    this.deletedCompetencyQuestions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createCQSession(insertSession: InsertCQSession): Promise<CQSession> {
    const id = randomUUID();
    const session: CQSession = { 
      ...insertSession, 
      id, 
      createdAt: new Date() 
    };
    this.cqSessions.set(id, session);
    return session;
  }

  async getCQSession(id: string): Promise<CQSession | undefined> {
    return this.cqSessions.get(id);
  }

  async createDimensionValue(insertDimensionValue: InsertDimensionValue): Promise<DimensionValue> {
    const id = randomUUID();
    const dimensionValue: DimensionValue = { 
      ...insertDimensionValue, 
      id,
      sessionId: insertDimensionValue.sessionId || null,
      isRelevant: true
    };
    this.dimensionValues.set(id, dimensionValue);
    return dimensionValue;
  }

  async getDimensionValuesBySession(sessionId: string): Promise<DimensionValue[]> {
    return Array.from(this.dimensionValues.values()).filter(
      (dv) => dv.sessionId === sessionId && dv.isRelevant
    );
  }

  async updateDimensionValueRelevance(id: string, isRelevant: boolean): Promise<void> {
    const dimensionValue = this.dimensionValues.get(id);
    if (dimensionValue) {
      dimensionValue.isRelevant = isRelevant;
      this.dimensionValues.set(id, dimensionValue);
    }
  }

  async deleteDimensionValue(id: string): Promise<void> {
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
      
      const cqsToDelete = Array.from(this.competencyQuestions.values()).filter(cq => {
        if (dimensionValue.dimension === 'domain_coverage') {
          return cq.domainCoverage === dimensionValue.value && cq.sessionId === dimensionValue.sessionId;
        } else if (dimensionValue.dimension === 'terminology_granularity') {
          return cq.terminologyGranularity === dimensionValue.value && cq.sessionId === dimensionValue.sessionId;
        }
        return false;
      });
      
      cqsToDelete.forEach(cq => {
        this.competencyQuestions.delete(cq.id);
      });
    }
  }

  async createDeletedDimensionValue(insertDeletedValue: InsertDeletedDimensionValue): Promise<DeletedDimensionValue> {
    const id = randomUUID();
    const deletedValue: DeletedDimensionValue = {
      id,
      sessionId: insertDeletedValue.sessionId || null,
      dimension: insertDeletedValue.dimension,
      value: insertDeletedValue.value,
      deletedAt: new Date()
    };
    this.deletedDimensionValues.set(id, deletedValue);
    return deletedValue;
  }

  async getDeletedDimensionValuesBySession(sessionId: string): Promise<DeletedDimensionValue[]> {
    return Array.from(this.deletedDimensionValues.values()).filter(
      (deletedValue) => deletedValue.sessionId === sessionId
    );
  }

  async createDeletedTerminology(insertDeletedTerminology: InsertDeletedTerminology): Promise<DeletedTerminology> {
    const id = randomUUID();
    const deletedTerminology: DeletedTerminology = {
      id,
      sessionId: insertDeletedTerminology.sessionId || null,
      terminology: insertDeletedTerminology.terminology,
      deletedAt: new Date()
    };
    this.deletedTerminologies.set(id, deletedTerminology);
    return deletedTerminology;
  }

  async getDeletedTerminologiesBySession(sessionId: string): Promise<DeletedTerminology[]> {
    return Array.from(this.deletedTerminologies.values()).filter(
      (deletedTerminology) => deletedTerminology.sessionId === sessionId
    );
  }

  async createDeletedCompetencyQuestion(insertDeletedCQ: InsertDeletedCompetencyQuestion): Promise<DeletedCompetencyQuestion> {
    const id = randomUUID();
    const deletedCQ: DeletedCompetencyQuestion = {
      id,
      sessionId: insertDeletedCQ.sessionId || null,
      question: insertDeletedCQ.question,
      deletedAt: new Date()
    };
    this.deletedCompetencyQuestions.set(id, deletedCQ);
    return deletedCQ;
  }

  async getDeletedCompetencyQuestionsBySession(sessionId: string): Promise<DeletedCompetencyQuestion[]> {
    return Array.from(this.deletedCompetencyQuestions.values()).filter(
      (deletedCQ) => deletedCQ.sessionId === sessionId
    );
  }

  async deleteCompetencyQuestion(id: string): Promise<void> {
    this.competencyQuestions.delete(id);
  }

  async createCompetencyQuestion(insertCQ: InsertCompetencyQuestion): Promise<CompetencyQuestion> {
    const id = randomUUID();
    const cq: CompetencyQuestion = { 
      ...insertCQ, 
      id,
      sessionId: insertCQ.sessionId || null,
      suggestedTerms: (insertCQ.suggestedTerms as string[]) || null,
      type: insertCQ.type || null,
      isRelevant: true
    };
    this.competencyQuestions.set(id, cq);
    return cq;
  }

  async getCompetencyQuestion(id: string): Promise<CompetencyQuestion | undefined> {
    return this.competencyQuestions.get(id);
  }

  async getCompetencyQuestionsBySession(sessionId: string): Promise<CompetencyQuestion[]> {
    return Array.from(this.competencyQuestions.values()).filter(
      (cq) => cq.sessionId === sessionId
    );
  }

  async updateCompetencyQuestionRelevance(id: string, isRelevant: boolean): Promise<void> {
    const cq = this.competencyQuestions.get(id);
    if (cq) {
      cq.isRelevant = isRelevant;
      this.competencyQuestions.set(id, cq);
    }
  }

  async updateCompetencyQuestionTerminology(id: string, suggestedTerms: string[]): Promise<void> {
    const cq = this.competencyQuestions.get(id);
    if (cq) {
      cq.suggestedTerms = suggestedTerms;
      this.competencyQuestions.set(id, cq);
    }
  }

  async updateCompetencyQuestion(id: string, updates: Partial<CompetencyQuestion>): Promise<void> {
    const cq = this.competencyQuestions.get(id);
    if (cq) {
      Object.assign(cq, updates);
      this.competencyQuestions.set(id, cq);
    }
  }

  async getRelevantCQsBySession(sessionId: string): Promise<CompetencyQuestion[]> {
    return Array.from(this.competencyQuestions.values()).filter(
      (cq) => cq.sessionId === sessionId && cq.isRelevant
    );
  }
}

export const storage = new MemStorage();
