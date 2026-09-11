export type RAG = "Red" | "Amber" | "Green" | "N/A";
export type ProjectStatus = "Planned" | "Active" | "On Hold" | "Completed";
export type Priority = "P1" | "P2" | "P3";
export type ContractType = "Fixed Price" | "Time & Materials" | "Retainer";
export type YesNo = "Yes" | "No";
export type Confidence = "High" | "Medium" | "Low";
export type RaidType = "Risk" | "Issue" | "Dependency" | "Assumption";
export type RaidStatus = "Open" | "Mitigating" | "Closed";
export type CrStatus = "Draft" | "Submitted" | "Approved" | "Rejected";
export type UtilizationStatus =
  | "Overallocated"
  | "Under-utilized"
  | "Healthy"
  | "Non-assignable";
export type InvoiceStatus = "Paid" | "Overdue" | "Outstanding";
export type AgingBucket = "Paid" | "Current" | "1-30" | "31-60" | "60+";
export type MilestoneStatus = "Completed" | "Overdue" | "At Risk" | "On Track";
export type RiskSeverity = "Critical" | "High" | "Medium" | "Low";
export type BudgetLineStatus =
  | "Reserve"
  | "Overspent"
  | "Near limit"
  | "Within budget";

export interface Project {
  ProjectID: string;
  ProjectName: string;
  ClientID: string;
  Portfolio: string;
  BusinessUnit: string;
  ProjectManagerID: string;
  ExecutiveSponsor: string | null;
  Status: ProjectStatus;
  Phase: string;
  Priority: Priority;
  ContractType: ContractType;
  StrategicScore: number;
  BaselineStart: Date;
  BaselineEnd: Date;
  ForecastEnd: Date;
  OriginalContractValue: number;
  TargetMarginPct: number;
  PctComplete: number;
  LastStatusUpdate: Date | null;
}

export interface Resource {
  EmployeeID: string;
  FullName: string;
  Role: string;
  Department: string;
  Level: string;
  Location: string;
  EmploymentType: string;
  CostRateHr: number;
  BillRateHr: number;
  WeeklyCapacityHrs: number;
  ManagerID: string | null;
  PrimarySkill: string;
  StartDate: Date;
}

export interface Allocation {
  AllocationID: string;
  ProjectID: string;
  EmployeeID: string;
  ProjectRole: string;
  Billable: YesNo;
  StartDate: Date;
  EndDate: Date;
  AllocationPct: number;
}

export interface Estimate {
  EstimateLineID: string;
  ProjectID: string;
  EstimateVersion: string;
  IsCurrent: YesNo;
  WBSCode: string;
  Phase: string;
  Workstream: string;
  EstimatedHours: number;
  BlendedCostRate: number;
  Confidence: Confidence;
  EstimatedByID: string;
  EstimateDate: Date;
}

export interface BudgetLine {
  BudgetLineID: string;
  ProjectID: string;
  CostCategory: string;
  BudgetAmount: number;
  ApprovedDate: Date | null;
  ApprovedBy: string | null;
  Notes: string | null;
}

export interface Actual {
  ActualID: string;
  Period: Date;
  ProjectID: string;
  CostCategory: string;
  EmployeeID: string | null;
  Vendor: string | null;
  Source: string;
  Hours: number | null;
  Billable: YesNo | null;
  Amount: number;
}

export interface Milestone {
  MilestoneID: string;
  ProjectID: string;
  MilestoneName: string;
  Phase: string;
  BaselineDate: Date;
  ForecastDate: Date;
  ActualDate: Date | null;
  IsBillingMilestone: YesNo;
  BillingPct: number | null;
}

export interface Invoice {
  InvoiceID: string;
  ProjectID: string;
  MilestoneID: string | null;
  InvoiceDate: Date;
  Description: string;
  Amount: number;
  PaidDate: Date | null;
}

export interface RaidItem {
  RAIDID: string;
  ProjectID: string;
  Type: RaidType;
  Category: string;
  Title: string;
  Probability: number;
  Impact: number;
  CostExposure: number;
  OwnerID: string;
  Status: RaidStatus;
  RaisedDate: Date;
  TargetDate: Date | null;
  Mitigation: string | null;
}

export interface ChangeRequest {
  CRID: string;
  ProjectID: string;
  Title: string;
  CRType: string;
  RaisedDate: Date;
  RaisedByID: string;
  Status: CrStatus;
  RevenueImpact: number;
  CostImpact: number;
  ScheduleImpactDays: number;
  DecisionDate: Date | null;
  DecisionBy: string | null;
}

export interface Snapshot {
  SnapshotDate: Date;
  ProjectID: string;
  Status: ProjectStatus;
  PctComplete: number;
  ActualCostToDate: number;
  CurrentBudget: number;
  EAC: number;
  ForecastMarginPct: number;
  ScheduleSlipDays: number;
  CostRAG: RAG;
  ScheduleRAG: RAG;
  MarginRAG: RAG;
  OverallRAG: RAG;
}

export interface Client {
  ClientID: string;
  ClientName: string;
  Industry: string;
  Region: string;
  Tier: string;
  AccountOwner: string;
  PaymentTermsDays: number;
}

export interface SettingsMap {
  AsOfDate: Date;
  ActualsCutoff: Date;
  RAG_CostAmber: number;
  RAG_CostRed: number;
  RAG_ScheduleAmberDays: number;
  RAG_ScheduleRedDays: number;
  MarginFloor: number;
  MarginTolerance: number;
  OverallocationThreshold: number;
  UnderutilizationThreshold: number;
  RiskCriticalScore: number;
  RiskHighScore: number;
  RiskMediumScore: number;
  MilestoneAtRiskDays: number;
  BudgetNearLimit: number;
  Contingency_High: number;
  Contingency_Medium: number;
  Contingency_Low: number;
  Currency: string;
  AutoRefreshMinutes: number;
  [key: string]: Date | number | string;
}

export interface Dataset {
  projects: Project[];
  resources: Resource[];
  allocations: Allocation[];
  estimates: Estimate[];
  budget: BudgetLine[];
  actuals: Actual[];
  milestones: Milestone[];
  invoices: Invoice[];
  raid: RaidItem[];
  changeRequests: ChangeRequest[];
  snapshots: Snapshot[];
  clients: Client[];
  settings: SettingsMap;
}

export interface DataIssue {
  table: string;
  rowNumber: number;
  column: string;
  message: string;
}

export interface ParseResult {
  dataset: Dataset;
  issues: DataIssue[];
  version: string;
  fetchedAt: Date;
}
