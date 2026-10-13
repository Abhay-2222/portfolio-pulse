import { getDb } from "@/lib/pmo/db";
import type {
  Baseline,
  BriefingPayload,
  DataLoad,
  HealthCheck,
  Lifecycle,
  ListProjectsQuery,
  Me,
  Milestone,
  PersonLoad,
  PortfolioPayload,
  ProgramMoney,
  ProjectDetail,
  ProjectMoney,
  ProjectSummary,
  Rag,
  RagCounts,
  RaidItem,
  StatusPayload,
  WeekHealth,
} from "@/lib/pmo/types";

function str(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rag(v: unknown): Rag | null {
  return v === "Green" || v === "Amber" || v === "Red" ? v : null;
}

function ragRank(v: Rag | null): number {
  if (v === "Green") return 1;
  if (v === "Amber") return 2;
  if (v === "Red") return 3;
  return 0;
}

function asOf(): string {
  const row = getDb().prepare("SELECT as_of_date FROM vw_settings").get();
  return str(row?.as_of_date) ?? "2026-10-09";
}

export function latestAsOf(): string {
  const row = getDb()
    .prepare(
      "SELECT data_as_of FROM data_loads WHERE status = 'Succeeded' ORDER BY started_at DESC LIMIT 1",
    )
    .get();
  return str(row?.data_as_of) ?? asOf();
}

export function loadFailed(): boolean {
  const row = getDb()
    .prepare(
      "SELECT status FROM data_loads ORDER BY started_at DESC LIMIT 1",
    )
    .get();
  return str(row?.status) === "Failed";
}

const SUMMARY_SQL = `
SELECT
  s.project_code, s.project_name, p.program_id, s.program_name, s.project_manager,
  s.lifecycle_status, s.phase, s.priority, s.reported_rag, s.calculated_rag,
  s.health_check, s.weeks_reported_better, s.health_reason, s.data_gaps, s.trend,
  s.is_stale, s.days_since_update, p.pm_id, p.forecast_finish, s.baseline_version,
  s.portfolio_name,
  CASE WHEN cur.calculated_rag IS NOT NULL AND prev.calculated_rag IS NOT NULL
        AND CASE cur.calculated_rag WHEN 'Green' THEN 1 WHEN 'Amber' THEN 2 WHEN 'Red' THEN 3 ELSE 0 END
          > CASE prev.calculated_rag WHEN 'Green' THEN 1 WHEN 'Amber' THEN 2 WHEN 'Red' THEN 3 ELSE 0 END
       THEN 1 ELSE 0 END AS new_this_week
FROM vw_project_summary s
JOIN projects p ON p.project_code = s.project_code
JOIN vw_user_projects u ON u.project_code = s.project_code AND u.user_id = ?
LEFT JOIN health_snapshots cur
  ON cur.project_code = s.project_code
 AND cur.week_ending = (SELECT MAX(week_ending) FROM health_snapshots)
LEFT JOIN health_snapshots prev
  ON prev.project_code = s.project_code
 AND prev.week_ending = (
   SELECT MAX(week_ending) FROM health_snapshots h
   WHERE h.week_ending < (SELECT MAX(week_ending) FROM health_snapshots)
 )
`;

function toSummary(row: Record<string, unknown>): ProjectSummary {
  const healthCheck = str(row.health_check) as HealthCheck | null;
  return {
    code: String(row.project_code),
    name: String(row.project_name),
    programId: String(row.program_id),
    programName: String(row.program_name),
    projectManager: str(row.project_manager),
    lifecycle: String(row.lifecycle_status) as Lifecycle,
    phase: (str(row.phase) as ProjectSummary["phase"]) ?? null,
    priority: (str(row.priority) as ProjectSummary["priority"]) ?? null,
    reportedRag: rag(row.reported_rag),
    calculatedRag: rag(row.calculated_rag),
    healthCheck,
    weeksReportedBetter: num(row.weeks_reported_better) ?? 0,
    healthReason: str(row.health_reason),
    dataGaps: str(row.data_gaps),
    trend: (str(row.trend) as ProjectSummary["trend"]) ?? null,
    isStale: Number(row.is_stale) === 1,
    daysSinceUpdate: num(row.days_since_update),
    newThisWeek: Number(row.new_this_week) === 1,
  };
}

function live(row: ProjectSummary): boolean {
  return row.lifecycle === "Active" || row.lifecycle === "On Hold";
}

function counts(rows: ProjectSummary[]): RagCounts {
  const set = rows.filter(live);
  return {
    green: set.filter((r) => r.calculatedRag === "Green").length,
    amber: set.filter((r) => r.calculatedRag === "Amber").length,
    red: set.filter((r) => r.calculatedRag === "Red").length,
    live: set.length,
    stale: set.filter((r) => r.isStale).length,
    reportedBetterThanData: set.filter(
      (r) => r.healthCheck === "Reported better than data",
    ).length,
    noStatusReported: set.filter(
      (r) => r.healthCheck === "No status reported",
    ).length,
  };
}

export function getSignInUsers(): {
  userId: string;
  name: string;
  role: string;
  canViewFinancials: boolean;
  label: string;
}[] {
  const rows = getDb()
    .prepare(
      `SELECT u.user_id, u.app_role, u.can_view_financials, p.full_name,
              ua.scope_type, ua.scope_id
       FROM app_users u
       LEFT JOIN people p ON p.person_id = u.person_id
       LEFT JOIN user_access ua ON ua.user_id = u.user_id
       WHERE u.is_active = 1
       ORDER BY u.user_id, ua.scope_type`,
    )
    .all();
  const byId = new Map<
    string,
    {
      userId: string;
      name: string;
      role: string;
      canViewFinancials: boolean;
      scopes: string[];
    }
  >();
  for (const row of rows) {
    const id = String(row.user_id);
    let rec = byId.get(id);
    if (!rec) {
      rec = {
        userId: id,
        name: str(row.full_name) ?? id,
        role: String(row.app_role),
        canViewFinancials: Number(row.can_view_financials) === 1,
        scopes: [],
      };
      byId.set(id, rec);
    }
    const st = str(row.scope_type);
    if (st === "All") rec.scopes.push("all portfolios");
    else if (st && row.scope_id) rec.scopes.push(`${st} ${row.scope_id}`);
  }
  return [...byId.values()].map((u) => ({
    userId: u.userId,
    name: u.name,
    role: u.role,
    canViewFinancials: u.canViewFinancials,
    label: u.scopes.slice(0, 2).join(", ") || "no scope",
  }));
}

export function getMe(userId: string): Me | null {
  const row = getDb()
    .prepare(
      `SELECT u.user_id, u.person_id, u.email, u.app_role, u.can_view_financials,
              u.is_active, p.full_name
       FROM app_users u
       LEFT JOIN people p ON p.person_id = u.person_id
       WHERE u.user_id = ?`,
    )
    .get(userId);
  if (!row || Number(row.is_active) !== 1) return null;
  const scopes = getDb()
    .prepare(
      "SELECT scope_type, scope_id FROM user_access WHERE user_id = ?",
    )
    .all(userId)
    .map((s) => ({
      type: String(s.scope_type) as Me["scopes"][number]["type"],
      id: str(s.scope_id),
    }));
  return {
    userId: String(row.user_id),
    personId: str(row.person_id),
    name: str(row.full_name) ?? String(row.user_id),
    email: String(row.email),
    role: String(row.app_role) as Me["role"],
    canViewFinancials: Number(row.can_view_financials) === 1,
    scopes,
  };
}

function toLoad(row: Record<string, unknown>): DataLoad {
  return {
    loadId: String(row.load_id),
    sourceSystem: String(row.source_system),
    sourceType: (str(row.source_type) as DataLoad["sourceType"]) ?? null,
    startedAt: String(row.started_at),
    completedAt: str(row.completed_at),
    status: String(row.status) as DataLoad["status"],
    rowsLoaded: num(row.rows_loaded),
    dataAsOf: str(row.data_as_of) ?? "",
    notes: str(row.notes),
  };
}

export function getStatus(): StatusPayload {
  const loads = getDb()
    .prepare(
      `SELECT load_id, source_system, source_type, started_at, completed_at,
              status, rows_loaded, data_as_of, notes
       FROM data_loads ORDER BY started_at DESC`,
    )
    .all()
    .map(toLoad);
  const lastLoad = loads[0]!;
  const lastSuccessfulLoad = loads.find((l) => l.status === "Succeeded")!;
  const rules = getDb().prepare("SELECT * FROM vw_settings").get()!;
  return {
    asOf: lastSuccessfulLoad.dataAsOf,
    lastLoad,
    lastSuccessfulLoad,
    recentLoads: loads.slice(0, 10),
    nextScheduledLoad: null,
    rules: {
      scheduleGreenDays: num(rules.schedule_green_days) ?? 14,
      scheduleAmberDays: num(rules.schedule_amber_days) ?? 45,
      costGreenPct: num(rules.cost_green_pct) ?? 0.05,
      costAmberPct: num(rules.cost_amber_pct) ?? 0.1,
      highIssuesForAmber: num(rules.high_issues_for_amber) ?? 2,
      staleDays: num(rules.stale_days) ?? 30,
    },
  };
}

function allSummaries(userId: string): ProjectSummary[] {
  return getDb().prepare(SUMMARY_SQL).all(userId).map(toSummary);
}

export function getPortfolio(userId: string): PortfolioPayload {
  const rows = allSummaries(userId);
  const liveRows = rows.filter(live);
  const byProgram = new Map<
    string,
    { name: string; portfolio: string; items: ProjectSummary[] }
  >();
  for (const row of liveRows) {
    let g = byProgram.get(row.programId);
    if (!g) {
      const meta = getDb()
        .prepare(
          `SELECT pg.program_name, pf.portfolio_name
           FROM programs pg JOIN portfolios pf ON pf.portfolio_id = pg.portfolio_id
           WHERE pg.program_id = ?`,
        )
        .get(row.programId);
      g = {
        name: row.programName,
        portfolio: str(meta?.portfolio_name) ?? "",
        items: [],
      };
      byProgram.set(row.programId, g);
    }
    g.items.push(row);
  }
  const programs = [...byProgram.entries()]
    .map(([programId, g]) => ({
      programId,
      programName: g.name,
      portfolioName: g.portfolio,
      counts: counts(g.items),
    }))
    .sort((a, b) => b.counts.red - a.counts.red || b.counts.amber - a.counts.amber);

  const totals = counts(liveRows);
  return {
    asOf: latestAsOf(),
    refreshFailed: loadFailed(),
    totals,
    briefing: {
      newlyRed: liveRows.filter((r) => r.newThisWeek && r.calculatedRag === "Red")
        .length,
      reportedBetterThanData: totals.reportedBetterThanData,
      stale: totals.stale,
      noStatusReported: totals.noStatusReported,
    },
    programs,
  };
}

export function getBriefing(userId: string): BriefingPayload {
  const liveRows = allSummaries(userId).filter(live);
  function group(
    key: BriefingPayload["groups"][number]["key"],
    items: ProjectSummary[],
  ): BriefingPayload["groups"][number] {
    return { key, total: items.length, items };
  }
  const groups = [
    group(
      "newlyRed",
      liveRows.filter((r) => r.newThisWeek && r.calculatedRag === "Red"),
    ),
    group(
      "reportedBetterThanData",
      liveRows.filter((r) => r.healthCheck === "Reported better than data"),
    ),
    group(
      "stale",
      liveRows.filter((r) => r.isStale),
    ),
    group(
      "noStatusReported",
      liveRows.filter((r) => r.healthCheck === "No status reported"),
    ),
  ];
  return { asOf: latestAsOf(), groups };
}

export function listProjects(
  userId: string,
  q: ListProjectsQuery,
): { items: ProjectSummary[]; nextCursor: string | null } {
  let rows = allSummaries(userId);
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.code.toLowerCase().includes(needle),
    );
  }
  if (q.programId) rows = rows.filter((r) => r.programId === q.programId);
  if (q.lifecycle) rows = rows.filter((r) => r.lifecycle === q.lifecycle);
  if (q.calculatedRag)
    rows = rows.filter((r) => r.calculatedRag === q.calculatedRag);
  if (q.healthCheck) rows = rows.filter((r) => r.healthCheck === q.healthCheck);
  if (q.stale) rows = rows.filter((r) => r.isStale);
  if (q.rebaselined) {
    const versions = new Map(
      getDb()
        .prepare(
          "SELECT project_code, baseline_version FROM vw_project_summary",
        )
        .all()
        .map((r) => [String(r.project_code), num(r.baseline_version) ?? 1]),
    );
    rows = rows.filter((r) => (versions.get(r.code) ?? 1) > 1);
  }
  if (q.pmId) {
    const codes = new Set(
      getDb()
        .prepare("SELECT project_code FROM projects WHERE pm_id = ?")
        .all(q.pmId)
        .map((r) => String(r.project_code)),
    );
    rows = rows.filter((r) => codes.has(r.code));
  }

  const sort = q.sort ?? "severity";
  rows.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "code") return a.code.localeCompare(b.code);
    if (sort === "forecastFinish") {
      const fa =
        str(
          getDb()
            .prepare("SELECT forecast_finish FROM projects WHERE project_code = ?")
            .get(a.code)?.forecast_finish,
        ) ?? "";
      const fb =
        str(
          getDb()
            .prepare("SELECT forecast_finish FROM projects WHERE project_code = ?")
            .get(b.code)?.forecast_finish,
        ) ?? "";
      return fa.localeCompare(fb);
    }
    const sa = ragRank(a.calculatedRag);
    const sb = ragRank(b.calculatedRag);
    if (sb !== sa) return sb - sa;
    return a.name.localeCompare(b.name);
  });

  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const offset = q.cursor ? Number.parseInt(q.cursor, 10) || 0 : 0;
  const slice = rows.slice(offset, offset + limit);
  const next =
    offset + slice.length < rows.length ? String(offset + slice.length) : null;
  return { items: slice, nextCursor: next };
}

function hasAccess(userId: string, code: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT 1 AS ok FROM vw_user_projects WHERE user_id = ? AND project_code = ?",
    )
    .get(userId, code);
  return Boolean(row);
}

export function getProject(
  userId: string,
  code: string,
  canViewFinancials: boolean,
): ProjectDetail | "not_found" {
  if (!hasAccess(userId, code)) return "not_found";
  const summaryRow = getDb()
    .prepare(`${SUMMARY_SQL} WHERE s.project_code = ?`)
    .get(userId, code);
  if (!summaryRow) return "not_found";
  const summary = toSummary(summaryRow);
  const p = getDb()
    .prepare(
      `SELECT p.*, s.project_manager, s.sponsor, s.slip_days, s.baseline_version,
              s.original_baseline_finish, s.slip_vs_original_days, s.original_budget,
              s.cost_var_pct
       FROM projects p
       JOIN vw_project_summary s ON s.project_code = p.project_code
       WHERE p.project_code = ?`,
    )
    .get(code)!;

  const milestones: Milestone[] = getDb()
    .prepare(
      `SELECT milestone_name, is_stage_gate, baseline_date, forecast_date, actual_date, status
       FROM milestones WHERE project_code = ? ORDER BY COALESCE(forecast_date, baseline_date)`,
    )
    .all(code)
    .map((m) => ({
      name: String(m.milestone_name),
      isStageGate: Number(m.is_stage_gate) === 1,
      baselineDate: str(m.baseline_date),
      forecastDate: str(m.forecast_date),
      actualDate: str(m.actual_date),
      status: (str(m.status) as Milestone["status"]) ?? null,
    }));

  const raid: RaidItem[] = getDb()
    .prepare(
      `SELECT r.raid_id, r.project_code, r.raid_type, r.title, r.severity, r.status,
              pe.full_name, r.due_date, r.mitigation
       FROM raid_items r
       LEFT JOIN people pe ON pe.person_id = r.owner_id
       WHERE r.project_code = ?
       ORDER BY CASE r.severity WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
                r.due_date`,
    )
    .all(code)
    .map((r) => ({
      raidId: String(r.raid_id),
      projectCode: String(r.project_code),
      type: String(r.raid_type) as RaidItem["type"],
      title: String(r.title),
      severity: (str(r.severity) as RaidItem["severity"]) ?? null,
      status: String(r.status) as RaidItem["status"],
      owner: str(r.full_name),
      dueDate: str(r.due_date),
      mitigation: str(r.mitigation),
    }));

  const asOfDate = asOf();
  const team: { name: string; projectRole: string | null; ftePct: number }[] =
    getDb()
      .prepare(
        `SELECT pe.full_name, a.project_role, a.fte_pct
         FROM allocations a
         JOIN people pe ON pe.person_id = a.person_id
         WHERE a.project_code = ? AND a.start_date <= ? AND a.end_date >= ?`,
      )
      .all(code, asOfDate, asOfDate)
      .map((t) => ({
        name: String(t.full_name),
        projectRole: str(t.project_role),
        ftePct: num(t.fte_pct) ?? 0,
      }));

  const baselines: Baseline[] = getDb()
    .prepare(
      `SELECT b.version, b.approved_date, b.baseline_finish, b.baseline_budget, b.reason,
              c.cr_id, c.title AS cr_title, c.status AS cr_status
       FROM baselines b
       LEFT JOIN change_requests c ON c.cr_id = b.cr_id
       WHERE b.project_code = ?
       ORDER BY b.version`,
    )
    .all(code)
    .map((b) => {
      const base: Baseline = {
        version: num(b.version) ?? 1,
        approvedDate: String(b.approved_date),
        baselineFinish: str(b.baseline_finish),
        reason: str(b.reason),
        changeRequest: b.cr_id
          ? {
              crId: String(b.cr_id),
              title: String(b.cr_title),
              status: String(b.cr_status),
            }
          : null,
      };
      if (canViewFinancials) base.baselineBudget = num(b.baseline_budget) ?? undefined;
      return base;
    });

  const detail: ProjectDetail = {
    ...summary,
    projectType: str(p.project_type),
    location: str(p.location),
    sponsor: str(p.sponsor),
    pctComplete: num(p.pct_complete),
    lastStatusUpdate: str(p.last_status_update),
    dates: {
      baselineStart: str(p.baseline_start),
      baselineFinish: str(p.baseline_finish),
      forecastFinish: str(p.forecast_finish),
      actualFinish: str(p.actual_finish),
      slipDays: num(p.slip_days),
      baselineVersion: num(p.baseline_version) ?? 1,
      originalBaselineFinish: str(p.original_baseline_finish),
      slipVsOriginalDays: num(p.slip_vs_original_days),
    },
    baselines,
    milestones,
    raid,
    team,
    commentary: {
      statusCommentary: str(p.status_commentary),
      nextSteps: str(p.next_steps),
    },
  };

  if (canViewFinancials) {
    const months: ProjectMoney["months"] = getDb()
      .prepare(
        `SELECT period, planned, actual, forecast FROM financials
         WHERE project_code = ? ORDER BY period`,
      )
      .all(code)
      .map((m) => ({
        period: String(m.period),
        planned: num(m.planned) ?? 0,
        actual: num(m.actual),
        forecast: num(m.forecast),
      }));
    detail.money = {
      approvedBudget: num(p.approved_budget),
      originalBudget: num(p.original_budget),
      actualToDate: num(p.actual_to_date),
      forecastAtCompletion: num(p.forecast_at_completion),
      costVarPct: num(p.cost_var_pct),
      currency: "CAD",
      months,
    };
  }

  return detail;
}

export function getHistory(
  userId: string,
  code: string,
  weeks = 26,
): WeekHealth[] | "not_found" {
  if (!hasAccess(userId, code)) return "not_found";
  const limit = Math.min(Math.max(weeks, 1), 52);
  const rows = getDb()
    .prepare(
      `SELECT h.week_ending, sh.reported_rag, h.calculated_rag, h.health_reason
       FROM health_snapshots h
       LEFT JOIN status_history sh
         ON sh.project_code = h.project_code AND sh.week_ending = h.week_ending
       WHERE h.project_code = ?
       ORDER BY h.week_ending DESC
       LIMIT ?`,
    )
    .all(code, limit);
  return rows
    .slice()
    .reverse()
    .map((r) => ({
      weekEnding: String(r.week_ending),
      reportedRag: rag(r.reported_rag),
      calculatedRag: rag(r.calculated_rag),
      healthReason: str(r.health_reason),
    }));
}

export function listRisks(
  userId: string,
  type?: RaidItem["type"],
  severity?: RaidItem["severity"],
): RaidItem[] {
  let sql = `
    SELECT r.raid_id, r.project_code, r.raid_type, r.title, r.severity, r.status,
           pe.full_name, r.due_date, r.mitigation
    FROM raid_items r
    JOIN vw_user_projects u ON u.project_code = r.project_code AND u.user_id = ?
    LEFT JOIN people pe ON pe.person_id = r.owner_id
    WHERE r.status <> 'Closed'`;
  const params: unknown[] = [userId];
  if (type) {
    sql += " AND r.raid_type = ?";
    params.push(type);
  }
  if (severity) {
    sql += " AND r.severity = ?";
    params.push(severity);
  }
  sql += ` ORDER BY CASE r.severity WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
                   r.due_date`;
  return getDb()
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      raidId: String(r.raid_id),
      projectCode: String(r.project_code),
      type: String(r.raid_type) as RaidItem["type"],
      title: String(r.title),
      severity: (str(r.severity) as RaidItem["severity"]) ?? null,
      status: String(r.status) as RaidItem["status"],
      owner: str(r.full_name),
      dueDate: str(r.due_date),
      mitigation: str(r.mitigation),
    }));
}

export function getMoney(userId: string): ProgramMoney[] {
  const rows = getDb()
    .prepare(
      `SELECT p.program_id, pg.program_name,
              SUM(p.approved_budget) AS approved_budget,
              SUM(p.forecast_at_completion) AS forecast_at_completion
       FROM projects p
       JOIN programs pg ON pg.program_id = p.program_id
       JOIN vw_user_projects u ON u.project_code = p.project_code AND u.user_id = ?
       WHERE p.lifecycle_status IN ('Active', 'On Hold')
       GROUP BY p.program_id
       ORDER BY pg.program_name`,
    )
    .all(userId);
  return rows.map((r) => {
    const budget = num(r.approved_budget) ?? 0;
    const fac = num(r.forecast_at_completion) ?? 0;
    return {
      programId: String(r.program_id),
      programName: String(r.program_name),
      approvedBudget: budget,
      forecastAtCompletion: fac,
      costVarPct: budget > 0 ? (fac - budget) / budget : null,
      currency: "CAD" as const,
    };
  });
}

export function getPeopleLoad(userId: string): PersonLoad[] {
  return getDb()
    .prepare(
      `SELECT l.person_id, l.full_name, l.role, l.total_fte, l.project_count, l.over_allocated
       FROM vw_person_load l
       WHERE EXISTS (
         SELECT 1 FROM allocations a
         JOIN vw_user_projects u ON u.project_code = a.project_code AND u.user_id = ?
         JOIN vw_settings s
         WHERE a.person_id = l.person_id
           AND a.start_date <= s.as_of_date AND a.end_date >= s.as_of_date
       )
       ORDER BY l.over_allocated DESC, l.total_fte DESC, l.full_name`,
    )
    .all(userId)
    .map((r) => ({
      personId: String(r.person_id),
      name: String(r.full_name),
      role: String(r.role),
      totalFte: num(r.total_fte) ?? 0,
      projectCount: num(r.project_count) ?? 0,
      overAllocated: Number(r.over_allocated) === 1,
    }));
}
