export type Rag = "Green" | "Amber" | "Red";
export type Lifecycle =
  | "Proposed"
  | "Active"
  | "On Hold"
  | "Completed"
  | "Cancelled";
export type HealthCheck =
  | "Agrees"
  | "Reported better than data"
  | "Reported worse than data"
  | "No status reported";
export type AppRole =
  | "PMO Admin"
  | "Executive"
  | "Program Director"
  | "Project Manager"
  | "Finance"
  | "Viewer";

export type Scope = {
  type: "All" | "Portfolio" | "Program" | "Project";
  id: string | null;
};

export type Me = {
  userId: string;
  personId: string | null;
  name: string;
  email: string;
  role: AppRole;
  canViewFinancials: boolean;
  scopes: Scope[];
};

export type DataLoad = {
  loadId: string;
  sourceSystem: string;
  sourceType: "SQL" | "Excel" | "API" | null;
  startedAt: string;
  completedAt: string | null;
  status: "Succeeded" | "Failed" | "Partial";
  rowsLoaded: number | null;
  dataAsOf: string;
  notes: string | null;
};

export type StatusPayload = {
  asOf: string;
  lastLoad: DataLoad;
  lastSuccessfulLoad: DataLoad;
  recentLoads: DataLoad[];
  nextScheduledLoad: string | null;
  rules: {
    scheduleGreenDays: number;
    scheduleAmberDays: number;
    costGreenPct: number;
    costAmberPct: number;
    highIssuesForAmber: number;
    staleDays: number;
  };
};

export type RagCounts = {
  green: number;
  amber: number;
  red: number;
  live: number;
  stale: number;
  reportedBetterThanData: number;
  noStatusReported: number;
};

export type ProgramFolder = {
  programId: string;
  programName: string;
  portfolioName: string;
  counts: RagCounts;
};

export type PortfolioPayload = {
  asOf: string;
  refreshFailed: boolean;
  totals: RagCounts;
  briefing: {
    newlyRed: number;
    reportedBetterThanData: number;
    stale: number;
    noStatusReported: number;
  };
  programs: ProgramFolder[];
};

export type ProjectSummary = {
  code: string;
  name: string;
  programId: string;
  programName: string;
  projectManager: string | null;
  lifecycle: Lifecycle;
  phase: "Initiate" | "Plan" | "Execute" | "Close" | null;
  priority: "Critical" | "High" | "Medium" | "Low" | null;
  reportedRag: Rag | null;
  calculatedRag: Rag | null;
  healthCheck: HealthCheck | null;
  weeksReportedBetter: number;
  healthReason: string | null;
  dataGaps: string | null;
  trend: "Improving" | "Stable" | "Declining" | null;
  isStale: boolean;
  daysSinceUpdate: number | null;
  newThisWeek: boolean;
};

export type BriefingKey =
  | "newlyRed"
  | "reportedBetterThanData"
  | "stale"
  | "noStatusReported";

export type BriefingGroup = {
  key: BriefingKey;
  total: number;
  items: ProjectSummary[];
};

export type BriefingPayload = {
  asOf: string;
  groups: BriefingGroup[];
};

export type RaidItem = {
  raidId: string;
  projectCode: string;
  type: "Risk" | "Assumption" | "Issue" | "Decision";
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | null;
  status: "Open" | "Mitigating" | "Escalated" | "Closed";
  owner: string | null;
  dueDate: string | null;
  mitigation: string | null;
};

export type Milestone = {
  name: string;
  isStageGate: boolean;
  baselineDate: string | null;
  forecastDate: string | null;
  actualDate: string | null;
  status: "Complete" | "On Track" | "At Risk" | "Late" | "Not Started" | null;
};

export type TeamMember = {
  name: string;
  projectRole: string | null;
  ftePct: number;
};

export type Baseline = {
  version: number;
  approvedDate: string;
  baselineFinish: string | null;
  baselineBudget?: number;
  reason: string | null;
  changeRequest: { crId: string; title: string; status: string } | null;
};

export type ProjectMoney = {
  approvedBudget: number | null;
  originalBudget: number | null;
  actualToDate: number | null;
  forecastAtCompletion: number | null;
  costVarPct: number | null;
  currency: "CAD";
  months: {
    period: string;
    planned: number;
    actual: number | null;
    forecast: number | null;
  }[];
};

export type ProjectDetail = ProjectSummary & {
  projectType: string | null;
  location: string | null;
  sponsor: string | null;
  pctComplete: number | null;
  lastStatusUpdate: string | null;
  dates: {
    baselineStart: string | null;
    baselineFinish: string | null;
    forecastFinish: string | null;
    actualFinish: string | null;
    slipDays: number | null;
    baselineVersion: number;
    originalBaselineFinish: string | null;
    slipVsOriginalDays: number | null;
  };
  baselines: Baseline[];
  milestones: Milestone[];
  raid: RaidItem[];
  team: TeamMember[];
  commentary: {
    statusCommentary: string | null;
    nextSteps: string | null;
  };
  money?: ProjectMoney;
};

export type WeekHealth = {
  weekEnding: string;
  reportedRag: Rag | null;
  calculatedRag: Rag | null;
  healthReason: string | null;
};

export type ProgramMoney = {
  programId: string;
  programName: string;
  approvedBudget: number;
  forecastAtCompletion: number;
  costVarPct: number | null;
  currency: "CAD";
};

export type PersonLoad = {
  personId: string;
  name: string;
  role: string;
  totalFte: number;
  projectCount: number;
  overAllocated: boolean;
};

export type ListProjectsQuery = {
  q?: string;
  programId?: string;
  pmId?: string;
  lifecycle?: Lifecycle;
  calculatedRag?: Rag;
  healthCheck?: HealthCheck;
  stale?: boolean;
  rebaselined?: boolean;
  sort?: "severity" | "name" | "code" | "forecastFinish";
  limit?: number;
  cursor?: string;
};
