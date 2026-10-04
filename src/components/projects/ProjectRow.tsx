import { Link } from 'react-router-dom'
import { nextTaskForProject } from '@/store/selectors'
import { useStore } from '@/store/store'
import type { Project } from '@/types'

export function ProjectRow({ project }: { project: Project }) {
  const { state, today } = useStore()
  const next = project.status === 'active' ? nextTaskForProject(state, project.id, today) : null
  return (
    <li>
      <Link
        to={`/projects/${project.id}`}
        className="block rounded-lg py-5 transition-colors hover:bg-hover md:-mx-3 md:px-3"
      >
        <span className="block text-md font-medium">{project.title}</span>
        {project.summary ? <span className="mt-0.5 block text-base text-muted">{project.summary}</span> : null}
        {next ? <span className="mt-3 block text-sm text-muted">Next: {next.title}</span> : null}
      </Link>
    </li>
  )
}
