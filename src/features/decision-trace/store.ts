// src/features/audit/store.ts

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { auditApi } from './api'
import type { AuditEventUi, AuditSeverity, AuditTimelineEvent, AuditTimelineResponse, AuditMetaKV } from './types'

function safeString(v: any) {
  if (v == null) return '-'
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function toLocalDateKey(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatTs(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function classify(e: AuditTimelineEvent) {
  const t = String(e.type || '').toUpperCase()
  const sev = String(e.severity || '').toUpperCase()

  const bySev =
    sev === 'CRITICAL' || sev === 'ERROR'
      ? { badge: 'bg-rose-100 text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50/30', icon: 'error' }
      : sev === 'WARN'
      ? { badge: 'bg-amber-100 text-amber-800', border: 'border-amber-200', bg: 'bg-amber-50/30', icon: 'warning' }
      : { badge: 'bg-slate-100 text-slate-700', border: 'border-slate-200', bg: 'bg-white', icon: 'info' }

  // override by type patterns when helpful
  if (t.includes('DECISION') || t.includes('APPROV') || t.includes('REJECT') || t.includes('ESCALATE')) {
    return { badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200', bg: 'bg-indigo-50/20', icon: 'fact_check' }
  }
  if (t.includes('PIPELINE') || t.includes('ORCHESTR') || t.includes('STARTED') || t.includes('COMPLETED') || t.includes('DONE')) {
    return { badge: bySev.badge, border: bySev.border, bg: bySev.bg, icon: 'schema' }
  }
  if (t.includes('DISCOVERY') || t.includes('VECTOR') || t.includes('RELATIONAL')) {
    return { badge: 'bg-cyan-100 text-cyan-700', border: 'border-cyan-200', bg: 'bg-cyan-50/20', icon: 'travel_explore' }
  }
  if (t.includes('CONTRACT') || t.includes('BASELINE') || t.includes('PRICE')) {
    return { badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50/20', icon: 'receipt_long' }
  }
  if (t.includes('TRANSACTION') || t.includes('SEEDED') || t.includes('LEDGER')) {
    return { badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50/20', icon: 'account_tree' }
  }

  return bySev
}

function pickMetaKV(e: AuditTimelineEvent): AuditMetaKV[] {
  const m = e.meta || {}
  const kv: AuditMetaKV[] = []

  // high-signal keys (common)
  const push = (key: string, value: any, mono = false, highlight = false) => {
    if (value == null) return
    const s = safeString(value)
    if (!s || s === '-' || s === 'null') return
    kv.push({ key, value: s, mono, highlight })
  }

  // Top-level useful fields in meta
  push('domain', m.domain, true)
  push('policy_id', m.policy_id, true)
  push('policy_version', m.policy_version, true)
  push('reference_id', m.reference_id, true)
  push('reference_type', m.reference_type, true)

  push('run_id', m.run_id ?? e.run_id, true)
  push('group_id', m.group_id ?? e.group_id, true)

  // procurement flow / ledger
  push('transaction_id', m.transaction_id, true)
  push('aggregate_type', m.aggregate_type, true)
  push('aggregate_key', m.aggregate_key, true)
  push('ledger_lines', m.ledger_lines, false)

  // discovery
  push('hits', m.hits, false)
  push('inserted', m.inserted, false)
  push('total_links', m.total_links, false)
  push('min_similarity', m.min_similarity, false)
  push('ref_dt', m.ref_dt, true)
  push('counterparty_id', m.counterparty_id, true)
  push('counterparty_name', m.counterparty_name, false)

  // contract resolve
  push('line_count', m.line_count, false)
  push('document_link_count', m.document_link_count, false)
  push('eligible_contract_count', m.eligible_contract_count, false)
  push('total_prices_loaded', m.total_prices_loaded, false)
  push('mapping_count', m.mapping_count, false)
  push('elapsed_ms', m.elapsed_ms, false, m.elapsed_ms != null && Number(m.elapsed_ms) > 1500)

  // decision summary
  push('decision', m.decision, true, String(m.decision || '').toUpperCase() !== 'PASS')
  push('risk_level', m.risk_level, true, String(m.risk_level || '').toUpperCase().includes('MED') || String(m.risk_level || '').toUpperCase().includes('HIGH'))
  push('confidence', m.confidence, false)

  // baseline
  if (m.baseline?.value != null) push('baseline.value', m.baseline.value, false)
  if (m.baseline?.currency != null) push('baseline.currency', m.baseline.currency, true)
  if (m.baseline_source?.method) push('baseline_source.method', m.baseline_source.method, true)
  if (m.technique) push('technique', m.technique, true)

  // limit kv size (rest goes to raw json)
  return kv.slice(0, 14)
}

function isMetaLarge(meta: any) {
  if (!meta) return false
  try {
    const s = JSON.stringify(meta)
    return s.length > 900
  } catch {
    return true
  }
}

function makeUi(e: AuditTimelineEvent): AuditEventUi {
  const cls = classify(e)
  const titleText = e.title || e.type
  const subtitleBits: string[] = []

  if (e.run_id) subtitleBits.push(`run: ${e.run_id}`)
  if (e.group_id) subtitleBits.push(`group: ${e.group_id}`)
  if (e.actor) subtitleBits.push(e.actor)

  const metaKv = pickMetaKV(e)

  let pretty = ''
  try {
    pretty = JSON.stringify(e.meta || {}, null, 2)
  } catch {
    pretty = safeString(e.meta)
  }

  return {
    ...e,
    ts_ms: new Date(e.timestamp).getTime(),
    dateKey: toLocalDateKey(e.timestamp),
    icon: cls.icon,
    badgeClass: cls.badge,
    borderClass: cls.border,
    bgClass: cls.bg,
    titleText,
    subtitleText: subtitleBits.join(' · '),
    meta_kv: metaKv,
    meta_is_large: isMetaLarge(e.meta),
    meta_json_pretty: pretty,
  }
}

export const useAuditTimelineStore = defineStore('auditTimeline', () => {
  const caseId = ref<string>('')
  const loading = ref(false)
  const error = ref<string>('')

  const raw = ref<AuditTimelineResponse | null>(null)
  const events = ref<AuditEventUi[]>([])

  const expanded = ref<Set<string>>(new Set())
  const showRaw = ref<Set<string>>(new Set())

  // filters
  const q = ref('')
  const severity = ref<'ALL' | AuditSeverity>('ALL')
  const type = ref<'ALL' | string>('ALL')
  const actor = ref<'ALL' | string>('ALL')
  const runId = ref<'ALL' | string>('ALL')

  const typeOptions = computed(() => {
    const set = new Set<string>()
    for (const e of events.value) set.add(e.type)
    return ['ALL', ...Array.from(set).sort()]
  })

  const actorOptions = computed(() => {
    const set = new Set<string>()
    for (const e of events.value) set.add(e.actor || 'SYSTEM')
    return ['ALL', ...Array.from(set).sort()]
  })

  const runOptions = computed(() => {
    const set = new Set<string>()
    for (const e of events.value) if (e.run_id) set.add(e.run_id)
    return ['ALL', ...Array.from(set).sort()]
  })

  const filtered = computed(() => {
    const query = q.value.trim().toLowerCase()

    return events.value
      .filter(e => {
        if (severity.value !== 'ALL' && String(e.severity).toUpperCase() !== String(severity.value).toUpperCase()) return false
        if (type.value !== 'ALL' && e.type !== type.value) return false
        if (actor.value !== 'ALL' && (e.actor || 'SYSTEM') !== actor.value) return false
        if (runId.value !== 'ALL' && (e.run_id || '-') !== runId.value) return false

        if (!query) return true
        const hay = [
          e.type,
          e.title,
          e.actor,
          e.severity,
          e.run_id,
          e.group_id,
          JSON.stringify(e.meta || {}),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(query)
      })
      .sort((a, b) => b.ts_ms - a.ts_ms)
  })

  const groupedByDate = computed(() => {
    const map = new Map<string, AuditEventUi[]>()
    for (const e of filtered.value) {
      const k = e.dateKey
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    // keep date order desc
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1))
    return keys.map(k => ({ dateKey: k, events: map.get(k)! }))
  })

  function toggleExpanded(id: string) {
    const set = new Set(expanded.value)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    expanded.value = set
  }

  function toggleRaw(id: string) {
    const set = new Set(showRaw.value)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    showRaw.value = set
  }

  function isExpanded(id: string) {
    return expanded.value.has(id)
  }

  function isRawShown(id: string) {
    return showRaw.value.has(id)
  }

  async function load(id: string) {
    if (!id) return
    caseId.value = id
    loading.value = true
    error.value = ''

    try {
      const res = await auditApi.getAuditTimeline(id)
      raw.value = res
      events.value = (res.events || []).map(makeUi).sort((a, b) => b.ts_ms - a.ts_ms)

      // reset expansions on reload
      expanded.value = new Set()
      showRaw.value = new Set()

      // reset dropdown values if current selection no longer exists
      if (type.value !== 'ALL' && !events.value.some(e => e.type === type.value)) type.value = 'ALL'
      if (actor.value !== 'ALL' && !events.value.some(e => (e.actor || 'SYSTEM') === actor.value)) actor.value = 'ALL'
      if (runId.value !== 'ALL' && !events.value.some(e => (e.run_id || '-') === runId.value)) runId.value = 'ALL'
    } catch (e: any) {
      console.error('Load audit timeline failed', e)
      error.value = e?.message ? String(e.message) : 'Failed to load audit timeline'
      raw.value = null
      events.value = []
    } finally {
      loading.value = false
    }
  }

  const kpi = computed(() => {
    const list = filtered.value
    const total = list.length
    const critical = list.filter(x => String(x.severity).toUpperCase() === 'CRITICAL').length
    const errorC = list.filter(x => String(x.severity).toUpperCase() === 'ERROR').length
    const warn = list.filter(x => String(x.severity).toUpperCase() === 'WARN').length
    const info = total - critical - errorC - warn
    return { total, critical, error: errorC, warn, info }
  })

  return {
    caseId,
    loading,
    error,

    raw,
    events,

    // filters
    q,
    severity,
    type,
    actor,
    runId,
    typeOptions,
    actorOptions,
    runOptions,

    filtered,
    groupedByDate,
    kpi,

    toggleExpanded,
    toggleRaw,
    isExpanded,
    isRawShown,

    load,
    formatTs,
  }
})