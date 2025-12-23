import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const cqSessions = pgTable("cq_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: text("domain").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dimensionValues = pgTable("dimension_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  dimension: text("dimension").notNull(),
  value: text("value").notNull(),
  isRelevant: boolean("is_relevant").default(true),
});

export const competencyQuestions = pgTable("competency_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  question: text("question").notNull(),
  domainCoverage: text("domain_coverage").notNull(),
  terminologyGranularity: text("terminology_granularity").notNull(),
  suggestedTerms: jsonb("suggested_terms").$type<string[]>().default([]),
  type: text("type"),
  isRelevant: boolean("is_relevant").default(true),
  x: real("x").notNull(),
  y: real("y").notNull(),
});

export const deletedDimensionValues = pgTable("deleted_dimension_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  dimension: text("dimension").notNull(),
  value: text("value").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

export const deletedTerminologies = pgTable("deleted_terminologies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  terminology: text("terminology").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

export const deletedCompetencyQuestions = pgTable("deleted_competency_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => cqSessions.id),
  question: text("question").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCQSessionSchema = createInsertSchema(cqSessions).pick({
  domain: true,
});

export const insertDimensionValueSchema = createInsertSchema(dimensionValues).omit({
  id: true,
});

export const insertCompetencyQuestionSchema = createInsertSchema(competencyQuestions).omit({
  id: true,
});

export const insertDeletedDimensionValueSchema = createInsertSchema(deletedDimensionValues).omit({
  id: true,
  deletedAt: true,
});

export const insertDeletedTerminologySchema = createInsertSchema(deletedTerminologies).omit({
  id: true,
  deletedAt: true,
});

export const insertDeletedCompetencyQuestionSchema = createInsertSchema(deletedCompetencyQuestions).omit({
  id: true,
  deletedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CQSession = typeof cqSessions.$inferSelect;
export type DimensionValue = typeof dimensionValues.$inferSelect;
export type CompetencyQuestion = typeof competencyQuestions.$inferSelect;
export type DeletedDimensionValue = typeof deletedDimensionValues.$inferSelect;
export type DeletedTerminology = typeof deletedTerminologies.$inferSelect;
export type DeletedCompetencyQuestion = typeof deletedCompetencyQuestions.$inferSelect;
export type InsertCQSession = z.infer<typeof insertCQSessionSchema>;
export type InsertDimensionValue = z.infer<typeof insertDimensionValueSchema>;
export type InsertCompetencyQuestion = z.infer<typeof insertCompetencyQuestionSchema>;
export type InsertDeletedDimensionValue = z.infer<typeof insertDeletedDimensionValueSchema>;
export type InsertDeletedTerminology = z.infer<typeof insertDeletedTerminologySchema>;
export type InsertDeletedCompetencyQuestion = z.infer<typeof insertDeletedCompetencyQuestionSchema>;
