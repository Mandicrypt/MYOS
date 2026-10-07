import type { AppState } from '@/types'
import { repairReferences } from './repair'

type Versioned = { id: string; updatedAt?: string; createdAt?: string }

const stamp = (x: Versioned) => x.updatedAt ?? x.createdAt ?? ''

/**
 * Combines this device's records with the cloud's.
 *
 * `base` is what the cloud held at the last successful sync. It tells a
 * deletion apart from a record that is simply new:
 * - in both: the newer updatedAt wins (ties keep the cloud's)
 * - only in the cloud: new from another device, unless this device deleted it since `base`
 * - only here: new on this device, unless another device deleted it since `base`
 *   (an edit made here after that point is kept rather than lost)
 */
function mergeList<T extends Versioned>(local: T[], cloud: T[], base: T[] | null): T[] {
  const l = new Map(local.map((x) => [x.id, x]))
  const c = new Map(cloud.map((x) => [x.id, x]))
  const b = new Map((base ?? []).map((x) => [x.id, x]))
  const out: T[] = []
  const seen = new Set<string>()

  // Keep this device's order, then add records new from the cloud.
  for (const item of local) {
    seen.add(item.id)
    const remote = c.get(item.id)
    if (remote) {
      out.push(stamp(item) > stamp(remote) ? item : remote)
    } else {
      const known = b.get(item.id)
      const deletedElsewhere = known !== undefined && stamp(item) <= stamp(known)
      if (!deletedElsewhere) out.push(item)
    }
  }
  for (const item of cloud) {
    if (seen.has(item.id)) continue
    const deletedHere = b.has(item.id) && !l.has(item.id)
    if (!deletedHere) out.push(item)
  }
  return out
}

/** History logs: everything from both sides, each event once, in time order. */
function unionLog<T extends { id: string; at: string }>(local: T[], cloud: T[]): T[] {
  const byId = new Map<string, T>()
  for (const e of cloud) byId.set(e.id, e)
  for (const e of local) if (!byId.has(e.id)) byId.set(e.id, e)
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at))
}

export function mergeStates(local: AppState, cloud: AppState, base: AppState | null): AppState {
  const settings = (local.settings.updatedAt ?? '') > (cloud.settings.updatedAt ?? '') ? local.settings : cloud.settings
  return repairReferences({
    ...local,
    goals: mergeList(local.goals, cloud.goals, base?.goals ?? null),
    projects: mergeList(local.projects, cloud.projects, base?.projects ?? null),
    milestones: mergeList(local.milestones, cloud.milestones, base?.milestones ?? null),
    tasks: mergeList(local.tasks, cloud.tasks, base?.tasks ?? null),
    inbox: mergeList(local.inbox, cloud.inbox, base?.inbox ?? null).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
    notes: mergeList(local.notes, cloud.notes, base?.notes ?? null),
    workEvents: unionLog(local.workEvents, cloud.workEvents),
    events: unionLog(local.events, cloud.events),
    settings,
  })
}
