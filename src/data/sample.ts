import { addDays, todayISO } from '@/lib/dates'
import type { AppState, ImportanceSignals, Task } from '@/types'

/** Builds believable sample data with dates relative to today, so it never looks stale. */
export function buildSampleState(): AppState {
  const today = todayISO()
  const day = (n: number) => addDays(today, n)
  const ago = (days: number, hour = 15) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }
  const created = ago(10, 9)

  const sig = (
    impact: ImportanceSignals['impact'],
    consequence: ImportanceSignals['consequence'],
    userImportance: ImportanceSignals['userImportance'] = 'normal',
  ): ImportanceSignals => ({ impact, consequence, userImportance })

  const task = (t: Partial<Task> & Pick<Task, 'id' | 'title' | 'signals'>): Task => ({
    description: undefined,
    status: 'open',
    projectId: null,
    goalId: null,
    milestoneId: null,
    plannedFor: null,
    dueOn: null,
    effortMinutes: null,
    dependsOn: [],
    checklist: [],
    links: [],
    noteIds: [],
    createdAt: created,
    completedAt: null,
    suppressed: false,
    postponeCount: 0,
    origin: 'sample',
    parentId: null,
    ...t,
  })

  return {
    version: 2,
    settings: { name: 'Izuchukwu', showMeaningfulWork: true, theme: 'system' },
    goals: [
      {
        id: 'g-mvp',
        title: 'Launch MYOS MVP',
        why: 'One calm place to run everything — and a product other people can use too.',
        status: 'active',
        createdAt: created,
      },
      {
        id: 'g-income',
        title: 'Grow income',
        why: 'More room to choose the work I take on.',
        status: 'active',
        createdAt: created,
      },
      {
        id: 'g-skills',
        title: 'Improve technical skills',
        why: 'Build my own ideas without waiting on someone else.',
        status: 'active',
        createdAt: created,
      },
    ],
    projects: [
      {
        id: 'p-myos',
        title: 'MYOS',
        summary: 'Build the personal operating system',
        goalId: 'g-mvp',
        status: 'active',
        deadline: day(30),
        createdAt: created,
      },
      {
        id: 'p-monad',
        title: 'Monad Launcher',
        summary: 'Hackathon project',
        goalId: 'g-income',
        status: 'active',
        deadline: day(14),
        createdAt: created,
      },
      {
        id: 'p-mandi',
        title: 'MandiCrypt',
        summary: 'Community relaunch',
        goalId: 'g-income',
        status: 'active',
        deadline: null,
        createdAt: created,
      },
    ],
    milestones: [
      { id: 'm-blueprint', projectId: 'p-myos', title: 'Product blueprint', dueOn: today, done: false },
      { id: 'm-prototype', projectId: 'p-myos', title: 'Working prototype', dueOn: day(12), done: false },
      { id: 'm-mvp', projectId: 'p-myos', title: 'MVP live', dueOn: day(30), done: false },
      { id: 'm-submit', projectId: 'p-monad', title: 'Submit hackathon entry', dueOn: day(14), done: false },
      { id: 'm-relaunch', projectId: 'p-mandi', title: 'Relaunch announcement', dueOn: day(6), done: false },
    ],
    tasks: [
      task({
        id: 't-blueprint',
        title: 'Finish MYOS product blueprint',
        description: 'Write down how MYOS works end to end, so building the next phase is straightforward.',
        projectId: 'p-myos',
        milestoneId: 'm-blueprint',
        plannedFor: today,
        dueOn: today,
        effortMinutes: 90,
        signals: sig(5, 4),
        checklist: [
          { id: 'c1', text: 'Describe the core loop in one page', done: true },
          { id: 'c2', text: 'List the screens for Phase 1', done: false },
          { id: 'c3', text: 'Write the importance rules in plain words', done: false },
          { id: 'c4', text: 'Share with one person for feedback', done: false },
        ],
        noteIds: ['n-principles'],
        outcome: 'A blueprint the build can follow',
      }),
      task({
        id: 't-ux',
        title: 'Review dashboard UX',
        projectId: 'p-myos',
        plannedFor: today,
        effortMinutes: 45,
        signals: sig(3, 2),
        description: 'Walk through Home and Focus on a phone. Note anything that adds noise.',
      }),
      task({
        id: 't-learn',
        title: '30 minutes of technical learning',
        goalId: 'g-skills',
        plannedFor: today,
        effortMinutes: 30,
        signals: sig(2, 1),
        description: 'Continue the TypeScript basics course where you left off.',
        links: [{ label: 'TypeScript handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' }],
      }),
      task({
        id: 't-model',
        title: 'Implement task model',
        projectId: 'p-myos',
        milestoneId: 'm-prototype',
        plannedFor: day(1),
        effortMinutes: 120,
        signals: sig(4, 3),
        dependsOn: ['t-blueprint'],
      }),
      task({
        id: 't-monad-req',
        title: 'Research Monad requirements',
        projectId: 'p-monad',
        milestoneId: 'm-submit',
        plannedFor: day(1),
        dueOn: day(3),
        effortMinutes: 60,
        signals: sig(4, 3),
        noteIds: ['n-monad'],
      }),
      task({
        id: 't-onboarding',
        title: 'Plan the onboarding flow',
        projectId: 'p-myos',
        milestoneId: 'm-prototype',
        effortMinutes: 60,
        signals: sig(4, 2),
        dependsOn: ['t-blueprint'],
      }),
      task({
        id: 't-outreach',
        title: 'Prepare project outreach',
        projectId: 'p-mandi',
        plannedFor: day(2),
        effortMinutes: 45,
        signals: sig(3, 2),
        postponeCount: 2,
      }),
      task({
        id: 't-tidy',
        title: 'Tidy up the downloads folder',
        plannedFor: today,
        effortMinutes: 10,
        signals: sig(1, 1),
      }),
      task({
        id: 't-announce',
        title: 'Draft relaunch announcement',
        projectId: 'p-mandi',
        milestoneId: 'm-relaunch',
        dueOn: day(6),
        effortMinutes: 40,
        signals: sig(3, 3),
        waitingOn: 'New logo files from the designer',
      }),
      task({
        id: 't-devenv',
        title: 'Set up Monad dev environment',
        projectId: 'p-monad',
        effortMinutes: 60,
        signals: sig(3, 2),
      }),
      task({
        id: 't-pricing',
        title: 'Sketch MYOS pricing ideas',
        projectId: 'p-myos',
        effortMinutes: 30,
        signals: sig(2, 1, 'low'),
      }),

      // Finished recently — feeds the Weekly Review.
      task({
        id: 'd-problem',
        title: 'Write the MYOS problem statement',
        projectId: 'p-myos',
        status: 'done',
        completedAt: ago(4),
        signals: sig(4, 3),
      }),
      task({
        id: 'd-home',
        title: 'Sketch the Home screen',
        projectId: 'p-myos',
        status: 'done',
        completedAt: ago(2),
        signals: sig(4, 2),
      }),
      task({
        id: 'd-loop',
        title: 'Define the capture-to-focus loop',
        projectId: 'p-myos',
        status: 'done',
        completedAt: ago(1),
        signals: sig(5, 3),
      }),
      task({
        id: 'd-monad-docs',
        title: 'Read the Monad docs overview',
        projectId: 'p-monad',
        status: 'done',
        completedAt: ago(3),
        signals: sig(3, 2),
      }),
      task({
        id: 'd-mods',
        title: 'Reply to MandiCrypt moderators',
        projectId: 'p-mandi',
        status: 'done',
        completedAt: ago(1, 11),
        signals: sig(2, 2),
      }),
    ],
    inbox: [
      { id: 'i1', text: 'Research new exchange', createdAt: ago(0, 9) },
      { id: 'i2', text: 'Idea for MandiCrypt: weekly community AMA', createdAt: ago(1, 20) },
      { id: 'i3', text: 'Call John', createdAt: ago(1, 13) },
      { id: 'i4', text: 'Learn Rust', createdAt: ago(3) },
      { id: 'i5', text: 'Maybe start YouTube', createdAt: ago(5) },
    ],
    notes: [
      {
        id: 'n-principles',
        title: 'MYOS principles',
        body: 'MYOS should make life feel smaller when you open it.\n\nShow what deserves attention now, and hide the rest until it matters.\n\nThe user sees the conclusion, not the algorithm.\n\nReward meaningful progress, never busywork.',
        projectId: 'p-myos',
        updatedAt: ago(1, 10),
      },
      {
        id: 'n-monad',
        title: 'Monad hackathon notes',
        body: 'Entry needs a working demo, a short video and a public repo.\n\nJudges care about real use, not just a clean contract.\n\nAsk in Discord whether testnet deployment is enough.',
        projectId: 'p-monad',
        updatedAt: ago(3, 18),
      },
      {
        id: 'n-mandi',
        title: 'MandiCrypt relaunch ideas',
        body: 'Start with the people who stayed.\n\nWeekly AMA, one clear channel for updates, and a simple welcome for new members.',
        projectId: 'p-mandi',
        updatedAt: ago(5, 16),
      },
    ],
    workEvents: [
      { id: 'w1', taskId: 'd-problem', points: 23, at: ago(4), projectId: 'p-myos' },
      { id: 'w2', taskId: 'd-home', points: 18, at: ago(2), projectId: 'p-myos' },
      { id: 'w3', taskId: 'd-loop', points: 23, at: ago(1), projectId: 'p-myos' },
      { id: 'w4', taskId: 'd-monad-docs', points: 14, at: ago(3), projectId: 'p-monad' },
      { id: 'w5', taskId: 'd-mods', points: 10, at: ago(1, 11), projectId: 'p-mandi' },
    ],
    events: [],
  }
}
