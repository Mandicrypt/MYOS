import type { Project } from '@/types'
import { ProjectRow } from './ProjectRow'

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <ul className="divide-y divide-line">
      {projects.map((p) => (
        <ProjectRow key={p.id} project={p} />
      ))}
    </ul>
  )
}
