import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with RBAC
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["owner", "admin", "member", "viewer"] }).notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = User["role"];

// Organizations
export const orgs = pgTable("orgs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrgSchema = createInsertSchema(orgs).omit({
  id: true,
  createdAt: true,
});

export type InsertOrg = z.infer<typeof insertOrgSchema>;
export type Org = typeof orgs.$inferSelect;

// Projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Integrations
export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // openai, anthropic, github, etc.
  status: text("status", { enum: ["connected", "syncing", "disconnected", "error"] }).notNull().default("disconnected"),
  metadataJson: jsonb("metadata_json"), // provider-specific config
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

// Secret references (not actual secrets - just pointers to Replit Secrets)
export const secretsRef = pgTable("secrets_ref", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  secretName: text("secret_name").notNull(), // e.g., "OPENAI_API_KEY"
  scopesJson: jsonb("scopes_json"), // provider-specific scopes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSecretRefSchema = createInsertSchema(secretsRef).omit({
  id: true,
  createdAt: true,
});

export type InsertSecretRef = z.infer<typeof insertSecretRefSchema>;
export type SecretRef = typeof secretsRef.$inferSelect;

// Agent runs
export const agentRuns = pgTable("agent_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["queued", "running", "completed", "failed", "cancelled", "awaiting_approval"] }).notNull().default("queued"),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  inputJson: jsonb("input_json"),
  outputJson: jsonb("output_json"),
  costEstimate: decimal("cost_estimate", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  agentRunId: varchar("agent_run_id").references(() => agentRuns.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system", "orchestrator"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Memory items
export const memoryItems = pgTable("memory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "note", "document", "link", etc.
  source: text("source").notNull(), // "manual", "notion", "drive", etc.
  content: text("content").notNull(),
  embeddingRef: text("embedding_ref"), // reference to external embedding storage
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemoryItemSchema = createInsertSchema(memoryItems).omit({
  id: true,
  createdAt: true,
});

export type InsertMemoryItem = z.infer<typeof insertMemoryItemSchema>;
export type MemoryItem = typeof memoryItems.$inferSelect;

// Audit log
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  target: text("target").notNull(),
  detailJson: jsonb("detail_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// Budgets
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  period: text("period", { enum: ["daily", "monthly"] }).notNull(),
  limitUsd: decimal("limit_usd", { precision: 10, scale: 2 }).notNull(),
  spentUsd: decimal("spent_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// API Keys for external integrations (Zapier, etc)
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// User Credentials (encrypted API keys per user)
export const userCredentials = pgTable("user_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // openai, anthropic, perplexity, xai, github, etc.
  encryptedKey: text("encrypted_key").notNull(), // AES-256-GCM encrypted API key
  iv: text("iv").notNull(), // Initialization vector for decryption
  authTag: text("auth_tag").notNull(), // Authentication tag for AES-GCM
  label: text("label"), // User-friendly label
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserCredentialSchema = createInsertSchema(userCredentials).omit({
  id: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserCredential = z.infer<typeof insertUserCredentialSchema>;
export type UserCredential = typeof userCredentials.$inferSelect;

// Usage tracking for cost estimates
export const usageRecords = pgTable("usage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estimatedCostUsd: decimal("estimated_cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  metadata: jsonb("metadata"), // Additional context (agent run id, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUsageRecordSchema = createInsertSchema(usageRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;
export type UsageRecord = typeof usageRecords.$inferSelect;

// Decision Traces - log every agent step with reasoning
export const decisionTraces = pgTable("decision_traces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentRunId: varchar("agent_run_id").notNull().references(() => agentRuns.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  stepType: text("step_type", { 
    enum: ["provider_selection", "retry", "fallback", "model_selection", "context_analysis", "tool_call", "response_generation", "error_handling"] 
  }).notNull(),
  decision: text("decision").notNull(),
  reasoning: text("reasoning").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  alternatives: jsonb("alternatives"),
  contextUsed: jsonb("context_used"),
  durationMs: integer("duration_ms"),
  approvalStatus: text("approval_status", { 
    enum: ["not_required", "pending", "approved", "rejected"] 
  }).notNull().default("not_required"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDecisionTraceSchema = createInsertSchema(decisionTraces).omit({
  id: true,
  createdAt: true,
});

export type InsertDecisionTrace = z.infer<typeof insertDecisionTraceSchema>;
export type DecisionTrace = typeof decisionTraces.$inferSelect;

// Roundtable Sessions - multi-AI conversation sessions
export const roundtableSessions = pgTable("roundtable_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  topic: text("topic"), // Discussion topic for AIs to focus on
  status: text("status", { enum: ["active", "paused", "completed"] }).notNull().default("active"),
  orchestrationMode: text("orchestration_mode", { enum: ["round_robin", "topic_based", "free_form"] }).notNull().default("round_robin"),
  maxTurns: integer("max_turns").default(20), // Prevent infinite loops
  currentTurn: integer("current_turn").notNull().default(0),
  activeProviders: text("active_providers").array(), // Which AI providers are in this session
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRoundtableSessionSchema = createInsertSchema(roundtableSessions).omit({
  id: true,
  currentTurn: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoundtableSession = z.infer<typeof insertRoundtableSessionSchema>;
export type RoundtableSession = typeof roundtableSessions.$inferSelect;

// Roundtable Messages - conversation log with signed messages
export const roundtableMessages = pgTable("roundtable_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => roundtableSessions.id, { onDelete: "cascade" }),
  senderType: text("sender_type", { enum: ["user", "ai", "system"] }).notNull(),
  senderId: varchar("sender_id"), // User ID for users, null for AI/system
  provider: text("provider"), // AI provider name (openai, anthropic, etc.)
  model: text("model"), // Specific model used (gpt-4o, claude-3, etc.)
  content: text("content").notNull(),
  signature: text("signature"), // AI-generated signature/sign-off
  sequenceNumber: integer("sequence_number").notNull(),
  tokensUsed: integer("tokens_used"),
  responseTimeMs: integer("response_time_ms"),
  metadata: jsonb("metadata"), // Additional context (reasoning, confidence, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRoundtableMessageSchema = createInsertSchema(roundtableMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertRoundtableMessage = z.infer<typeof insertRoundtableMessageSchema>;
export type RoundtableMessage = typeof roundtableMessages.$inferSelect;

// Agent Analyses - Store file analysis records
export const agentAnalyses = pgTable("agent_analyses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: varchar("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  analysisResult: jsonb("analysis_result"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Temporarily disabled - schema issues with auto-generated IDs
/*
export const insertAgentAnalysisSchema = createInsertSchema(agentAnalyses).omit({
  id: true,
  createdAt: true,
});
*/
export const insertAgentAnalysisSchema = z.object({
  orgId: z.string(),
  projectId: z.string().nullable().optional(),
  userId: z.string(),
  filePath: z.string(),
  content: z.string(),
  analysisResult: z.any().optional(),
});

export type InsertAgentAnalysis = z.infer<typeof insertAgentAnalysisSchema>;
export type AgentAnalysis = typeof agentAnalyses.$inferSelect;

// Agent Suggestions - Store AI suggestions
export const agentSuggestions = pgTable("agent_suggestions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  analysisId: integer("analysis_id").notNull().references(() => agentAnalyses.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  suggestions: jsonb("suggestions").notNull(),
  diffPreview: text("diff_preview"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Temporarily disabled - schema issues with auto-generated IDs
/*
export const insertAgentSuggestionSchema = createInsertSchema(agentSuggestions).omit({
  id: true,
  createdAt: true,
});
*/
export const insertAgentSuggestionSchema = z.object({
  analysisId: z.number(),
  provider: z.string(),
  model: z.string(),
  prompt: z.string(),
  suggestions: z.any(),
  diffPreview: z.string().nullable().optional(),
});

export type InsertAgentSuggestion = z.infer<typeof insertAgentSuggestionSchema>;
export type AgentSuggestion = typeof agentSuggestions.$inferSelect;

// Agent Proposals - Store change proposals
export const agentProposals = pgTable("agent_proposals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  suggestionId: integer("suggestion_id").references(() => agentSuggestions.id, { onDelete: "set null" }),
  filePath: text("file_path").notNull(),
  originalContent: text("original_content").notNull(),
  proposedContent: text("proposed_content").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "applied"] }).notNull().default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Temporarily disabled - schema issues with auto-generated IDs
/*
export const insertAgentProposalSchema = createInsertSchema(agentProposals).omit({
  id: true,
  createdAt: true,
});
*/
export const insertAgentProposalSchema = z.object({
  suggestionId: z.number().nullable().optional(),
  filePath: z.string(),
  originalContent: z.string(),
  proposedContent: z.string(),
  status: z.enum(["pending", "approved", "rejected", "applied"]).optional(),
  approvedBy: z.string().nullable().optional(),
});

export type InsertAgentProposal = z.infer<typeof insertAgentProposalSchema>;
export type AgentProposal = typeof agentProposals.$inferSelect;
