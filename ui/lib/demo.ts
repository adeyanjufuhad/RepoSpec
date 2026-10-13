import { extractSnapshot } from '../../src/snapshot';
export const demoSnapshot = extractSnapshot([
  { path: 'prisma/schema.prisma', content: 'model Project {\n id String @id\n name String\n ownerId String\n tasks Task[]\n}\nmodel Task {\n id String @id\n title String\n projectId String\n project Project @relation(fields: [projectId], references: [id])\n}' },
  { path: 'src/app/api/projects/[id]/route.ts', content: 'export async function GET(): Promise<ProjectWithTasks> { throw new Error("fixture"); }\nexport async function PATCH(request: Request): Promise<Project> { const input: UpdateProject = await request.json(); throw new Error("fixture"); }' },
  { path: 'src/types/project.ts', content: 'export interface Project { id: string; name: string; ownerId: string }\nexport type UpdateProject = Pick<Project, "name">;\nexport interface ProjectWithTasks extends Project { tasks: { id: string; title: string }[] }' },
  { path: '.repospec/rules.md', content: '- All database access uses the shared database client.\n- Client components must not import server data access.' },
]);
