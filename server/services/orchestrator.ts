import { EventEmitter } from "events";
import { storage } from "../storage";
import { retryService } from "./retryService";
import { trackCost } from "../middleware/costGovernor";

export interface AgentHandoff {
  summary: string;
  decisions: string[];
  tasks: string[];
  artifacts: Array<{ name: string; content: string }>;
  questions: string[];
  nextAgentSuggestion?: string;
}

export interface AgentTask {
  runId: string;
  projectId: string;
  orgId: string;
  goal: string;
  mode: string;
}

class OrchestratorQueue extends EventEmitter {
  private queue: AgentTask[] = [];
  private processing = false;
  private concurrency = 2;
  private activeCount = 0;

  enqueue(task: AgentTask) {
    this.queue.push(task);
    this.emit("log", task.runId, { type: "info", message: "Task queued" });
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing || this.activeCount >= this.concurrency) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    this.activeCount++;
    this.processing = true;

    try {
      await this.executeTask(task);
    } catch (error) {
      this.emit("log", task.runId, {
        type: "error",
        message: `Task failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      
      await storage.updateAgentRun(task.runId, {
        status: "failed",
        outputJson: { error: error instanceof Error ? error.message : "Unknown error" },
      });
    } finally {
      this.activeCount--;
      this.processing = false;
      
      // Process next task if queue has items
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private async executeTask(task: AgentTask) {
    const run = await storage.getAgentRun(task.runId);
    if (!run) {
      throw new Error("Agent run not found");
    }

    this.emit("log", task.runId, {
      type: "info",
      message: `Starting agent run with ${run.provider} (${run.model})`,
    });

    await storage.updateAgentRun(task.runId, { status: "running" });

    // Create initial message
    await storage.createMessage({
      projectId: task.projectId,
      agentRunId: task.runId,
      role: "user",
      content: task.goal,
    });

    this.emit("log", task.runId, {
      type: "info",
      message: `Calling ${run.provider} with model ${run.model} (with retry/fallback)...`,
    });

    const response = await retryService.callWithRetry(
      run.provider,
      task.goal,
      run.model,
      (attempt, error, nextProvider) => {
        if (nextProvider) {
          this.emit("log", task.runId, {
            type: "warning",
            message: `Provider failed, falling back to ${nextProvider}. Error: ${error}`,
          });
        } else {
          this.emit("log", task.runId, {
            type: "warning",
            message: `Retry attempt ${attempt}. Error: ${error}`,
          });
        }
      }
    );

    if (!response.success) {
      throw new Error(response.error || "Provider call failed");
    }

    if (response.usedProvider !== run.provider) {
      this.emit("log", task.runId, {
        type: "info",
        message: `Used fallback provider: ${response.usedProvider} (${response.attempts} total attempts)`,
      });
    }

    // Save the response
    await storage.createMessage({
      projectId: task.projectId,
      agentRunId: task.runId,
      role: "assistant",
      content: response.content || "",
    });

    const costEstimate = response.usage?.costEstimate || "0";
    await storage.updateAgentRun(task.runId, {
      status: "completed",
      outputJson: {
        content: response.content,
        usage: response.usage,
        usedProvider: response.usedProvider,
        attempts: response.attempts,
      },
      costEstimate,
    });

    // Track cost in budget
    if (parseFloat(costEstimate) > 0) {
      await trackCost(task.orgId, costEstimate);
    }

    // Create usage record with actual provider used (for analytics)
    const org = await storage.getOrg(task.orgId);
    if (org) {
      await storage.createUsageRecord({
        orgId: task.orgId,
        userId: org.ownerUserId,
        provider: response.usedProvider,
        model: run.model,
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        estimatedCostUsd: costEstimate,
        metadata: {
          agentRunId: task.runId,
          originalProvider: run.provider,
          attempts: response.attempts,
        },
      });
    }

    this.emit("log", task.runId, {
      type: "success",
      message: `Agent run completed. Cost: $${costEstimate}`,
    });

    await storage.createAuditLog({
      orgId: task.orgId,
      userId: null,
      action: "agent_run_completed",
      target: task.runId,
      detailJson: { 
        provider: run.provider, 
        usedProvider: response.usedProvider,
        model: run.model, 
        costEstimate,
        attempts: response.attempts,
      },
    });
  }
}

export const orchestratorQueue = new OrchestratorQueue();
