/**
 * Activity score rules. Every number lives here; nothing else decides points.
 * Change a value here and the whole app (and its checks) follow.
 */
export const ACTIVITY_RULES = {
  points: {
    task: 10,
    /** High-impact or explicitly important work. */
    highPriorityTask: 15,
    /** Small, low-impact tasks still count, but less. */
    trivialTask: 5,
    milestone: 30,
    focusSession: 5,
    dailyPlanComplete: 10,
    dailyStreak: 10,
    weeklyReview: 25,
  },
  limits: {
    /** A task must exist this long before completing it earns points (stops create-and-tick farming). */
    minTaskAgeMinutes: 10,
    /** Small tasks that earn points per day; more earn nothing. */
    trivialTasksPerDay: 3,
    /** Most points from completed tasks in one day. */
    taskPointsPerDay: 120,
    /** A focus session must last this long to count. */
    minFocusMinutes: 15,
    focusSessionsPerDay: 4,
    /** A milestone needs at least this many tasks to earn its bonus. */
    minMilestoneTasks: 2,
    /**
     * Events the server received more than this long after the time they claim
     * earn nothing (stops backdating; still allows working offline for a while).
     */
    maxBackdateHours: 48,
    /** Most points of any kind in one day. */
    pointsPerDay: 220,
  },
} as const

export type ActivityRules = typeof ACTIVITY_RULES
