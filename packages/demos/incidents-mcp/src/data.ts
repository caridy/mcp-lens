/**
 * Fake incident-management data — accounts, incidents, and timeline
 * events. State lives in module-level Maps so a session sees a coherent
 * snapshot. No mutations are exposed (this server is read-only by
 * design — Phase 0 of MCP UI Apps in Slack also gates writes; we want
 * every tool to render through).
 *
 * Structural shape inspired by what real incident-management tools
 * track (severity tier, open/mitigated/resolved progression, IC,
 * impact KPIs, contributor timeline). All values are fictitious;
 * collisions with real customers, services, or engineers are
 * coincidental.
 */

// ── Accounts ────────────────────────────────────────────────────────────────

export type AccountTier = 'enterprise' | 'business' | 'starter';

export interface Account {
  id: string;
  name: string;
  tier: AccountTier;
  region: string;
  primaryContact: string;
  /** Short prose; what this customer does on our platform. */
  summary: string;
}

const ACCOUNTS: Account[] = [
  {
    id: 'acct-globex',
    name: 'Globex',
    tier: 'enterprise',
    region: 'NA-East',
    primaryContact: 'Priya Anand (priya@globex.example)',
    summary:
      'Global manufacturing conglomerate. Heaviest user of EKM and Channel Sync; runs daily ETL from their MES into our analytics tier.',
  },
  {
    id: 'acct-initech',
    name: 'Initech',
    tier: 'business',
    region: 'NA-West',
    primaryContact: 'Marcus Bell (mbell@initech.example)',
    summary:
      'Financial-services SaaS reseller. Uses our platform for operational alerting; has a dedicated SLA on the EU-edge tier.',
  },
  {
    id: 'acct-soylent',
    name: 'Soylent Logistics',
    tier: 'business',
    region: 'EU-Central',
    primaryContact: 'Anders Møller (anders@soylent.example)',
    summary:
      'Pan-European fleet ops. Uses our messaging tier for driver-to-dispatch sync; latency-sensitive but tolerates partial outages.',
  },
  {
    id: 'acct-hooli',
    name: 'Hooli',
    tier: 'starter',
    region: 'NA-West',
    primaryContact: 'Jin Park (jin@hooli.example)',
    summary:
      'Internal tooling experiments; low traffic. On a trial seat — useful as a canary for early rollouts.',
  },
];

// ── Incidents ───────────────────────────────────────────────────────────────

export type IncidentSeverity = 'sev0' | 'sev1' | 'sev2' | 'sev3';
export type IncidentStatus = 'open' | 'mitigated' | 'resolved';

/** A single impact KPI ("Tickets opened: 161"). */
export interface ImpactKpi {
  /** Short label, e.g. "Zendesk tickets". */
  label: string;
  /** Display value, e.g. "161" or "~3.1M". */
  value: string;
  /**
   * Tone hint for rendering. The agent SHOULD choose this based on
   * whether the value is "bad" (lots of tickets = warning/danger) or
   * informational (raw user count = neutral/info).
   */
  tone?: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  /** ISO timestamp when the incident was opened. */
  openedAt: string;
  /** ISO timestamp when traffic recovered or workaround landed. */
  mitigatedAt?: string;
  /** ISO timestamp when fully resolved (post-mitigation cleanup done). */
  resolvedAt?: string;
  /** Account ids touched by this incident. */
  accountIds: string[];
  /** Incident commander, current. */
  ic: string;
  /** A short situational summary, written for an exec audience. */
  summary: string;
  /** Quantitative impact, displayed as a stat row. */
  impact: ImpactKpi[];
  /** Optional pointer at the postmortem doc (link). */
  postmortemUrl?: string;
}

const INCIDENTS: Incident[] = [
  {
    id: 'INC-52790',
    title: 'EKM 500 errors / EKM latency',
    severity: 'sev1',
    status: 'mitigated',
    openedAt: '2026-05-08T18:54:00Z',
    mitigatedAt: '2026-05-12T09:16:00Z',
    accountIds: ['acct-globex', 'acct-initech'],
    ic: 'Alex Elman',
    summary:
      'EKM customers experienced elevated latency and 500 errors across messaging, channels, workflows, and files. Two major impact windows; recovery via NLB scale-out, KMS rate cap, and a hot-fix to the Koi Boi EKM shim.',
    impact: [
      { label: 'Tickets opened', value: '161', tone: 'warning' },
      { label: 'Customers affected', value: '256', tone: 'warning' },
      { label: 'Users impacted', value: '~3.1M', tone: 'danger' },
      { label: 'KMS rate reduction', value: '−50%', tone: 'info' },
      { label: 'Cache hit rate (peak)', value: '90%', tone: 'success' },
      { label: 'EKGen pods (peak)', value: '256', tone: 'neutral' },
    ],
  },
  {
    id: 'INC-52803',
    title: 'EU-edge messaging delays',
    severity: 'sev2',
    status: 'open',
    openedAt: '2026-05-15T07:22:00Z',
    accountIds: ['acct-initech', 'acct-soylent'],
    ic: 'Reza Karimi',
    summary:
      'EU-edge customers seeing 20–40s delivery delays on inbound messaging. Suspected tail-latency in the broker fan-out; investigating whether last week\'s broker upgrade is the trigger.',
    impact: [
      { label: 'Customers affected', value: '34', tone: 'warning' },
      { label: 'p95 delay', value: '38s', tone: 'danger' },
      { label: 'Tickets opened', value: '12', tone: 'info' },
    ],
  },
  {
    id: 'INC-52755',
    title: 'Tardigrade host eviction cascade',
    severity: 'sev0',
    status: 'resolved',
    openedAt: '2026-05-08T18:54:00Z',
    mitigatedAt: '2026-05-08T19:14:00Z',
    resolvedAt: '2026-05-09T03:00:00Z',
    accountIds: ['acct-globex', 'acct-initech', 'acct-soylent', 'acct-hooli'],
    ic: 'Alex Elman',
    summary:
      'AWS evicted three problematic Tardigrade hosts simultaneously, cascading to a 14-minute global outage on the messaging tier before NLB autoscaling caught up. Postmortem complete.',
    impact: [
      { label: 'Outage duration', value: '14m', tone: 'danger' },
      { label: 'Customers affected', value: '~all', tone: 'danger' },
      { label: 'Tickets opened', value: '402', tone: 'danger' },
    ],
    postmortemUrl: 'https://internal.example.com/postmortems/INC-52755',
  },
  {
    id: 'INC-52810',
    title: 'Files API 503 spikes',
    severity: 'sev2',
    status: 'mitigated',
    openedAt: '2026-05-13T22:08:00Z',
    mitigatedAt: '2026-05-14T01:45:00Z',
    accountIds: ['acct-globex'],
    ic: 'Sarah Lin',
    summary:
      'Files API throwing 503s during peak ingest from Globex\'s nightly ETL. Mitigated by raising the per-tenant rate limit and shifting Globex to the dedicated upload pool.',
    impact: [
      { label: 'Customers affected', value: '1', tone: 'info' },
      { label: 'Failed uploads', value: '~8.4K', tone: 'warning' },
      { label: 'p99 retry rate', value: '12%', tone: 'warning' },
    ],
  },
  {
    id: 'INC-52762',
    title: 'Workflow engine slow-job backlog',
    severity: 'sev3',
    status: 'resolved',
    openedAt: '2026-05-09T11:00:00Z',
    mitigatedAt: '2026-05-09T13:30:00Z',
    resolvedAt: '2026-05-09T18:00:00Z',
    accountIds: ['acct-hooli'],
    ic: 'Jin Park',
    summary:
      'Workflow engine accumulated a 4-hour backlog of slow jobs after a misconfigured retry policy on the Hooli tenant. Resolved by purging the queue and reverting the retry config.',
    impact: [
      { label: 'Backlog depth (peak)', value: '4,221', tone: 'warning' },
      { label: 'Customers affected', value: '1', tone: 'info' },
    ],
    postmortemUrl: 'https://internal.example.com/postmortems/INC-52762',
  },
  {
    id: 'INC-52814',
    title: 'Channel Sync deduplication regression',
    severity: 'sev1',
    status: 'open',
    openedAt: '2026-05-16T03:11:00Z',
    accountIds: ['acct-globex', 'acct-soylent'],
    ic: 'Priya Anand',
    summary:
      'Channel Sync emitting duplicate events for ~6% of channels after the 0.42.1 release. Suspected change to the dedup window. Rolling back release-train; hot-fix in QA.',
    impact: [
      { label: 'Customers affected', value: '17', tone: 'warning' },
      { label: 'Duplicate events', value: '~84K/hr', tone: 'danger' },
      { label: 'Affected channels', value: '6%', tone: 'warning' },
    ],
  },
];

// ── Timeline events ─────────────────────────────────────────────────────────

export type TimelineEventType =
  | 'Impact'
  | 'Recovery'
  | 'Action'
  | 'RootCauseLead'
  | 'Update';

export interface TimelineEvent {
  id: string;
  incidentId: string;
  /** ISO timestamp. */
  at: string;
  type: TimelineEventType;
  author: string;
  text: string;
}

/**
 * INC-52790 gets the rich event timeline so the timeline preset has
 * something meaty to render. Other incidents get sparser timelines so
 * "show me the timeline" still works on them.
 */
const TIMELINE: TimelineEvent[] = [
  // INC-52790 — EKM 500 errors / EKM latency
  {
    id: 'evt-52790-01',
    incidentId: 'INC-52790',
    at: '2026-05-08T18:54:00Z',
    type: 'Impact',
    author: 'pagerduty',
    text: 'Initial impact: two major impact windows before recovery at ~3:02 PM PDT.',
  },
  {
    id: 'evt-52790-02',
    incidentId: 'INC-52790',
    at: '2026-05-08T22:02:00Z',
    type: 'Recovery',
    author: 'Alex Elman',
    text: 'AWS evicted problematic Tardigrade host; NLB scaled 5x. Recovery.',
  },
  {
    id: 'evt-52790-03',
    incidentId: 'INC-52790',
    at: '2026-05-11T05:55:00Z',
    type: 'Impact',
    author: 'pagerduty',
    text: 'Recurrence: sustained EKM /decrypt failures begin.',
  },
  {
    id: 'evt-52790-04',
    incidentId: 'INC-52790',
    at: '2026-05-11T08:00:00Z',
    type: 'Update',
    author: 'Alex Elman',
    text: 'Amazon Zoom call: NLB still 5x, SSL handshake errors observed at their end.',
  },
  {
    id: 'evt-52790-05',
    incidentId: 'INC-52790',
    at: '2026-05-11T08:02:00Z',
    type: 'Action',
    author: 'Petr Pchelko',
    text: 'KMS request rate reduced ~50% by Petr Pchelko; cache hit rate climbs to ~80%.',
  },
  {
    id: 'evt-52790-06',
    incidentId: 'INC-52790',
    at: '2026-05-11T08:28:00Z',
    type: 'Action',
    author: 'Alex Elman',
    text: 'IC decision: disable KMS FIPS VPC PrivateLink endpoint for pod-level forensics.',
  },
  {
    id: 'evt-52790-07',
    incidentId: 'INC-52790',
    at: '2026-05-11T08:38:00Z',
    type: 'RootCauseLead',
    author: 'Jason Liszka',
    text: 'docjoin offline indexer generating outsized EKM requests for Koi Boi org.',
  },
  {
    id: 'evt-52790-08',
    incidentId: 'INC-52790',
    at: '2026-05-11T08:42:00Z',
    type: 'Action',
    author: 'Sarah Lin',
    text: 'PR #11505 deployed: Koi Boi EKM shim passthrough to fix decrypt error spam.',
  },
  {
    id: 'evt-52790-09',
    incidentId: 'INC-52790',
    at: '2026-05-11T09:16:00Z',
    type: 'Recovery',
    author: 'Alex Elman',
    text: 'Incident declared Under Control (IC: Alex Elman).',
  },
  {
    id: 'evt-52790-10',
    incidentId: 'INC-52790',
    at: '2026-05-11T10:02:00Z',
    type: 'RootCauseLead',
    author: 'Reza Karimi',
    text: 'GOMAXPROCS theory raised: PR #11472 changed from auto to 3 (intended: 20).',
  },

  // INC-52803 — EU-edge messaging delays (open)
  {
    id: 'evt-52803-01',
    incidentId: 'INC-52803',
    at: '2026-05-15T07:22:00Z',
    type: 'Impact',
    author: 'pagerduty',
    text: 'Initial alerts: EU-edge p95 latency on inbound messaging crossed 30s.',
  },
  {
    id: 'evt-52803-02',
    incidentId: 'INC-52803',
    at: '2026-05-15T07:48:00Z',
    type: 'RootCauseLead',
    author: 'Reza Karimi',
    text: 'Suspected broker fan-out tail-latency. Last broker upgrade landed 5 days ago.',
  },
  {
    id: 'evt-52803-03',
    incidentId: 'INC-52803',
    at: '2026-05-15T08:30:00Z',
    type: 'Action',
    author: 'Reza Karimi',
    text: 'Capturing broker thread dumps; comparing to pre-upgrade snapshots.',
  },

  // INC-52755 — Tardigrade host eviction cascade (resolved)
  {
    id: 'evt-52755-01',
    incidentId: 'INC-52755',
    at: '2026-05-08T18:54:00Z',
    type: 'Impact',
    author: 'pagerduty',
    text: 'Three Tardigrade hosts evicted simultaneously by AWS. Global messaging tier drops 80%+ of traffic.',
  },
  {
    id: 'evt-52755-02',
    incidentId: 'INC-52755',
    at: '2026-05-08T19:14:00Z',
    type: 'Recovery',
    author: 'Alex Elman',
    text: 'NLB autoscaling caught up after 14 minutes. Traffic restored.',
  },
  {
    id: 'evt-52755-03',
    incidentId: 'INC-52755',
    at: '2026-05-09T03:00:00Z',
    type: 'Update',
    author: 'Alex Elman',
    text: 'Postmortem published. Action items: faster autoscale floor, host-eviction circuit breaker.',
  },

  // INC-52810 — Files API 503 spikes (mitigated)
  {
    id: 'evt-52810-01',
    incidentId: 'INC-52810',
    at: '2026-05-13T22:08:00Z',
    type: 'Impact',
    author: 'pagerduty',
    text: 'Files API 503 rate climbed past 8% during Globex nightly ETL window.',
  },
  {
    id: 'evt-52810-02',
    incidentId: 'INC-52810',
    at: '2026-05-13T23:20:00Z',
    type: 'Action',
    author: 'Sarah Lin',
    text: 'Per-tenant upload rate-limit raised; Globex traffic shifted to dedicated upload pool.',
  },
  {
    id: 'evt-52810-03',
    incidentId: 'INC-52810',
    at: '2026-05-14T01:45:00Z',
    type: 'Recovery',
    author: 'Sarah Lin',
    text: '503 rate back below 0.5%. Mitigation holding; root cause TBD in postmortem.',
  },

  // INC-52762 — Workflow engine slow-job backlog (resolved)
  {
    id: 'evt-52762-01',
    incidentId: 'INC-52762',
    at: '2026-05-09T11:00:00Z',
    type: 'Impact',
    author: 'pagerduty',
    text: 'Workflow engine queue depth crossed 4,000; jobs running >30m late.',
  },
  {
    id: 'evt-52762-02',
    incidentId: 'INC-52762',
    at: '2026-05-09T13:30:00Z',
    type: 'Action',
    author: 'Jin Park',
    text: 'Misconfigured retry policy reverted; queue purged.',
  },
  {
    id: 'evt-52762-03',
    incidentId: 'INC-52762',
    at: '2026-05-09T18:00:00Z',
    type: 'Recovery',
    author: 'Jin Park',
    text: 'Backlog drained. Resolved.',
  },

  // INC-52814 — Channel Sync dedup regression (open)
  {
    id: 'evt-52814-01',
    incidentId: 'INC-52814',
    at: '2026-05-16T03:11:00Z',
    type: 'Impact',
    author: 'pagerduty',
    text: 'Duplicate-event rate on Channel Sync climbed to ~84K/hr after release 0.42.1.',
  },
  {
    id: 'evt-52814-02',
    incidentId: 'INC-52814',
    at: '2026-05-16T03:40:00Z',
    type: 'RootCauseLead',
    author: 'Priya Anand',
    text: 'Suspect: dedup window narrowed in 0.42.1. Rolling back release-train.',
  },
];

// ── Query API ───────────────────────────────────────────────────────────────

export function listAccounts(): Account[] {
  return [...ACCOUNTS];
}

export function getAccount(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}

export interface IncidentFilters {
  accountId?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
}

export function listIncidents(filters: IncidentFilters = {}): Incident[] {
  let rows = [...INCIDENTS];
  if (filters.accountId) {
    rows = rows.filter((i) => i.accountIds.includes(filters.accountId!));
  }
  if (filters.severity) {
    rows = rows.filter((i) => i.severity === filters.severity);
  }
  if (filters.status) {
    rows = rows.filter((i) => i.status === filters.status);
  }
  // Newest first.
  rows.sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
  return rows;
}

export function getIncident(id: string): Incident | undefined {
  return INCIDENTS.find((i) => i.id === id);
}

export interface TimelineQuery {
  /** Maximum number of events to return (newest first). Default: all. */
  limit?: number;
  /** Filter by event type. */
  type?: TimelineEventType;
}

export function getIncidentTimeline(
  incidentId: string,
  query: TimelineQuery = {},
): TimelineEvent[] {
  let events = TIMELINE.filter((e) => e.incidentId === incidentId);
  if (query.type) {
    events = events.filter((e) => e.type === query.type);
  }
  // Newest first.
  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  if (query.limit !== undefined) {
    events = events.slice(0, query.limit);
  }
  return events;
}

/**
 * Distinct contributors who appear in an incident's timeline (any
 * non-pagerduty author). Plus the IC, even if they don't appear in the
 * timeline. Order: IC first, then contributors in first-appearance
 * order.
 */
export interface Contributor {
  name: string;
  /** Roles this person played: 'IC', 'Author' (wrote events). */
  roles: Array<'IC' | 'Author'>;
  /** Number of events this person authored on the incident. */
  eventCount: number;
}

export function getIncidentContributors(incidentId: string): Contributor[] {
  const incident = getIncident(incidentId);
  if (!incident) return [];
  const events = TIMELINE.filter(
    (e) => e.incidentId === incidentId && e.author !== 'pagerduty',
  );
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const e of events) {
    if (!counts.has(e.author)) order.push(e.author);
    counts.set(e.author, (counts.get(e.author) ?? 0) + 1);
  }
  const result: Contributor[] = [];
  // IC first.
  if (incident.ic) {
    const eventCount = counts.get(incident.ic) ?? 0;
    const roles: Contributor['roles'] = ['IC'];
    if (eventCount > 0) roles.push('Author');
    result.push({ name: incident.ic, roles, eventCount });
  }
  // Other authors, in first-appearance order.
  for (const author of order) {
    if (author === incident.ic) continue;
    result.push({
      name: author,
      roles: ['Author'],
      eventCount: counts.get(author) ?? 0,
    });
  }
  return result;
}

/** Pure pass-through; `Incident.impact` already carries the kpi list. */
export function getIncidentImpact(
  incidentId: string,
): { incidentId: string; kpis: ImpactKpi[] } | undefined {
  const inc = getIncident(incidentId);
  if (!inc) return undefined;
  return { incidentId: inc.id, kpis: inc.impact };
}
