import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { QuickAdd } from '@/components/layout/QuickAdd'
import { TaskEditor } from '@/components/tasks/TaskEditor'
import { WaitingDialog } from '@/components/tasks/WaitingDialog'
import { ToastProvider } from '@/components/ui/Toast'
import { FocusPage } from '@/pages/FocusPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { HomePage } from '@/pages/HomePage'
import { InboxPage } from '@/pages/InboxPage'
import { NoteEditorPage } from '@/pages/NoteEditorPage'
import { NotesPage } from '@/pages/NotesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TasksPage } from '@/pages/TasksPage'
import { AuthGate } from '@/account/AuthGate'
import { AuthProvider } from '@/auth/AuthProvider'
import { UiProvider } from './ui-context'

// HashRouter keeps every link working on any static host, with no server setup.
export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <ToastProvider>
          <HashRouter>
            <UiProvider>
              <Routes>
                <Route path="/focus" element={<FocusPage />} />
                <Route path="/focus/:taskId" element={<FocusPage />} />
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                  <Route path="goals" element={<GoalsPage />} />
                  <Route path="notes" element={<NotesPage />} />
                  <Route path="notes/:noteId" element={<NoteEditorPage />} />
                  <Route path="review" element={<ReviewPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
              <TaskEditor />
              <WaitingDialog />
              <QuickAdd />
            </UiProvider>
          </HashRouter>
        </ToastProvider>
      </AuthGate>
    </AuthProvider>
  )
}
