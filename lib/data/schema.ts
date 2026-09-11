import { z } from "zod";

const excelDate = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    // Excel serial date (SheetJS may already convert with cellDates)
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + v * 86400000);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}, z.date().nullable());

const requiredDate = z.preprocess((v) => {
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + v * 86400000);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d;
  }
  return v;
}, z.date());

const blankToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), schema);

const num = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return v;
}, z.number().nullable());

const requiredNum = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return v;
}, z.number());

export const ProjectSchema = z.object({
  ProjectID: z.string().min(1),
  ProjectName: z.string().min(1),
  ClientID: z.string().min(1),
  Portfolio: z.string().min(1),
  BusinessUnit: z.string().min(1),
  ProjectManagerID: z.string().min(1),
  ExecutiveSponsor: blankToNull(z.string().nullable()),
  Status: z.enum(["Planned", "Active", "On Hold", "Completed"]),
  Phase: z.string().min(1),
  Priority: z.enum(["P1", "P2", "P3"]),
  ContractType: z.enum(["Fixed Price", "Time & Materials", "Retainer"]),
  StrategicScore: requiredNum,
  BaselineStart: requiredDate,
  BaselineEnd: requiredDate,
  ForecastEnd: requiredDate,
  OriginalContractValue: requiredNum,
  TargetMarginPct: requiredNum,
  PctComplete: requiredNum,
  LastStatusUpdate: excelDate,
});

export const ResourceSchema = z.object({
  EmployeeID: z.string().min(1),
  FullName: z.string().min(1),
  Role: z.string().min(1),
  Department: z.string().min(1),
  Level: z.string().min(1),
  Location: z.string().min(1),
  EmploymentType: z.string().min(1),
  CostRateHr: requiredNum,
  BillRateHr: requiredNum,
  WeeklyCapacityHrs: requiredNum,
  ManagerID: blankToNull(z.string().nullable()),
  PrimarySkill: z.string().min(1),
  StartDate: requiredDate,
});

export const AllocationSchema = z.object({
  AllocationID: z.string().min(1),
  ProjectID: z.string().min(1),
  EmployeeID: z.string().min(1),
  ProjectRole: z.string().min(1),
  Billable: z.enum(["Yes", "No"]),
  StartDate: requiredDate,
  EndDate: requiredDate,
  AllocationPct: requiredNum,
});

export const EstimateSchema = z.object({
  EstimateLineID: z.string().min(1),
  ProjectID: z.string().min(1),
  EstimateVersion: z.string().min(1),
  IsCurrent: z.enum(["Yes", "No"]),
  WBSCode: z.string().min(1),
  Phase: z.string().min(1),
  Workstream: z.string().min(1),
  EstimatedHours: requiredNum,
  BlendedCostRate: requiredNum,
  Confidence: z.enum(["High", "Medium", "Low"]),
  EstimatedByID: z.string().min(1),
  EstimateDate: requiredDate,
});

export const BudgetSchema = z.object({
  BudgetLineID: z.string().min(1),
  ProjectID: z.string().min(1),
  CostCategory: z.string().min(1),
  BudgetAmount: requiredNum,
  ApprovedDate: excelDate,
  ApprovedBy: blankToNull(z.string().nullable()),
  Notes: blankToNull(z.string().nullable()),
});

export const ActualSchema = z.object({
  ActualID: z.string().min(1),
  Period: requiredDate,
  ProjectID: z.string().min(1),
  CostCategory: z.string().min(1),
  EmployeeID: blankToNull(z.string().nullable()),
  Vendor: blankToNull(z.string().nullable()),
  Source: z.string().min(1),
  Hours: num,
  Billable: blankToNull(z.enum(["Yes", "No"]).nullable()),
  Amount: requiredNum,
});

export const MilestoneSchema = z.object({
  MilestoneID: z.string().min(1),
  ProjectID: z.string().min(1),
  MilestoneName: z.string().min(1),
  Phase: z.string().min(1),
  BaselineDate: requiredDate,
  ForecastDate: requiredDate,
  ActualDate: excelDate,
  IsBillingMilestone: z.enum(["Yes", "No"]),
  BillingPct: num,
});

export const InvoiceSchema = z.object({
  InvoiceID: z.string().min(1),
  ProjectID: z.string().min(1),
  MilestoneID: blankToNull(z.string().nullable()),
  InvoiceDate: requiredDate,
  Description: z.string().min(1),
  Amount: requiredNum,
  PaidDate: excelDate,
});

export const RaidSchema = z.object({
  RAIDID: z.string().min(1),
  ProjectID: z.string().min(1),
  Type: z.enum(["Risk", "Issue", "Dependency", "Assumption"]),
  Category: z.string().min(1),
  Title: z.string().min(1),
  Probability: requiredNum,
  Impact: requiredNum,
  CostExposure: requiredNum,
  OwnerID: z.string().min(1),
  Status: z.enum(["Open", "Mitigating", "Closed"]),
  RaisedDate: requiredDate,
  TargetDate: excelDate,
  Mitigation: blankToNull(z.string().nullable()),
});

export const ChangeRequestSchema = z.object({
  CRID: z.string().min(1),
  ProjectID: z.string().min(1),
  Title: z.string().min(1),
  CRType: z.string().min(1),
  RaisedDate: requiredDate,
  RaisedByID: z.string().min(1),
  Status: z.enum(["Draft", "Submitted", "Approved", "Rejected"]),
  RevenueImpact: requiredNum,
  CostImpact: requiredNum,
  ScheduleImpactDays: requiredNum,
  DecisionDate: excelDate,
  DecisionBy: blankToNull(z.string().nullable()),
});

export const SnapshotSchema = z.object({
  SnapshotDate: requiredDate,
  ProjectID: z.string().min(1),
  Status: z.enum(["Planned", "Active", "On Hold", "Completed"]),
  PctComplete: requiredNum,
  ActualCostToDate: requiredNum,
  CurrentBudget: requiredNum,
  EAC: requiredNum,
  ForecastMarginPct: requiredNum,
  ScheduleSlipDays: requiredNum,
  CostRAG: z.enum(["Red", "Amber", "Green", "N/A"]),
  ScheduleRAG: z.enum(["Red", "Amber", "Green", "N/A"]),
  MarginRAG: z.enum(["Red", "Amber", "Green", "N/A"]),
  OverallRAG: z.enum(["Red", "Amber", "Green", "N/A"]),
});

export const ClientSchema = z.object({
  ClientID: z.string().min(1),
  ClientName: z.string().min(1),
  Industry: z.string().min(1),
  Region: z.string().min(1),
  Tier: z.string().min(1),
  AccountOwner: z.string().min(1),
  PaymentTermsDays: requiredNum,
});

export const TABLE_HEADERS = {
  Projects: [
    "ProjectID",
    "ProjectName",
    "ClientID",
    "Portfolio",
    "BusinessUnit",
    "ProjectManagerID",
    "ExecutiveSponsor",
    "Status",
    "Phase",
    "Priority",
    "ContractType",
    "StrategicScore",
    "BaselineStart",
    "BaselineEnd",
    "ForecastEnd",
    "OriginalContractValue",
    "TargetMarginPct",
    "PctComplete",
    "LastStatusUpdate",
  ],
  Resources: [
    "EmployeeID",
    "FullName",
    "Role",
    "Department",
    "Level",
    "Location",
    "EmploymentType",
    "CostRateHr",
    "BillRateHr",
    "WeeklyCapacityHrs",
    "ManagerID",
    "PrimarySkill",
    "StartDate",
  ],
  Allocations: [
    "AllocationID",
    "ProjectID",
    "EmployeeID",
    "ProjectRole",
    "Billable",
    "StartDate",
    "EndDate",
    "AllocationPct",
  ],
  Estimates: [
    "EstimateLineID",
    "ProjectID",
    "EstimateVersion",
    "IsCurrent",
    "WBSCode",
    "Phase",
    "Workstream",
    "EstimatedHours",
    "BlendedCostRate",
    "Confidence",
    "EstimatedByID",
    "EstimateDate",
  ],
  Budget: [
    "BudgetLineID",
    "ProjectID",
    "CostCategory",
    "BudgetAmount",
    "ApprovedDate",
    "ApprovedBy",
    "Notes",
  ],
  Actuals: [
    "ActualID",
    "Period",
    "ProjectID",
    "CostCategory",
    "EmployeeID",
    "Vendor",
    "Source",
    "Hours",
    "Billable",
    "Amount",
  ],
  Milestones: [
    "MilestoneID",
    "ProjectID",
    "MilestoneName",
    "Phase",
    "BaselineDate",
    "ForecastDate",
    "ActualDate",
    "IsBillingMilestone",
    "BillingPct",
  ],
  Invoices: [
    "InvoiceID",
    "ProjectID",
    "MilestoneID",
    "InvoiceDate",
    "Description",
    "Amount",
    "PaidDate",
  ],
  RAID: [
    "RAIDID",
    "ProjectID",
    "Type",
    "Category",
    "Title",
    "Probability",
    "Impact",
    "CostExposure",
    "OwnerID",
    "Status",
    "RaisedDate",
    "TargetDate",
    "Mitigation",
  ],
  ChangeRequests: [
    "CRID",
    "ProjectID",
    "Title",
    "CRType",
    "RaisedDate",
    "RaisedByID",
    "Status",
    "RevenueImpact",
    "CostImpact",
    "ScheduleImpactDays",
    "DecisionDate",
    "DecisionBy",
  ],
  Snapshots: [
    "SnapshotDate",
    "ProjectID",
    "Status",
    "PctComplete",
    "ActualCostToDate",
    "CurrentBudget",
    "EAC",
    "ForecastMarginPct",
    "ScheduleSlipDays",
    "CostRAG",
    "ScheduleRAG",
    "MarginRAG",
    "OverallRAG",
  ],
  Clients: [
    "ClientID",
    "ClientName",
    "Industry",
    "Region",
    "Tier",
    "AccountOwner",
    "PaymentTermsDays",
  ],
  Settings: ["Setting", "Value"],
} as const;

export type TableName = keyof typeof TABLE_HEADERS;

export const ROW_SCHEMAS = {
  Projects: ProjectSchema,
  Resources: ResourceSchema,
  Allocations: AllocationSchema,
  Estimates: EstimateSchema,
  Budget: BudgetSchema,
  Actuals: ActualSchema,
  Milestones: MilestoneSchema,
  Invoices: InvoiceSchema,
  RAID: RaidSchema,
  ChangeRequests: ChangeRequestSchema,
  Snapshots: SnapshotSchema,
  Clients: ClientSchema,
} as const;
