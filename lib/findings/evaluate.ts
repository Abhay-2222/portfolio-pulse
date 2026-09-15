import type { Dataset } from "@/lib/data/types";
import {
  computeInvoiceMetrics,
  computeRaidMetrics,
} from "@/lib/metrics";
import type { ProjectMetrics } from "@/lib/metrics/project";
import type { ResourceMetrics } from "@/lib/metrics/resource";
import {
  activeMetricsOf,
  collectabilityScore,
  contingencyRemaining,
  crAfterPosition,
  daysInReview,
  rankWord,
  uninvoicedBillingMilestones,
} from "@/lib/metrics/derived";
import type { EntityRef, Finding } from "@/lib/findings/types";
import { cells } from "@/lib/ledger/cells";
import { money } from "@/lib/format";

function iso(d: Date): string {
  return d.toISOString();
}

function base(
  dataset: Dataset,
  asOf: Date,
  partial: Omit<Finding, "treatment" | "asOf" | "staleness" | "confidence">,
): Finding {
  return {
    ...partial,
    treatment: 1,
    asOf: iso(asOf),
    staleness: 0,
    confidence: "high",
  };
}

function assignTreatment(f: Finding): Finding {
  const threshold = 50_000;
  const hasDeadline = f.deadline != null || (f.daysUntil != null && f.daysUntil <= 0);
  let treatment: 1 | 2 | 3 | 4 = 1;
  if (
    (f.amount ?? 0) >= threshold &&
    (hasDeadline || f.kind === "opportunity")
  ) {
    treatment = 4;
  } else if (f.severity >= 4 || (f.amount ?? 0) >= threshold) {
    treatment = 3;
  } else if (f.kind === "trend" || f.severity === 3) {
    treatment = 2;
  }
  return { ...f, treatment };
}

export function capTier4(findings: Finding[]): Finding[] {
  const t4 = findings
    .filter((f) => f.treatment === 4)
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  if (t4.length <= 2) return findings;
  const keep = new Set(t4.slice(0, 2).map((f) => f.id));
  return findings.map((f) =>
    f.treatment === 4 && !keep.has(f.id) ? { ...f, treatment: 3 } : f,
  );
}

export function evaluateFindings(
  dataset: Dataset,
  projectMetrics: ProjectMetrics[],
  resourceMetrics: ResourceMetrics[],
  asOf: Date = dataset.settings.AsOfDate,
): Finding[] {
  const projects = new Map(dataset.projects.map((p) => [p.ProjectID, p]));
  const people = new Map(dataset.resources.map((r) => [r.EmployeeID, r]));
  const clients = new Map(dataset.clients.map((c) => [c.ClientID, c]));
  const pm = new Map(projectMetrics.map((m) => [m.ProjectID, m]));
  const rm = new Map(resourceMetrics.map((m) => [m.EmployeeID, m]));
  const active = activeMetricsOf(dataset, projectMetrics);
  const floor = dataset.settings.MarginFloor;
  const out: Finding[] = [];

  const projectRef = (id: string): EntityRef => ({
    type: "project",
    id,
    label: projects.get(id)?.ProjectName ?? id,
  });
  const personRef = (id: string): EntityRef => ({
    type: "person",
    id,
    label: people.get(id)?.FullName ?? id,
  });
  const pmActor = (projectId: string): EntityRef | undefined => {
    const id = projects.get(projectId)?.ProjectManagerID;
    return id ? personRef(id) : undefined;
  };
  const clientRef = (id: string): EntityRef => ({
    type: "client",
    id,
    label: clients.get(id)?.ClientName ?? id,
  });
  const allocIds = (employeeId: string) =>
    dataset.allocations
      .filter(
        (a) =>
          a.EmployeeID === employeeId &&
          a.StartDate.getTime() <= asOf.getTime() &&
          asOf.getTime() <= a.EndDate.getTime(),
      )
      .map((a) => a.AllocationID);
  const contingencyLines = (projectId: string) =>
    dataset.budget.filter(
      (b) =>
        b.ProjectID === projectId &&
        b.CostCategory.toLowerCase() === "contingency",
    );

  for (const row of uninvoicedBillingMilestones(dataset, projectMetrics, asOf)) {
    const project = projectRef(row.ProjectID);
    const clientId = projects.get(row.ProjectID)?.ClientID ?? "";
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `money.milestone_passed_unbilled:${row.MilestoneID}`,
          ruleId: "money.milestone_passed_unbilled",
          subject: {
            type: "milestone",
            id: row.MilestoneID,
            label: row.MilestoneName,
          },
          related: [project, clientRef(clientId)],
          domain: "money",
          kind: "opportunity",
          amount: row.amount,
          deadline: iso(row.ForecastDate),
          daysUntil: Math.round(
            (row.ForecastDate.getTime() - asOf.getTime()) / 86_400_000,
          ),
          severity: 5,
          kicker: "This milestone · uninvoiced",
          headline: `${formatCad(row.amount)} is billable now and has not been invoiced.`,
          sentence: `The ${row.MilestoneName} milestone on ${project.label} passed ${row.ForecastDate.toISOString().slice(0, 10)} and ${formatCad(row.amount)} remains uninvoiced.`,
          consequence: `${formatCad(row.amount)} stays unbilled until ${row.MilestoneName} is invoiced.`,
          move: `Invoice ${row.MilestoneID}, ${formatCad(row.amount)}, forecast ${row.ForecastDate.toISOString().slice(0, 10)}.`,
          actor: pmActor(row.ProjectID),
          section: "escalation",
          href: `/projects/${row.ProjectID}`,
          provenance: cells(dataset, [
            ["Milestones", row.MilestoneID, "BillingPct"],
            ["Milestones", row.MilestoneID, "ForecastDate"],
            ["Milestones", row.MilestoneID, "IsBillingMilestone"],
            ["Milestones", row.MilestoneID, "ActualDate"],
            ["Projects", row.ProjectID, "OriginalContractValue"],
          ]),
        }),
      ),
    );
  }

  const overdue = dataset.invoices
    .map((invoice) => ({
      invoice,
      metrics: computeInvoiceMetrics(invoice, dataset, asOf),
      project: projects.get(invoice.ProjectID),
      pm: pm.get(invoice.ProjectID),
    }))
    .filter((row) => row.metrics.Status === "Overdue")
    .map((row) => {
      const client = row.project
        ? clients.get(row.project.ClientID)
        : undefined;
      const score = collectabilityScore({
        amount: row.invoice.Amount,
        daysOverdue: row.metrics.DaysOverdue,
        clientTier: client?.Tier ?? "",
        projectRag: row.pm?.OverallRAG ?? "Green",
      });
      return { ...row, client, score };
    })
    .sort((a, b) => b.score - a.score);

  overdue.forEach((row, idx) => {
    const project = projectRef(row.invoice.ProjectID);
    const rank = idx + 1;
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `money.overdue_ar_ranked:${row.invoice.InvoiceID}`,
          ruleId: "money.overdue_ar_ranked",
          subject: {
            type: "invoice",
            id: row.invoice.InvoiceID,
            label: row.invoice.InvoiceID,
          },
          related: [
            project,
            clientRef(row.project?.ClientID ?? ""),
          ],
          domain: "money",
          kind: "exception",
          amount: row.invoice.Amount,
          daysUntil: -row.metrics.DaysOverdue,
          deadline: iso(row.metrics.DueDate),
          severity: row.metrics.DaysOverdue > 60 ? 5 : 4,
          kicker: "This invoice · overdue AR",
          headline: `${formatCad(row.invoice.Amount)} overdue on ${project.label} (${row.metrics.DaysOverdue}d).`,
          sentence: `${row.invoice.InvoiceID} for ${project.label} is ${row.metrics.DaysOverdue} days overdue (${formatCad(row.invoice.Amount)}).`,
          consequence: `${formatCad(row.invoice.Amount)} stays uncollected another 30 days.`,
          move: `Chase ${row.invoice.InvoiceID} — this one ${rankWord(rank)} of ${overdue.length}.`,
          actor: pmActor(row.invoice.ProjectID),
          section: "money",
          href: `/money/${row.invoice.InvoiceID}`,
          provenance: cells(dataset, [
            ["Invoices", row.invoice.InvoiceID, "Amount"],
            ["Invoices", row.invoice.InvoiceID, "InvoiceDate"],
            ["Invoices", row.invoice.InvoiceID, "PaidDate"],
            ["Clients", row.project?.ClientID ?? "", "Tier"],
            ["Clients", row.project?.ClientID ?? "", "PaymentTermsDays"],
          ]),
        }),
      ),
    );
  });

  for (const m of active) {
    if (!m.marginReady) continue;
    if (m.UnbilledWIP >= 0) continue;
    const project = projectRef(m.ProjectID);
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `money.overbilled_wip:${m.ProjectID}`,
          ruleId: "money.overbilled_wip",
          subject: project,
          related: [],
          domain: "money",
          kind: "exception",
          amount: Math.abs(m.UnbilledWIP),
          severity: 4,
          headline: `We've billed ${formatCad(Math.abs(m.UnbilledWIP))} more than we've delivered on ${project.label}.`,
          sentence: `${project.label} is over-billed by ${formatCad(Math.abs(m.UnbilledWIP))} — deferred revenue, not unbilled WIP.`,
          section: "money",
          href: `/projects/${m.ProjectID}`,
          provenance: cells(dataset, [
            ["Projects", m.ProjectID, "PctComplete"],
            ["Projects", m.ProjectID, "OriginalContractValue"],
          ]),
        }),
      ),
    );
  }

  const outstandingByClient = new Map<string, number>();
  for (const invoice of dataset.invoices) {
    const im = computeInvoiceMetrics(invoice, dataset, asOf);
    if (im.Status === "Paid") continue;
    const clientId = projects.get(invoice.ProjectID)?.ClientID;
    if (!clientId) continue;
    outstandingByClient.set(
      clientId,
      (outstandingByClient.get(clientId) ?? 0) + invoice.Amount,
    );
  }
  const outstandingTotal = [...outstandingByClient.values()].reduce(
    (s, n) => s + n,
    0,
  );
  for (const [clientId, amount] of outstandingByClient) {
    if (outstandingTotal <= 0 || amount / outstandingTotal <= 0.25) continue;
    const client = clientRef(clientId);
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `money.client_concentration:${clientId}`,
          ruleId: "money.client_concentration",
          subject: client,
          related: [],
          domain: "money",
          kind: "exception",
          amount,
          severity: 4,
          headline: `${client.label} holds ${formatCad(amount)} of outstanding AR.`,
          sentence: `${client.label} is more than 25% of outstanding receivables (${formatCad(amount)} of ${formatCad(outstandingTotal)}).`,
          section: "money",
          href: `/clients/${clientId}`,
          provenance: cells(dataset, [
            ["Clients", clientId, "ClientName"],
            ...dataset.invoices
              .filter((inv) => projects.get(inv.ProjectID)?.ClientID === clientId)
              .slice(0, 6)
              .map(
                (inv) =>
                  ["Invoices", inv.InvoiceID, "Amount"] as [
                    string,
                    string,
                    string,
                  ],
              ),
          ]),
        }),
      ),
    );
  }

  for (const m of active) {
    if (!m.marginReady) continue;
    const project = projects.get(m.ProjectID);
    if (!project || m.ForecastMarginPct >= floor) continue;
    const ref = projectRef(m.ProjectID);
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `money.margin_below_floor:${m.ProjectID}`,
          ruleId: "money.margin_below_floor",
          subject: ref,
          related: [clientRef(project.ClientID)],
          domain: "money",
          kind: "exception",
          amount: m.ForecastMarginAmt,
          severity: m.ForecastMarginPct < 0 ? 5 : 4,
          kicker: "This project · forecast margin",
          headline: `${ref.label} forecasts ${(m.ForecastMarginPct * 100).toFixed(1)}% margin.`,
          sentence: `${ref.label} is ${m.ForecastMarginPct < 0 ? "losing money" : "below the margin floor"} at ${(m.ForecastMarginPct * 100).toFixed(1)}% versus a ${(project.TargetMarginPct * 100).toFixed(0)}% target.`,
          consequence: `${ref.label} stays below the floor while it burns at today's CPI.`,
          move: `Open ${ref.label} — ${m.ScheduleSlipDays}d late, ${(m.ForecastMarginPct * 100).toFixed(1)}% vs ${(project.TargetMarginPct * 100).toFixed(0)}% target.`,
          actor: pmActor(m.ProjectID),
          section: "verdict",
          href: `/projects/${m.ProjectID}`,
          provenance: cells(dataset, [
            ["Projects", m.ProjectID, "TargetMarginPct"],
            ["Projects", m.ProjectID, "OriginalContractValue"],
            ["Projects", m.ProjectID, "PctComplete"],
            ["Settings", "MarginFloor", "Value"],
          ]),
        }),
      ),
    );
  }

  for (const m of active) {
    if (m.OverallRAG !== "Red") continue;
    const remaining = contingencyRemaining(dataset, m.ProjectID);
    if (remaining <= 0) continue;
    const ref = projectRef(m.ProjectID);
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `risk.contingency_unused_while_red:${m.ProjectID}`,
          ruleId: "risk.contingency_unused_while_red",
          subject: ref,
          related: [],
          domain: "risk",
          kind: "coverage",
          amount: remaining,
          severity: 3,
          kicker: "This project · unused reserve",
          headline: `${ref.label} still holds ${formatCad(remaining)} of unused contingency.`,
          sentence: `${ref.label} is red and has never drawn ${formatCad(remaining)} sitting in contingency reserve.`,
          consequence: `${formatCad(remaining)} sits unused while ${ref.label} is off track.`,
          move: `Draw or release ${formatCad(remaining)} of contingency on ${ref.label}.`,
          actor: pmActor(m.ProjectID),
          section: "money",
          href: `/projects/${m.ProjectID}`,
          provenance: cells(dataset, [
            ["Projects", m.ProjectID, "PctComplete"],
            ...contingencyLines(m.ProjectID).flatMap(
              (line) =>
                [
                  ["Budget", line.BudgetLineID, "BudgetAmount"],
                  ["Budget", line.BudgetLineID, "CostCategory"],
                ] as Array<[string, string, string]>,
            ),
          ]),
        }),
      ),
    );
  }

  for (const item of dataset.raid.filter((r) => r.Status !== "Closed")) {
    const raidM = computeRaidMetrics(item, dataset);
    const owner = rm.get(item.OwnerID);
    if (owner && owner.CurrentAllocationPct > 1) {
      const raidRef: EntityRef = {
        type: "raid",
        id: item.RAIDID,
        label: item.Title,
      };
      out.push(
        assignTreatment(
          base(dataset, asOf, {
            id: `risk.risk_owner_overallocated:${item.RAIDID}`,
            ruleId: "risk.risk_owner_overallocated",
            subject: raidRef,
            related: [personRef(item.OwnerID), projectRef(item.ProjectID)],
            domain: "risk",
            kind: "collision",
            amount: raidM.ExpectedExposure,
            severity: 4,
            kicker: "This risk · owner collision",
            headline: `${people.get(item.OwnerID)?.FullName ?? item.OwnerID} owns ${item.Title} at ${Math.round(owner.CurrentAllocationPct * 100)}% allocated.`,
            sentence: `${item.Title} on ${projects.get(item.ProjectID)?.ProjectName} is owned by ${people.get(item.OwnerID)?.FullName}, who is currently overallocated.`,
            consequence: `${item.Title} stays unowned in practice while the named owner is overallocated.`,
            move: `Reassign ownership of ${item.Title}.`,
            actor: personRef(item.OwnerID),
            section: "pressure",
            href: `/risks/${item.RAIDID}`,
            provenance: cells(dataset, [
              ["RAID", item.RAIDID, "OwnerID"],
              ["RAID", item.RAIDID, "Title"],
              ...allocIds(item.OwnerID).map(
                (id) =>
                  ["Allocations", id, "AllocationPct"] as [
                    string,
                    string,
                    string,
                  ],
              ),
            ]),
          }),
        ),
      );
    }
  }

  for (const cr of dataset.changeRequests.filter(
    (c) => c.Status === "Draft" || c.Status === "Submitted",
  )) {
    const days = daysInReview(cr.RaisedDate, asOf);
    const metrics = pm.get(cr.ProjectID);
    const project = projectRef(cr.ProjectID);
    if (days > 45) {
      out.push(
        assignTreatment(
          base(dataset, asOf, {
            id: `decision.cr_stalled_in_review:${cr.CRID}`,
            ruleId: "decision.cr_stalled_in_review",
            subject: {
              type: "cr",
              id: cr.CRID,
              label: cr.Title,
            },
            related: [project],
            domain: "decision",
            kind: "exception",
            amount: cr.CostImpact,
            daysUntil: -days,
            severity: days > 70 ? 5 : 4,
            headline: `${cr.Title} has sat in review ${days} days (${formatCad(cr.CostImpact)}).`,
            sentence: `${cr.CRID} on ${project.label} has been pending ${days} days with ${formatCad(cr.CostImpact)} cost impact.`,
            section: "pressure",
            href: "/decisions",
            provenance: cells(dataset, [
              ["ChangeRequests", cr.CRID, "RaisedDate"],
              ["ChangeRequests", cr.CRID, "CostImpact"],
              ["ChangeRequests", cr.CRID, "Status"],
            ]),
          }),
        ),
      );
    }
    if (metrics && metrics.marginReady) {
      const after = crAfterPosition(metrics, cr);
      if (after.marginPct < floor && metrics.ForecastMarginPct >= floor) {
        out.push(
          assignTreatment(
            base(dataset, asOf, {
              id: `decision.cr_would_break_margin:${cr.CRID}`,
              ruleId: "decision.cr_would_break_margin",
              subject: {
                type: "cr",
                id: cr.CRID,
                label: cr.Title,
              },
              related: [project],
              domain: "decision",
              kind: "exception",
              amount: cr.CostImpact,
              severity: 5,
              headline: `Approving ${cr.Title} takes ${project.label} below the margin floor.`,
              sentence: `${project.label} is at ${(metrics.ForecastMarginPct * 100).toFixed(1)}% today; ${cr.Title} would move it to ${(after.marginPct * 100).toFixed(1)}%.`,
              section: "pressure",
              href: "/decisions",
              provenance: cells(dataset, [
                ["ChangeRequests", cr.CRID, "CostImpact"],
                ["ChangeRequests", cr.CRID, "RevenueImpact"],
                ["Projects", cr.ProjectID, "TargetMarginPct"],
                ["Settings", "MarginFloor", "Value"],
              ]),
            }),
          ),
        );
      }
    }
  }

  const under = resourceMetrics
    .map((m) => ({ m, r: people.get(m.EmployeeID) }))
    .filter(
      (row) =>
        row.r &&
        row.m.CurrentAllocationPct < 0.6 &&
        row.m.UtilizationStatus !== "Non-assignable",
    );

  for (const person of resourceMetrics) {
    if (person.CurrentAllocationPct <= 1) continue;
    const resource = people.get(person.EmployeeID);
    if (!resource) continue;
    const sameSkill = under.filter(
      (row) => row.r!.PrimarySkill === resource.PrimarySkill,
    );
    const pool =
      sameSkill.length > 0
        ? sameSkill
        : under.filter((row) => row.r!.Role === resource.Role);
    const swap = [...pool].sort(
      (a, b) => a.m.CurrentAllocationPct - b.m.CurrentAllocationPct,
    )[0];
    if (!swap?.r) continue;
    const me = personRef(person.EmployeeID);
    const other = personRef(swap.r.EmployeeID);
    const swapPct = Math.round(swap.m.CurrentAllocationPct * 100);
    const myPct = Math.round(person.CurrentAllocationPct * 100);
    const onProject = dataset.allocations
      .filter(
        (a) =>
          a.EmployeeID === person.EmployeeID &&
          a.StartDate.getTime() <= asOf.getTime() &&
          asOf.getTime() <= a.EndDate.getTime(),
      )
      .map((a) => ({ a, m: pm.get(a.ProjectID) }))
      .sort((a, b) => {
        const rank = (r?: string) =>
          r === "Red" ? 0 : r === "Amber" ? 1 : 2;
        const d = rank(a.m?.OverallRAG) - rank(b.m?.OverallRAG);
        if (d !== 0) return d;
        return b.a.AllocationPct - a.a.AllocationPct;
      })[0];
    const project = onProject
      ? projectRef(onProject.a.ProjectID)
      : undefined;
    const managerId = resource.ManagerID;
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `people.overallocated_with_swap:${person.EmployeeID}`,
          ruleId: "people.overallocated_with_swap",
          subject: me,
          related: [other, ...(project ? [project] : [])],
          domain: "people",
          kind: "collision",
          severity: 4,
          kicker: "These people · swap",
          headline: project
            ? `Move ${project.label} to ${other.label}.`
            : `${me.label} is at ${myPct}%; ${other.label} is at ${swapPct}%.`,
          sentence: `${me.label} is carrying ${myPct}% (${resource.PrimarySkill}). ${other.label} is the same skill at ${swapPct}%.`,
          consequence: `${me.label} stays at ${myPct}% until someone takes a role.`,
          move: project
            ? `Reassign ${project.label} to ${other.label}.`
            : `Give ${other.label} (${swapPct}%) a role off ${me.label}.`,
          actor: managerId ? personRef(managerId) : undefined,
          section: "resources",
          href: `/people/${person.EmployeeID}`,
          provenance: cells(dataset, [
            ...allocIds(person.EmployeeID).map(
              (id) =>
                ["Allocations", id, "AllocationPct"] as [string, string, string],
            ),
            ...allocIds(swap.r.EmployeeID).map(
              (id) =>
                ["Allocations", id, "AllocationPct"] as [string, string, string],
            ),
            ["Resources", person.EmployeeID, "Role"],
            ["Resources", swap.r.EmployeeID, "Role"],
            ["Resources", person.EmployeeID, "PrimarySkill"],
            ["Resources", swap.r.EmployeeID, "PrimarySkill"],
          ]),
        }),
      ),
    );
  }

  for (const person of resourceMetrics) {
    const resource = people.get(person.EmployeeID);
    if (!resource) continue;
    if (person.CurrentAllocationPct > 0) continue;
    if (person.BillableHoursYTD > 0) continue;
    if (resource.WeeklyCapacityHrs === 0) continue;
    const weeklyCost = resource.CostRateHr * resource.WeeklyCapacityHrs;
    const me = personRef(person.EmployeeID);
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `people.idle_specialist_cost:${person.EmployeeID}`,
          ruleId: "people.idle_specialist_cost",
          subject: me,
          related: [],
          domain: "people",
          kind: "opportunity",
          amount: weeklyCost,
          severity: 4,
          headline: `${me.label} is unsold — about ${formatCad(weeklyCost)}/week of cost no project carries.`,
          sentence: `${me.label} (${resource.PrimarySkill}) is at 0% allocation and 0 billable hours YTD.`,
          kicker: "This person · bench",
          consequence: `${formatCad(weeklyCost)} of cost stays on the bench each week.`,
          move: `Staff ${me.label} (${resource.PrimarySkill}) onto an open role.`,
          section: "resources",
          href: `/people/${person.EmployeeID}`,
          provenance: cells(dataset, [
            ["Resources", person.EmployeeID, "CostRateHr"],
            ["Resources", person.EmployeeID, "WeeklyCapacityHrs"],
            ["Resources", person.EmployeeID, "PrimarySkill"],
          ]),
        }),
      ),
    );
  }

  const redIds = new Set(
    active.filter((m) => m.OverallRAG === "Red").map((m) => m.ProjectID),
  );
  const redByPerson = new Map<string, string[]>();
  for (const a of dataset.allocations) {
    if (
      a.StartDate.getTime() <= asOf.getTime() &&
      asOf.getTime() <= a.EndDate.getTime() &&
      redIds.has(a.ProjectID)
    ) {
      const list = redByPerson.get(a.EmployeeID) ?? [];
      if (!list.includes(a.ProjectID)) list.push(a.ProjectID);
      redByPerson.set(a.EmployeeID, list);
    }
  }
  for (const [employeeId, ids] of redByPerson) {
    if (ids.length < 2) continue;
    const me = personRef(employeeId);
    out.push(
      assignTreatment(
        base(dataset, asOf, {
          id: `people.concentrated_on_reds:${employeeId}`,
          ruleId: "people.concentrated_on_reds",
          subject: me,
          related: ids.map(projectRef),
          domain: "people",
          kind: "collision",
          severity: 4,
          headline: `${me.label} is on ${ids.length} off-track projects.`,
          sentence: `${me.label} is currently allocated to ${ids.map((id) => projects.get(id)?.ProjectName ?? id).join(" and ")}.`,
          section: "resources",
          href: `/people/${employeeId}`,
          provenance: cells(dataset, [
            ...dataset.allocations
              .filter(
                (a) =>
                  a.EmployeeID === employeeId &&
                  ids.includes(a.ProjectID) &&
                  a.StartDate.getTime() <= asOf.getTime() &&
                  asOf.getTime() <= a.EndDate.getTime(),
              )
              .map(
                (a) =>
                  ["Allocations", a.AllocationID, "ProjectID"] as [
                    string,
                    string,
                    string,
                  ],
              ),
          ]),
        }),
      ),
    );
  }

  return out.sort((a, b) => {
    if (b.treatment !== a.treatment) return b.treatment - a.treatment;
    return (b.amount ?? 0) - (a.amount ?? 0);
  });
}

function formatCad(n: number): string {
  return money(n);
}

export function composeBriefing(
  findings: Finding[],
  redCount: number,
): string {
  const swap = findings.find((f) => f.ruleId === "people.overallocated_with_swap");
  const unbilled = findings.filter(
    (f) => f.ruleId === "money.milestone_passed_unbilled",
  );
  const unbilledSum = unbilled.reduce((s, f) => s + (f.amount ?? 0), 0);
  const parts: string[] = [];
  if (swap) {
    parts.push((swap.move ?? swap.headline).replace(/\.$/, ""));
  } else if (redCount > 0) {
    parts.push(
      `${redCount} project${redCount === 1 ? " is" : "s are"} off track`,
    );
  }
  if (unbilledSum > 0) {
    parts.push(
      `${formatCad(unbilledSum)} is billable across the book and has never been invoiced`,
    );
  }
  if (parts.length === 0) return "Everything is on track.";
  return `${parts.join(". ")}.`;
}

export function findingsForSubject(
  findings: Finding[],
  type: EntityRef["type"],
  id: string,
): Finding[] {
  return findings.filter(
    (f) =>
      (f.subject.type === type && f.subject.id === id) ||
      f.related.some((r) => r.type === type && r.id === id),
  );
}
