import { useState, useEffect } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  Coins,
  TrendingUp,
  AlertTriangle,
  Settings,
  Loader2,
  Save,
  Clock,
} from "lucide-react";

interface UsageSummary {
  totalTokens: number;
  totalCostUsd: number;
  periodDays: number;
}

interface ProviderUsage {
  tokens: number;
  costUsd: number;
}

interface UsageRecord {
  id: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: string;
  createdAt: string;
}

interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
}

interface Budget {
  id?: string;
  period: "daily" | "monthly";
  limitUsd: number;
  spentUsd: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10b981",
  anthropic: "#f59e0b",
  perplexity: "#8b5cf6",
  xai: "#ef4444",
  gemini: "#3b82f6",
  google: "#3b82f6",
};

export default function Usage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [byProvider, setByProvider] = useState<Record<string, ProviderUsage>>({});
  const [recentRecords, setRecentRecords] = useState<UsageRecord[]>([]);
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<"7" | "30" | "90">("30");
  const [savingBudget, setSavingBudget] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");

  useEffect(() => {
    loadUsageData();
    loadBudgets();
  }, [periodFilter]);

  async function loadUsageData() {
    try {
      const res = await fetch(`/api/usage?days=${periodFilter}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setByProvider(data.byProvider || {});
        setRecentRecords(data.recentRecords || []);
        setDailyData(data.dailyUsage || []);
      }
    } catch (err) {
      console.error("Failed to load usage data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBudgets() {
    try {
      const res = await fetch("/api/budgets");
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.budgets || []);
        const monthly = data.budgets?.find((b: Budget) => b.period === "monthly");
        const daily = data.budgets?.find((b: Budget) => b.period === "daily");
        if (monthly) setMonthlyLimit(monthly.limitUsd.toString());
        if (daily) setDailyLimit(daily.limitUsd.toString());
      }
    } catch (err) {
      console.error("Failed to load budgets:", err);
    }
  }

  async function saveBudgets() {
    setSavingBudget(true);
    try {
      const updates = [];
      if (monthlyLimit) {
        updates.push(
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ period: "monthly", limitUsd: parseFloat(monthlyLimit) }),
          })
        );
      }
      if (dailyLimit) {
        updates.push(
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ period: "daily", limitUsd: parseFloat(dailyLimit) }),
          })
        );
      }
      await Promise.all(updates);
      loadBudgets();
    } catch (err) {
      console.error("Failed to save budgets:", err);
    } finally {
      setSavingBudget(false);
    }
  }

  const monthlyBudget = budgets.find((b) => b.period === "monthly");
  const dailyBudget = budgets.find((b) => b.period === "daily");

  const monthlyProgress = monthlyBudget
    ? (monthlyBudget.spentUsd / monthlyBudget.limitUsd) * 100
    : 0;
  const dailyProgress = dailyBudget
    ? (dailyBudget.spentUsd / dailyBudget.limitUsd) * 100
    : 0;

  const isMonthlyWarning = monthlyProgress >= 80;
  const isDailyWarning = dailyProgress >= 80;

  const providerChartData = Object.entries(byProvider).map(([provider, data]) => ({
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    tokens: data.tokens,
    cost: data.costUsd,
    fill: PROVIDER_COLORS[provider] || "#6b7280",
  }));

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-glow" data-testid="text-usage-title">
              Usage & Costs
            </h1>
            <p className="text-muted-foreground">
              Track token usage, monitor spending, and set budget alerts.
            </p>
          </div>
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
            <SelectTrigger className="w-[140px]" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(isMonthlyWarning || isDailyWarning) && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-3 rounded-lg" data-testid="budget-warning">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              Budget Warning: You've used {isMonthlyWarning ? `${monthlyProgress.toFixed(0)}% of your monthly` : ""} 
              {isMonthlyWarning && isDailyWarning ? " and " : ""}
              {isDailyWarning ? `${dailyProgress.toFixed(0)}% of your daily` : ""} budget.
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-panel border-0" data-testid="card-total-tokens">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Tokens
                  </CardTitle>
                  <Coins className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-stat-tokens">
                    {(summary?.totalTokens ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last {periodFilter} days
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-panel border-0" data-testid="card-total-cost">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Cost
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-stat-cost">
                    ${(summary?.totalCostUsd ?? 0).toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimated spend
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-panel border-0" data-testid="card-daily-avg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Daily Average
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-stat-daily-avg">
                    ${((summary?.totalCostUsd ?? 0) / parseInt(periodFilter)).toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per day average
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-panel border-0" data-testid="card-providers-count">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Providers
                  </CardTitle>
                  <Settings className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-stat-providers">
                    {Object.keys(byProvider).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used in period
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 glass-panel border-0">
                <CardHeader>
                  <CardTitle>Usage Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" fontSize={12} />
                        <YAxis yAxisId="left" stroke="#10b981" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1a2e",
                            border: "1px solid #333",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="tokens"
                          name="Tokens"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="cost"
                          name="Cost ($)"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No usage data yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle>By Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  {providerChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={providerChartData}
                          dataKey="cost"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {providerChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
                          contentStyle={{
                            backgroundColor: "#1a1a2e",
                            border: "1px solid #333",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No provider data
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Budget Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Monthly Budget</span>
                        {monthlyBudget && (
                          <span className={isMonthlyWarning ? "text-amber-500" : ""}>
                            ${monthlyBudget.spentUsd.toFixed(2)} / ${monthlyBudget.limitUsd.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {monthlyBudget ? (
                        <Progress
                          value={Math.min(monthlyProgress, 100)}
                          className={isMonthlyWarning ? "bg-amber-500/20" : ""}
                          data-testid="progress-monthly"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Daily Budget</span>
                        {dailyBudget && (
                          <span className={isDailyWarning ? "text-amber-500" : ""}>
                            ${dailyBudget.spentUsd.toFixed(2)} / ${dailyBudget.limitUsd.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {dailyBudget ? (
                        <Progress
                          value={Math.min(dailyProgress, 100)}
                          className={isDailyWarning ? "bg-amber-500/20" : ""}
                          data-testid="progress-daily"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Set Budget Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthly-limit">Monthly ($)</Label>
                        <Input
                          id="monthly-limit"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 100"
                          value={monthlyLimit}
                          onChange={(e) => setMonthlyLimit(e.target.value)}
                          data-testid="input-monthly-limit"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="daily-limit">Daily ($)</Label>
                        <Input
                          id="daily-limit"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 10"
                          value={dailyLimit}
                          onChange={(e) => setDailyLimit(e.target.value)}
                          data-testid="input-daily-limit"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={saveBudgets}
                      disabled={savingBudget || (!monthlyLimit && !dailyLimit)}
                      className="w-full"
                      data-testid="button-save-budgets"
                    >
                      {savingBudget ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Budget Limits
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentRecords.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {recentRecords.slice(0, 20).map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                          data-testid={`record-${record.id}`}
                        >
                          <div>
                            <div className="font-medium text-sm capitalize">
                              {record.provider} - {record.model}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(record.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              {(record.inputTokens + record.outputTokens).toLocaleString()} tokens
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${parseFloat(record.estimatedCostUsd).toFixed(4)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-activity">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
