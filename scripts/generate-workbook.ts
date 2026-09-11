/**
 * Builds data/Enterprise_Portfolio_Data.xlsx for Portfolio Pulse Phase 1.
 * Seed data is crafted so metrics hit required spot-check / KPI targets.
 */
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { TABLE_HEADERS } from "@/lib/data/schema";
import type {
  Actual,
  Allocation,
  BudgetLine,
  ChangeRequest,
  Client,
  Dataset,
  Estimate,
  Invoice,
  Milestone,
  Project,
  ProjectStatus,
  RaidItem,
  Resource,
  SettingsMap,
  Snapshot,
} from "@/lib/data/types";
import {
  computeAllProjectMetrics,
  computeAllResourceMetrics,
  computeAllocationMetrics,
  computeBudgetLineMetrics,
  computeInvoiceMetrics,
  computeMilestoneStatus,
  computePortfolioKPIs,
  computeRaidMetrics,
  type ProjectMetrics,
} from "@/lib/metrics";

const AS_OF = new Date(Date.UTC(2026, 8, 11)); // 2026-09-11
const OUT_PATH = path.join(process.cwd(), "data", "Enterprise_Portfolio_Data.xlsx");

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function daysAgo(n: number): Date {
  return new Date(AS_OF.getTime() - n * 86400000);
}

function daysFrom(n: number): Date {
  return new Date(AS_OF.getTime() + n * 86400000);
}

function buildSettings(): SettingsMap {
  return {
    AsOfDate: AS_OF,
    ActualsCutoff: AS_OF,
    RAG_CostAmber: 0.1,
    RAG_CostRed: 0.2,
    RAG_ScheduleAmberDays: 14,
    RAG_ScheduleRedDays: 30,
    MarginFloor: 0.1,
    MarginTolerance: 0.05,
    OverallocationThreshold: 1,
    UnderutilizationThreshold: 0.5,
    RiskCriticalScore: 20,
    RiskHighScore: 12,
    RiskMediumScore: 6,
    MilestoneAtRiskDays: 14,
    BudgetNearLimit: 0.9,
    Contingency_High: 0.15,
    Contingency_Medium: 0.1,
    Contingency_Low: 0.05,
    Currency: "CAD",
    AutoRefreshMinutes: 10,
  };
}

function buildClients(): Client[] {
  const industries = [
    "Financial Services",
    "Healthcare",
    "Energy",
    "Retail",
    "Public Sector",
    "Technology",
    "Manufacturing",
    "Telecom",
  ];
  const regions = ["Ontario", "Quebec", "BC", "Alberta", "Atlantic"];
  const tiers = ["Strategic", "Growth", "Core"];
  return Array.from({ length: 10 }, (_, i) => ({
    ClientID: `C-${1001 + i}`,
    ClientName: [
      "Northern Trust Bank",
      "Maple Health Systems",
      "Cascade Energy",
      "Harbor Retail Group",
      "Province of Ontario",
      "Aurora Software",
      "Lakeside Manufacturing",
      "Pulse Telecom",
      "Summit Capital",
      "Greenfield Logistics",
    ][i],
    Industry: industries[i % industries.length],
    Region: regions[i % regions.length],
    Tier: tiers[i % tiers.length],
    AccountOwner: `Account Owner ${i + 1}`,
    PaymentTermsDays: [30, 45, 30, 60, 30, 30, 45, 30, 45, 30][i],
  }));
}

type ProjectSeed = {
  id: string;
  name: string;
  status: ProjectStatus;
  phase: string;
  priority: "P1" | "P2" | "P3";
  contract: "Fixed Price" | "Time & Materials" | "Retainer";
  score: number;
  baselineStart: Date;
  baselineEnd: Date;
  forecastEnd: Date;
  ocv: number;
  targetMargin: number;
  pctComplete: number;
  /** Desired AC / Budget ratio for Active / On Hold / Completed with spend */
  burnPct?: number;
  budget?: number;
};

function buildProjectSeeds(): ProjectSeed[] {
  const seeds: ProjectSeed[] = [];

  // P-1001 Active — healthy green-ish
  seeds.push({
    id: "P-1001",
    name: "Core Banking Modernization",
    status: "Active",
    phase: "Build",
    priority: "P1",
    contract: "Fixed Price",
    score: 92,
    baselineStart: utc(2026, 0, 15),
    baselineEnd: utc(2026, 10, 30),
    forecastEnd: utc(2026, 11, 5), // slip ~5 → Green
    ocv: 1_200_000,
    targetMargin: 0.28,
    pctComplete: 0.45,
    burnPct: 0.42, // gap -0.03 → Green
    budget: 850_000,
  });

  // P-1002 Active — Cost Amber, Schedule Amber, Margin Red (spot check)
  seeds.push({
    id: "P-1002",
    name: "Claims Portal Rebuild",
    status: "Active",
    phase: "Build",
    priority: "P1",
    contract: "Fixed Price",
    score: 88,
    baselineStart: utc(2025, 10, 1),
    baselineEnd: utc(2026, 7, 21), // Aug 21
    forecastEnd: utc(2026, 8, 11), // Sep 11 → slip = 21 → Amber
    ocv: 800_000,
    targetMargin: 0.3,
    pctComplete: 0.5,
    burnPct: 0.65, // gap 0.15 → Amber
    budget: 600_000,
    // EAC=390k/0.5=780k; margin=1-780/800=0.025 → Red
  });

  // P-1003..P-1016 Active with varied health
  const activeExtras: Omit<ProjectSeed, "id" | "name">[] = [
    {
      status: "Active",
      phase: "Design",
      priority: "P2",
      contract: "Time & Materials",
      score: 75,
      baselineStart: utc(2026, 2, 1),
      baselineEnd: utc(2026, 11, 15),
      forecastEnd: utc(2026, 11, 20),
      ocv: 450_000,
      targetMargin: 0.25,
      pctComplete: 0.3,
      burnPct: 0.28,
      budget: 320_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P2",
      contract: "Fixed Price",
      score: 70,
      baselineStart: utc(2025, 9, 1),
      baselineEnd: utc(2026, 8, 1),
      forecastEnd: utc(2026, 8, 25), // slip 24 → Amber
      ocv: 620_000,
      targetMargin: 0.22,
      pctComplete: 0.55,
      burnPct: 0.68, // gap 0.13 → Amber
      budget: 480_000,
    },
    {
      status: "Active",
      phase: "Initiate",
      priority: "P3",
      contract: "Retainer",
      score: 55,
      baselineStart: utc(2026, 6, 1),
      baselineEnd: utc(2026, 11, 30),
      forecastEnd: utc(2026, 11, 30),
      ocv: 180_000,
      targetMargin: 0.35,
      pctComplete: 0.12,
      burnPct: 0.1,
      budget: 140_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P1",
      contract: "Fixed Price",
      score: 85,
      baselineStart: utc(2025, 11, 1),
      baselineEnd: utc(2026, 9, 30),
      forecastEnd: utc(2026, 9, 15),
      ocv: 950_000,
      targetMargin: 0.27,
      pctComplete: 0.6,
      burnPct: 0.55,
      budget: 700_000,
    },
    {
      status: "Active",
      phase: "Test",
      priority: "P2",
      contract: "Time & Materials",
      score: 68,
      baselineStart: utc(2026, 0, 10),
      baselineEnd: utc(2026, 8, 30),
      forecastEnd: utc(2026, 9, 20), // slip 20 → Amber
      ocv: 380_000,
      targetMargin: 0.2,
      pctComplete: 0.7,
      burnPct: 0.72,
      budget: 290_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P2",
      contract: "Fixed Price",
      score: 72,
      baselineStart: utc(2026, 1, 1),
      baselineEnd: utc(2026, 10, 1),
      forecastEnd: utc(2026, 10, 8),
      ocv: 510_000,
      targetMargin: 0.24,
      pctComplete: 0.4,
      burnPct: 0.38,
      budget: 390_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P1",
      contract: "Fixed Price",
      score: 90,
      baselineStart: utc(2025, 8, 1),
      baselineEnd: utc(2026, 6, 15),
      forecastEnd: utc(2026, 8, 30), // slip large → Red
      ocv: 1_100_000,
      targetMargin: 0.26,
      pctComplete: 0.75,
      burnPct: 0.98, // gap 0.23 → Red
      budget: 820_000,
    },
    {
      status: "Active",
      phase: "Design",
      priority: "P3",
      contract: "Time & Materials",
      score: 60,
      baselineStart: utc(2026, 4, 1),
      baselineEnd: utc(2027, 0, 31),
      forecastEnd: utc(2027, 0, 31),
      ocv: 275_000,
      targetMargin: 0.3,
      pctComplete: 0.18,
      burnPct: 0.15,
      budget: 210_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P2",
      contract: "Fixed Price",
      score: 78,
      baselineStart: utc(2026, 0, 1),
      baselineEnd: utc(2026, 9, 15),
      forecastEnd: utc(2026, 9, 28),
      ocv: 440_000,
      targetMargin: 0.23,
      pctComplete: 0.48,
      burnPct: 0.5,
      budget: 330_000,
    },
    {
      status: "Active",
      phase: "Test",
      priority: "P1",
      contract: "Fixed Price",
      score: 86,
      baselineStart: utc(2025, 7, 1),
      baselineEnd: utc(2026, 5, 30),
      forecastEnd: utc(2026, 6, 10),
      ocv: 720_000,
      targetMargin: 0.29,
      pctComplete: 0.85,
      burnPct: 0.8,
      budget: 540_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P2",
      contract: "Retainer",
      score: 65,
      baselineStart: utc(2026, 3, 1),
      baselineEnd: utc(2026, 11, 30),
      forecastEnd: utc(2026, 11, 30),
      ocv: 200_000,
      targetMargin: 0.32,
      pctComplete: 0.35,
      burnPct: 0.33,
      budget: 155_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P3",
      contract: "Time & Materials",
      score: 58,
      baselineStart: utc(2026, 2, 15),
      baselineEnd: utc(2026, 10, 15),
      forecastEnd: utc(2026, 10, 22),
      ocv: 310_000,
      targetMargin: 0.21,
      pctComplete: 0.42,
      burnPct: 0.55, // gap 0.13 → Amber
      budget: 240_000,
    },
    {
      status: "Active",
      phase: "Closeout",
      priority: "P2",
      contract: "Fixed Price",
      score: 74,
      baselineStart: utc(2025, 5, 1),
      baselineEnd: utc(2026, 7, 31),
      forecastEnd: utc(2026, 8, 5),
      ocv: 560_000,
      targetMargin: 0.25,
      pctComplete: 0.92,
      burnPct: 0.88,
      budget: 420_000,
    },
    {
      status: "Active",
      phase: "Build",
      priority: "P1",
      contract: "Fixed Price",
      score: 81,
      baselineStart: utc(2025, 11, 15),
      baselineEnd: utc(2026, 8, 20),
      forecastEnd: utc(2026, 9, 15), // slip ~25 → Amber
      ocv: 890_000,
      targetMargin: 0.27,
      pctComplete: 0.58,
      burnPct: 0.62,
      budget: 660_000,
    },
  ];

  const activeNames = [
    "Member Experience Platform",
    "Regulatory Reporting Hub",
    "Field Ops Mobile App",
    "Data Warehouse Migration",
    "Customer 360 Integration",
    "ERP Phase 2",
    "Cybersecurity Uplift",
    "Digital Onboarding",
    "Warehouse Automation",
    "Network Capacity Expansion",
    "Shared Services Portal",
    "Analytics Self-Serve",
    "Vendor Management Suite",
    "Treasury Workstation",
  ];

  activeExtras.forEach((s, i) => {
    seeds.push({
      id: `P-${1003 + i}`,
      name: activeNames[i],
      ...s,
    });
  });

  // P-1017 Active — all Red, HealthScore 0, ForecastMarginPct < 0 (spot check)
  seeds.push({
    id: "P-1017",
    name: "Legacy Decommission Program",
    status: "Active",
    phase: "Build",
    priority: "P1",
    contract: "Fixed Price",
    score: 95,
    baselineStart: utc(2025, 6, 1),
    baselineEnd: utc(2026, 7, 1), // Aug 1
    forecastEnd: utc(2026, 9, 20), // Oct 20 → slip 80 → Red
    ocv: 500_000,
    targetMargin: 0.25,
    pctComplete: 0.4,
    burnPct: 0.7, // gap 0.3 → Red
    budget: 400_000,
    // AC=280k; EAC=700k; margin=1-700/500=-0.4
  });

  // P-1018, P-1019 On Hold
  seeds.push({
    id: "P-1018",
    name: "Branch Refresh Pilot",
    status: "On Hold",
    phase: "Design",
    priority: "P3",
    contract: "Time & Materials",
    score: 40,
    baselineStart: utc(2026, 1, 1),
    baselineEnd: utc(2026, 8, 30),
    forecastEnd: utc(2026, 10, 15),
    ocv: 150_000,
    targetMargin: 0.2,
    pctComplete: 0.22,
    burnPct: 0.25,
    budget: 110_000,
  });
  seeds.push({
    id: "P-1019",
    name: "Partner API Gateway",
    status: "On Hold",
    phase: "Build",
    priority: "P2",
    contract: "Fixed Price",
    score: 50,
    baselineStart: utc(2025, 10, 1),
    baselineEnd: utc(2026, 6, 1),
    forecastEnd: utc(2026, 7, 15),
    ocv: 290_000,
    targetMargin: 0.22,
    pctComplete: 0.35,
    burnPct: 0.4,
    budget: 210_000,
  });

  // P-1020, P-1021 Completed
  seeds.push({
    id: "P-1020",
    name: "HRIS Cutover",
    status: "Completed",
    phase: "Closeout",
    priority: "P2",
    contract: "Fixed Price",
    score: 70,
    baselineStart: utc(2025, 3, 1),
    baselineEnd: utc(2026, 2, 30),
    forecastEnd: utc(2026, 3, 10),
    ocv: 340_000,
    targetMargin: 0.25,
    pctComplete: 1,
    burnPct: 0.92,
    budget: 260_000,
  });
  seeds.push({
    id: "P-1021",
    name: "Intranet Relaunch",
    status: "Completed",
    phase: "Closeout",
    priority: "P3",
    contract: "Time & Materials",
    score: 55,
    baselineStart: utc(2025, 5, 1),
    baselineEnd: utc(2026, 1, 28),
    forecastEnd: utc(2026, 1, 28),
    ocv: 120_000,
    targetMargin: 0.3,
    pctComplete: 1,
    burnPct: 0.85,
    budget: 95_000,
  });

  // P-1022..P-1024 Planned
  for (let i = 0; i < 3; i++) {
    seeds.push({
      id: `P-${1022 + i}`,
      name: ["Cloud Landing Zone", "AI Assist Pilot", "Sustainability Dashboard"][i],
      status: "Planned",
      phase: "Initiate",
      priority: (["P2", "P3", "P2"] as const)[i],
      contract: (["Fixed Price", "Time & Materials", "Retainer"] as const)[i],
      score: [80, 65, 70][i],
      baselineStart: utc(2026, 9, 1),
      baselineEnd: utc(2027, 5, 30),
      forecastEnd: utc(2027, 5, 30),
      ocv: [400_000, 180_000, 250_000][i],
      targetMargin: [0.28, 0.3, 0.26][i],
      pctComplete: 0,
      burnPct: 0,
      budget: [300_000, 140_000, 190_000][i],
    });
  }

  if (seeds.length !== 24) {
    throw new Error(`Expected 24 projects, got ${seeds.length}`);
  }
  return seeds;
}

function buildProjects(seeds: ProjectSeed[], clients: Client[]): Project[] {
  return seeds.map((s, i) => ({
    ProjectID: s.id,
    ProjectName: s.name,
    ClientID: clients[i % clients.length].ClientID,
    Portfolio: ["Digital", "Infrastructure", "Data", "Security"][i % 4],
    BusinessUnit: ["Consulting", "Delivery", "Advisory"][i % 3],
    ProjectManagerID: `E-${2001 + (i % 8)}`,
    ExecutiveSponsor: i % 5 === 0 ? null : `Sponsor ${((i % 6) + 1)}`,
    Status: s.status,
    Phase: s.phase,
    Priority: s.priority,
    ContractType: s.contract,
    StrategicScore: s.score,
    BaselineStart: s.baselineStart,
    BaselineEnd: s.baselineEnd,
    ForecastEnd: s.forecastEnd,
    OriginalContractValue: s.ocv,
    TargetMarginPct: s.targetMargin,
    PctComplete: s.pctComplete,
    LastStatusUpdate: s.status === "Planned" ? null : daysAgo(3 + (i % 10)),
  }));
}

function buildResources(): Resource[] {
  const roles = [
    "Project Manager",
    "Tech Lead",
    "Senior Developer",
    "Developer",
    "Business Analyst",
    "QA Engineer",
    "Architect",
    "Designer",
    "Data Engineer",
    "Scrum Master",
  ];
  const depts = ["Delivery", "Engineering", "Advisory", "PMO"];
  const levels = ["Junior", "Mid", "Senior", "Principal"];
  const locations = ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa"];
  const skills = [
    "Java",
    "React",
    "Python",
    "Azure",
    "AWS",
    "SAP",
    "Salesforce",
    "Data",
    "Security",
    "UX",
  ];

  const resources: Resource[] = [];
  for (let i = 0; i < 40; i++) {
    const id = `E-${2001 + i}`;
    resources.push({
      EmployeeID: id,
      FullName: `Employee ${2001 + i}`,
      Role: roles[i % roles.length],
      Department: depts[i % depts.length],
      Level: levels[i % levels.length],
      Location: locations[i % locations.length],
      EmploymentType: i === 39 ? "Contractor" : "FTE",
      CostRateHr: 60 + (i % 10) * 15,
      BillRateHr: 120 + (i % 10) * 25,
      WeeklyCapacityHrs: i === 38 ? 0 : 40, // one non-assignable
      ManagerID: i < 5 ? null : `E-${2001 + (i % 5)}`,
      PrimarySkill: skills[i % skills.length],
      StartDate: utc(2020 + (i % 5), i % 12, 1 + (i % 20)),
    });
  }
  return resources;
}

/**
 * Allocations active on AsOfDate:
 * - 6 overallocated (>1.0): stack 1.2
 * - 23 under-utilized (<0.5): allocate 0.3 (or 0 for some)
 * - remaining healthy (0.5..1.0), excluding non-assignable E-2039
 */
function buildAllocations(
  projects: Project[],
  resources: Resource[],
): Allocation[] {
  const allocations: Allocation[] = [];
  let allocSeq = 1;
  const activeProjects = projects.filter((p) => p.Status === "Active");
  const start = utc(2026, 0, 1);
  const endSafe = utc(2026, 11, 30);

  const overIds = resources.slice(0, 6).map((r) => r.EmployeeID); // E-2001..E-2006
  const underIds = resources.slice(6, 29).map((r) => r.EmployeeID); // 23 people E-2007..E-2029
  const healthyIds = resources
    .slice(29, 38)
    .map((r) => r.EmployeeID); // E-2030..E-2038 → 9 healthy
  // E-2039 capacity 0 → Non-assignable; E-2040 unused for util → under if we give <0.5

  // Fix counts: 6 over + 23 under + 9 healthy + 1 non-assignable + 1 more
  // resources[39] = E-2040 — put in under by giving 0 alloc, but then under becomes 24.
  // Give E-2040 healthy 0.8 allocation.

  const add = (
    employeeId: string,
    projectId: string,
    pct: number,
    role: string,
  ) => {
    allocations.push({
      AllocationID: `A-${String(allocSeq++).padStart(4, "0")}`,
      ProjectID: projectId,
      EmployeeID: employeeId,
      ProjectRole: role,
      Billable: "Yes",
      StartDate: start,
      EndDate: endSafe,
      AllocationPct: pct,
    });
  };

  // Overallocated: 0.7 + 0.5 = 1.2 on two projects
  overIds.forEach((eid, i) => {
    const p1 = activeProjects[i % activeProjects.length];
    const p2 = activeProjects[(i + 3) % activeProjects.length];
    add(eid, p1.ProjectID, 0.7, "Lead");
    add(eid, p2.ProjectID, 0.5, "Contributor");
  });

  // Under-utilized: 0.3 on one project (or 0 for first 5 → still under)
  underIds.forEach((eid, i) => {
    if (i < 5) {
      // no allocation → 0 < 0.5
      return;
    }
    const p = activeProjects[i % activeProjects.length];
    add(eid, p.ProjectID, 0.3, "Contributor");
  });

  // Healthy: 0.8
  [...healthyIds, "E-2040"].forEach((eid, i) => {
    const p = activeProjects[i % activeProjects.length];
    add(eid, p.ProjectID, 0.8, "Contributor");
  });

  // Some historical / future allocations (don't affect current util)
  for (let i = 0; i < 8; i++) {
    add(
      resources[i + 10].EmployeeID,
      activeProjects[i % activeProjects.length].ProjectID,
      0.5,
      "Surge",
    );
    // Override dates for these last ones
    const a = allocations[allocations.length - 1];
    a.StartDate = utc(2025, 0, 1);
    a.EndDate = utc(2025, 11, 30);
  }

  return allocations;
}

function buildBudget(seeds: ProjectSeed[]): BudgetLine[] {
  const lines: BudgetLine[] = [];
  let seq = 1;
  const categories = ["Labor", "Travel", "Software", "Contingency"];
  for (const s of seeds) {
    const total = s.budget ?? 0;
    if (total <= 0 && s.status === "Planned") {
      // still give a planned budget
      const planned = s.budget ?? 100_000;
      const labor = Math.round(planned * 0.7);
      const travel = Math.round(planned * 0.1);
      const software = Math.round(planned * 0.1);
      const contingency = planned - labor - travel - software;
      for (const [cat, amt] of [
        ["Labor", labor],
        ["Travel", travel],
        ["Software", software],
        ["Contingency", contingency],
      ] as const) {
        lines.push({
          BudgetLineID: `B-${String(seq++).padStart(4, "0")}`,
          ProjectID: s.id,
          CostCategory: cat,
          BudgetAmount: amt,
          ApprovedDate: daysAgo(60),
          ApprovedBy: "Finance",
          Notes: null,
        });
      }
      continue;
    }
    const labor = Math.round(total * 0.7);
    const travel = Math.round(total * 0.08);
    const software = Math.round(total * 0.12);
    const contingency = total - labor - travel - software;
    const amounts = [labor, travel, software, contingency];
    categories.forEach((cat, i) => {
      lines.push({
        BudgetLineID: `B-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        CostCategory: cat,
        BudgetAmount: amounts[i],
        ApprovedDate: s.status === "Planned" ? null : daysAgo(90),
        ApprovedBy: s.status === "Planned" ? null : "PMO Finance",
        Notes: cat === "Contingency" ? "Management reserve" : null,
      });
    });
  }
  return lines;
}

function buildActuals(seeds: ProjectSeed[], resources: Resource[]): Actual[] {
  const actuals: Actual[] = [];
  let seq = 1;
  for (const s of seeds) {
    if (s.status === "Planned") continue;
    const budget = s.budget ?? 0;
    const burn = s.burnPct ?? 0;
    const targetAC = Math.round(budget * burn);
    if (targetAC <= 0) continue;

    // Split across a few periods / categories
    const laborShare = Math.round(targetAC * 0.75);
    const otherShare = targetAC - laborShare;
    const periods = [
      utc(2026, 5, 1),
      utc(2026, 6, 1),
      utc(2026, 7, 1),
      utc(2026, 8, 1),
    ];
    const laborChunks = [0.2, 0.25, 0.3, 0.25].map((p) =>
      Math.round(laborShare * p),
    );
    // Fix rounding on last chunk
    laborChunks[3] = laborShare - laborChunks[0] - laborChunks[1] - laborChunks[2];

    laborChunks.forEach((amt, i) => {
      if (amt === 0) return;
      const emp = resources[(seq + i) % resources.length];
      const hours = Math.round(amt / emp.CostRateHr);
      actuals.push({
        ActualID: `AC-${String(seq++).padStart(4, "0")}`,
        Period: periods[i],
        ProjectID: s.id,
        CostCategory: "Labor",
        EmployeeID: emp.EmployeeID,
        Vendor: null,
        Source: "Timesheet",
        Hours: hours,
        Billable: "Yes",
        Amount: amt,
      });
    });

    if (otherShare > 0) {
      actuals.push({
        ActualID: `AC-${String(seq++).padStart(4, "0")}`,
        Period: utc(2026, 7, 15),
        ProjectID: s.id,
        CostCategory: "Software",
        EmployeeID: null,
        Vendor: "Vendor Co",
        Source: "AP",
        Hours: null,
        Billable: null,
        Amount: otherShare,
      });
    }
  }
  return actuals;
}

function buildEstimates(seeds: ProjectSeed[], resources: Resource[]): Estimate[] {
  const estimates: Estimate[] = [];
  let seq = 1;
  for (const s of seeds) {
    const versions = s.status === "Planned" ? ["v0.1"] : ["v1.0", "v1.1"];
    versions.forEach((ver, vi) => {
      for (let w = 0; w < 2; w++) {
        estimates.push({
          EstimateLineID: `EL-${String(seq++).padStart(4, "0")}`,
          ProjectID: s.id,
          EstimateVersion: ver,
          IsCurrent: vi === versions.length - 1 ? "Yes" : "No",
          WBSCode: `${s.id.slice(2)}.${w + 1}`,
          Phase: s.phase,
          Workstream: ["Delivery", "Integration"][w],
          EstimatedHours: 200 + ((seq * 17) % 800),
          BlendedCostRate: 95 + (seq % 40),
          Confidence: (["High", "Medium", "Low"] as const)[w % 3],
          EstimatedByID: resources[seq % resources.length].EmployeeID,
          EstimateDate: daysAgo(30 + vi * 20),
        });
      }
    });
  }
  return estimates;
}

function buildMilestones(seeds: ProjectSeed[]): Milestone[] {
  const milestones: Milestone[] = [];
  let seq = 1;
  let overdueCount = 0;

  for (const s of seeds) {
    if (s.status === "Planned") {
      milestones.push({
        MilestoneID: `M-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        MilestoneName: "Kickoff",
        Phase: "Initiate",
        BaselineDate: s.baselineStart,
        ForecastDate: s.baselineStart,
        ActualDate: null,
        IsBillingMilestone: "No",
        BillingPct: null,
      });
      continue;
    }

    // Completed milestone
    milestones.push({
      MilestoneID: `M-${String(seq++).padStart(4, "0")}`,
      ProjectID: s.id,
      MilestoneName: "Discovery Complete",
      Phase: "Design",
      BaselineDate: daysAgo(120),
      ForecastDate: daysAgo(110),
      ActualDate: daysAgo(108),
      IsBillingMilestone: "Yes",
      BillingPct: 0.2,
    });

    // Next open milestone — some overdue
    const makeOverdue = overdueCount < 4 && s.status === "Active";
    if (makeOverdue) {
      overdueCount += 1;
      milestones.push({
        MilestoneID: `M-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        MilestoneName: "Phase Gate",
        Phase: s.phase,
        BaselineDate: daysAgo(40),
        ForecastDate: daysAgo(10 + overdueCount), // before AsOf → Overdue
        ActualDate: null,
        IsBillingMilestone: "Yes",
        BillingPct: 0.25,
      });
    } else {
      milestones.push({
        MilestoneID: `M-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        MilestoneName: "Delivery Gate",
        Phase: s.phase,
        BaselineDate: daysFrom(20),
        ForecastDate: daysFrom(25),
        ActualDate: null,
        IsBillingMilestone: "Yes",
        BillingPct: 0.3,
      });
    }
  }

  if (overdueCount !== 4) {
    throw new Error(`Expected 4 overdue milestones, crafted ${overdueCount}`);
  }
  return milestones;
}

function buildInvoices(
  seeds: ProjectSeed[],
  milestones: Milestone[],
): Invoice[] {
  const invoices: Invoice[] = [];
  let seq = 1;
  for (const s of seeds) {
    if (s.status === "Planned") continue;
    const ms = milestones.filter(
      (m) => m.ProjectID === s.id && m.IsBillingMilestone === "Yes",
    );
    const m = ms[0];
    invoices.push({
      InvoiceID: `INV-${String(seq++).padStart(4, "0")}`,
      ProjectID: s.id,
      MilestoneID: m?.MilestoneID ?? null,
      InvoiceDate: daysAgo(45),
      Description: `${s.name} — progress billing`,
      Amount: Math.round(s.ocv * 0.15),
      PaidDate: s.status === "Completed" ? daysAgo(20) : daysAgo(30),
    });
    if (s.status === "Active" && seq % 3 === 0) {
      invoices.push({
        InvoiceID: `INV-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        MilestoneID: null,
        InvoiceDate: daysAgo(10),
        Description: `${s.name} — WIP invoice`,
        Amount: Math.round(s.ocv * 0.08),
        PaidDate: null, // outstanding / maybe overdue depending on terms
      });
    }
    if (s.id === "P-1002" || s.id === "P-1010") {
      invoices.push({
        InvoiceID: `INV-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        MilestoneID: null,
        InvoiceDate: daysAgo(90),
        Description: `${s.name} — overdue AR`,
        Amount: Math.round(s.ocv * 0.05),
        PaidDate: null,
      });
    }
  }
  return invoices;
}

function buildRaid(seeds: ProjectSeed[], resources: Resource[]): RaidItem[] {
  const raid: RaidItem[] = [];
  let seq = 1;
  const openCriticalTargets = 6;
  let criticalOpen = 0;

  for (const s of seeds) {
    if (s.status === "Planned") continue;

    // Critical open risks on early active projects
    if (criticalOpen < openCriticalTargets && s.status === "Active") {
      criticalOpen += 1;
      raid.push({
        RAIDID: `R-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        Type: "Risk",
        Category: "Delivery",
        Title: `Critical risk ${criticalOpen} on ${s.id}`,
        Probability: 5,
        Impact: 5, // score 25 >= 20
        CostExposure: 50_000 + criticalOpen * 10_000,
        OwnerID: resources[seq % resources.length].EmployeeID,
        Status: criticalOpen % 2 === 0 ? "Mitigating" : "Open",
        RaisedDate: daysAgo(40),
        TargetDate: daysFrom(30),
        Mitigation: "Escalate to steering committee",
      });
    }

    // Other RAID items
    raid.push({
      RAIDID: `R-${String(seq++).padStart(4, "0")}`,
      ProjectID: s.id,
      Type: "Issue",
      Category: "Scope",
      Title: `Open issue on ${s.id}`,
      Probability: 3,
      Impact: 3,
      CostExposure: 15_000,
      OwnerID: resources[seq % resources.length].EmployeeID,
      Status: "Open",
      RaisedDate: daysAgo(20),
      TargetDate: daysFrom(14),
      Mitigation: null,
    });

    raid.push({
      RAIDID: `R-${String(seq++).padStart(4, "0")}`,
      ProjectID: s.id,
      Type: "Risk",
      Category: "Technical",
      Title: `Medium risk on ${s.id}`,
      Probability: 3,
      Impact: 3, // 9 → Medium
      CostExposure: 20_000,
      OwnerID: resources[seq % resources.length].EmployeeID,
      Status: seq % 4 === 0 ? "Closed" : "Open",
      RaisedDate: daysAgo(60),
      TargetDate: daysAgo(10),
      Mitigation: "Monitor",
    });
  }

  if (criticalOpen !== 6) {
    throw new Error(`Expected 6 critical risks, crafted ${criticalOpen}`);
  }
  return raid;
}

function buildChangeRequests(
  seeds: ProjectSeed[],
  resources: Resource[],
): ChangeRequest[] {
  const crs: ChangeRequest[] = [];
  let seq = 1;
  let pending = 0;

  for (const s of seeds) {
    if (s.status === "Planned") continue;

    // One approved CR on some projects (affects CCV / budget)
    if (s.status === "Active" && ["P-1001", "P-1006", "P-1011"].includes(s.id)) {
      crs.push({
        CRID: `CR-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        Title: `Approved scope add for ${s.id}`,
        CRType: "Scope",
        RaisedDate: daysAgo(50),
        RaisedByID: resources[0].EmployeeID,
        Status: "Approved",
        RevenueImpact: 40_000,
        CostImpact: 25_000,
        ScheduleImpactDays: 10,
        DecisionDate: daysAgo(30),
        DecisionBy: "Sponsor",
      });
    }

    if (pending < 8 && s.status === "Active") {
      pending += 1;
      crs.push({
        CRID: `CR-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        Title: `Pending CR ${pending} for ${s.id}`,
        CRType: pending % 2 === 0 ? "Schedule" : "Cost",
        RaisedDate: daysAgo(12),
        RaisedByID: resources[pending % resources.length].EmployeeID,
        Status: pending % 2 === 0 ? "Submitted" : "Draft",
        RevenueImpact: 10_000 * pending,
        CostImpact: 8_000 * pending,
        ScheduleImpactDays: 5,
        DecisionDate: null,
        DecisionBy: null,
      });
    }

    if (s.id === "P-1020") {
      crs.push({
        CRID: `CR-${String(seq++).padStart(4, "0")}`,
        ProjectID: s.id,
        Title: "Rejected late change",
        CRType: "Scope",
        RaisedDate: daysAgo(80),
        RaisedByID: resources[2].EmployeeID,
        Status: "Rejected",
        RevenueImpact: 0,
        CostImpact: 12_000,
        ScheduleImpactDays: 0,
        DecisionDate: daysAgo(70),
        DecisionBy: "PMO",
      });
    }
  }

  if (pending !== 8) {
    throw new Error(`Expected 8 pending CRs, crafted ${pending}`);
  }
  return crs;
}

function buildSnapshots(
  projects: Project[],
  metrics: ProjectMetrics[],
): Snapshot[] {
  const byId = new Map(metrics.map((m) => [m.ProjectID, m]));
  const snapshots: Snapshot[] = [];
  for (const p of projects) {
    if (p.Status === "Planned") continue;
    const m = byId.get(p.ProjectID)!;
    const earlierPct = Math.max(0, p.PctComplete - 0.1);
    snapshots.push({
      SnapshotDate: daysAgo(30),
      ProjectID: p.ProjectID,
      Status: p.Status,
      PctComplete: earlierPct,
      ActualCostToDate: Math.round(m.ActualCost * 0.75),
      CurrentBudget: m.CurrentBudget,
      EAC: m.EAC,
      ForecastMarginPct: m.ForecastMarginPct,
      ScheduleSlipDays: Math.max(0, m.ScheduleSlipDays - 5),
      CostRAG: m.CostRAG,
      ScheduleRAG: m.ScheduleRAG,
      MarginRAG: m.MarginRAG,
      OverallRAG: m.OverallRAG,
    });
    snapshots.push({
      SnapshotDate: daysAgo(7),
      ProjectID: p.ProjectID,
      Status: p.Status,
      PctComplete: p.PctComplete,
      ActualCostToDate: m.ActualCost,
      CurrentBudget: m.CurrentBudget,
      EAC: m.EAC,
      ForecastMarginPct: m.ForecastMarginPct,
      ScheduleSlipDays: m.ScheduleSlipDays,
      CostRAG: m.CostRAG,
      ScheduleRAG: m.ScheduleRAG,
      MarginRAG: m.MarginRAG,
      OverallRAG: m.OverallRAG,
    });
  }
  return snapshots;
}

function sheetFromObjects(
  rows: Record<string, unknown>[],
  headers: readonly string[],
): XLSX.WorkSheet {
  const data = [
    [...headers],
    ...rows.map((r) => headers.map((h) => (r[h] === undefined ? null : r[h]))),
  ];
  return XLSX.utils.aoa_to_sheet(data, { cellDates: true });
}

function buildDataDictionary(): { Field: string; Table: string; Description: string }[] {
  const rows: { Field: string; Table: string; Description: string }[] = [];
  for (const [table, headers] of Object.entries(TABLE_HEADERS)) {
    for (const h of headers) {
      rows.push({
        Field: h,
        Table: table,
        Description: `${table}.${h}`,
      });
    }
  }
  return rows;
}

function buildDataset(): Dataset {
  const settings = buildSettings();
  const clients = buildClients();
  const seeds = buildProjectSeeds();
  const projects = buildProjects(seeds, clients);
  const resources = buildResources();
  const allocations = buildAllocations(projects, resources);
  const budget = buildBudget(seeds);
  const actuals = buildActuals(seeds, resources);
  const estimates = buildEstimates(seeds, resources);
  const milestones = buildMilestones(seeds);
  const invoices = buildInvoices(seeds, milestones);
  const raid = buildRaid(seeds, resources);
  const changeRequests = buildChangeRequests(seeds, resources);

  // Snapshots filled after metrics
  return {
    projects,
    resources,
    allocations,
    estimates,
    budget,
    actuals,
    milestones,
    invoices,
    raid,
    changeRequests,
    snapshots: [],
    clients,
    settings,
  };
}

function main() {
  const dataset = buildDataset();
  const projectMetrics = computeAllProjectMetrics(dataset, AS_OF);
  const resourceMetrics = computeAllResourceMetrics(dataset, AS_OF);
  const kpis = computePortfolioKPIs(dataset, AS_OF, projectMetrics);

  dataset.snapshots = buildSnapshots(dataset.projects, projectMetrics);

  // --- Spot checks ---
  const p1017 = projectMetrics.find((m) => m.ProjectID === "P-1017")!;
  const p1002 = projectMetrics.find((m) => m.ProjectID === "P-1002")!;

  console.log("=== Portfolio KPIs ===");
  console.log(
    JSON.stringify(
      {
        activeProjects: kpis.activeProjects,
        offTrack: kpis.offTrack,
        watch: kpis.watch,
        onTrack: kpis.onTrack,
        overallocated: kpis.overallocated,
        underUtilized: kpis.underUtilized,
        openCriticalRisks: kpis.openCriticalRisks,
        pendingChangeRequests: kpis.pendingChangeRequests,
        overdueMilestones: kpis.overdueMilestones,
        averageHealthScore: kpis.averageHealthScore,
        forecastMarginPct: kpis.forecastMarginPct,
      },
      null,
      2,
    ),
  );

  console.log("=== Spot check P-1017 ===");
  console.log({
    CostRAG: p1017.CostRAG,
    ScheduleRAG: p1017.ScheduleRAG,
    MarginRAG: p1017.MarginRAG,
    OverallRAG: p1017.OverallRAG,
    HealthScore: p1017.HealthScore,
    ForecastMarginPct: p1017.ForecastMarginPct,
    BudgetBurnPct: p1017.BudgetBurnPct,
    PctComplete: dataset.projects.find((p) => p.ProjectID === "P-1017")!.PctComplete,
    ScheduleSlipDays: p1017.ScheduleSlipDays,
  });

  console.log("=== Spot check P-1002 ===");
  console.log({
    CostRAG: p1002.CostRAG,
    ScheduleRAG: p1002.ScheduleRAG,
    MarginRAG: p1002.MarginRAG,
    OverallRAG: p1002.OverallRAG,
    ForecastMarginPct: p1002.ForecastMarginPct,
    BudgetBurnPct: p1002.BudgetBurnPct,
    ScheduleSlipDays: p1002.ScheduleSlipDays,
  });

  const utilCounts = {
    Overallocated: resourceMetrics.filter((r) => r.UtilizationStatus === "Overallocated")
      .length,
    "Under-utilized": resourceMetrics.filter(
      (r) => r.UtilizationStatus === "Under-utilized",
    ).length,
    Healthy: resourceMetrics.filter((r) => r.UtilizationStatus === "Healthy").length,
    "Non-assignable": resourceMetrics.filter(
      (r) => r.UtilizationStatus === "Non-assignable",
    ).length,
  };
  console.log("=== Utilization ===", utilCounts);

  // Assertions for generator self-check
  const failures: string[] = [];
  if (p1017.CostRAG !== "Red") failures.push("P-1017 CostRAG");
  if (p1017.ScheduleRAG !== "Red") failures.push("P-1017 ScheduleRAG");
  if (p1017.MarginRAG !== "Red") failures.push("P-1017 MarginRAG");
  if (p1017.OverallRAG !== "Red") failures.push("P-1017 OverallRAG");
  if (p1017.HealthScore !== 0) failures.push(`P-1017 HealthScore=${p1017.HealthScore}`);
  if (!(p1017.ForecastMarginPct < 0)) failures.push("P-1017 ForecastMarginPct < 0");
  if (p1002.CostRAG !== "Amber") failures.push("P-1002 CostRAG");
  if (p1002.ScheduleRAG !== "Amber") failures.push("P-1002 ScheduleRAG");
  if (p1002.MarginRAG !== "Red") failures.push("P-1002 MarginRAG");
  if (kpis.activeProjects !== 17) failures.push(`active=${kpis.activeProjects}`);
  if (kpis.overallocated !== 6) failures.push(`overallocated=${kpis.overallocated}`);
  if (kpis.underUtilized !== 23) failures.push(`underUtilized=${kpis.underUtilized}`);
  if (kpis.pendingChangeRequests !== 8)
    failures.push(`pendingCR=${kpis.pendingChangeRequests}`);
  if (kpis.openCriticalRisks !== 6)
    failures.push(`criticalRisks=${kpis.openCriticalRisks}`);
  if (kpis.overdueMilestones !== 4)
    failures.push(`overdueMS=${kpis.overdueMilestones}`);

  // --- Build workbook ---
  const wb = XLSX.utils.book_new();
  const metricsById = new Map(projectMetrics.map((m) => [m.ProjectID, m]));
  const resourceById = new Map(resourceMetrics.map((m) => [m.EmployeeID, m]));

  // Projects + calculated
  const projectCalcHeaders = [
    "ApprovedCRRevenue",
    "ApprovedCRCost",
    "CurrentContractValue",
    "BaselineBudget",
    "CurrentBudget",
    "ActualCost",
    "EAC",
    "BudgetBurnPct",
    "ForecastMarginPct",
    "ScheduleSlipDays",
    "CostRAG",
    "ScheduleRAG",
    "MarginRAG",
    "OverallRAG",
    "HealthScore",
  ];
  const projectRows = dataset.projects.map((p) => {
    const m = metricsById.get(p.ProjectID)!;
    return { ...p, ...Object.fromEntries(projectCalcHeaders.map((h) => [h, (m as never)[h]])) };
  });
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      projectRows as unknown as Record<string, unknown>[],
      [...TABLE_HEADERS.Projects, ...projectCalcHeaders],
    ),
    "Projects",
  );

  // Resources + calculated
  const resourceCalc = [
    "CurrentAllocationPct",
    "AvailableHrsPerWeek",
    "UtilizationStatus",
    "HoursLoggedYTD",
    "BillableHoursYTD",
  ];
  const resourceRows = dataset.resources.map((r) => {
    const m = resourceById.get(r.EmployeeID)!;
    return { ...r, ...m };
  });
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      resourceRows as unknown as Record<string, unknown>[],
      [...TABLE_HEADERS.Resources, ...resourceCalc],
    ),
    "Resources",
  );

  // Allocations + calculated
  const allocRows = dataset.allocations.map((a) => {
    const res = dataset.resources.find((r) => r.EmployeeID === a.EmployeeID);
    const m = computeAllocationMetrics(a, res);
    return { ...a, ...m };
  });
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(allocRows as unknown as Record<string, unknown>[], [
      ...TABLE_HEADERS.Allocations,
      "PlannedHours",
      "PlannedCost",
    ]),
    "Allocations",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      dataset.estimates as unknown as Record<string, unknown>[],
      TABLE_HEADERS.Estimates,
    ),
    "Estimates",
  );

  const budgetRows = dataset.budget.map((b) => ({
    ...b,
    ...computeBudgetLineMetrics(b, dataset),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(budgetRows as unknown as Record<string, unknown>[], [
      ...TABLE_HEADERS.Budget,
      "ActualToDate",
      "BurnPct",
      "LineStatus",
    ]),
    "Budget",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      dataset.actuals as unknown as Record<string, unknown>[],
      TABLE_HEADERS.Actuals,
    ),
    "Actuals",
  );

  const milestoneRows = dataset.milestones.map((m) => ({
    ...m,
    MilestoneStatus: computeMilestoneStatus(m, dataset, AS_OF),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(milestoneRows as unknown as Record<string, unknown>[], [
      ...TABLE_HEADERS.Milestones,
      "MilestoneStatus",
    ]),
    "Milestones",
  );

  const invoiceRows = dataset.invoices.map((inv) => ({
    ...inv,
    ...computeInvoiceMetrics(inv, dataset, AS_OF),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(invoiceRows as unknown as Record<string, unknown>[], [
      ...TABLE_HEADERS.Invoices,
      "DueDate",
      "Status",
      "DaysOverdue",
      "AgingBucket",
    ]),
    "Invoices",
  );

  const raidRows = dataset.raid.map((r) => ({
    ...r,
    ...computeRaidMetrics(r, dataset),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(raidRows as unknown as Record<string, unknown>[], [
      ...TABLE_HEADERS.RAID,
      "RiskScore",
      "Severity",
      "ExpectedExposure",
    ]),
    "RAID",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      dataset.changeRequests as unknown as Record<string, unknown>[],
      TABLE_HEADERS.ChangeRequests,
    ),
    "ChangeRequests",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      dataset.snapshots as unknown as Record<string, unknown>[],
      TABLE_HEADERS.Snapshots,
    ),
    "Snapshots",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(
      dataset.clients as unknown as Record<string, unknown>[],
      TABLE_HEADERS.Clients,
    ),
    "Clients",
  );

  // Settings key-value
  const settingRows = Object.entries(dataset.settings).map(([Setting, Value]) => ({
    Setting,
    Value,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(settingRows, TABLE_HEADERS.Settings),
    "Settings",
  );

  // Summary oracle from KPIs
  const summaryRows = Object.entries(kpis).map(([KPI, Value]) => ({ KPI, Value }));
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(summaryRows, ["KPI", "Value"]),
    "Summary",
  );

  // DataDictionary
  const dict = buildDataDictionary();
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromObjects(dict as unknown as Record<string, unknown>[], [
      "Field",
      "Table",
      "Description",
    ]),
    "DataDictionary",
  );

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  XLSX.writeFile(wb, OUT_PATH, { cellDates: true, bookType: "xlsx" });
  console.log(`Wrote ${OUT_PATH}`);

  if (failures.length) {
    console.error("SELF-CHECK FAILURES:", failures);
    process.exit(1);
  }
  console.log("Self-check OK");
}

main();
