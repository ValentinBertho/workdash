import { NextRequest, NextResponse } from 'next/server';
import { getData, saveData, addChangelogEntries } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';
import { DashboardData, ChangelogEntry } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  'en-cours': 'En cours', 'a-deployer': 'À déployer',
  'ok': 'Terminé', 'bloque': 'Bloqué', 'a-cadrer': 'À cadrer',
};

function detectChanges(oldData: DashboardData, newData: DashboardData): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const now = new Date().toISOString();

  for (const newProject of newData.projects) {
    const oldProject = oldData.projects.find(p => p.id === newProject.id);

    if (!oldProject) {
      entries.push({
        id: crypto.randomUUID(),
        projectId: newProject.id,
        projectName: newProject.name,
        type: 'project_added',
        description: `Projet "${newProject.name}" créé`,
        createdAt: now,
        author: 'valentin',
      });
      continue;
    }

    // Progress change (significant = >= 5%)
    if (Math.abs(newProject.progress - oldProject.progress) >= 5) {
      entries.push({
        id: crypto.randomUUID(),
        projectId: newProject.id,
        projectName: newProject.name,
        type: 'progress_changed',
        description: `${newProject.name} : avancement ${oldProject.progress}% → ${newProject.progress}%`,
        from: `${oldProject.progress}%`,
        to: `${newProject.progress}%`,
        createdAt: now,
        author: 'valentin',
      });
    }

    // Status change
    if (newProject.status !== oldProject.status) {
      entries.push({
        id: crypto.randomUUID(),
        projectId: newProject.id,
        projectName: newProject.name,
        type: 'status_changed',
        description: `${newProject.name} : ${STATUS_LABELS[oldProject.status]} → ${STATUS_LABELS[newProject.status]}`,
        from: oldProject.status,
        to: newProject.status,
        createdAt: now,
        author: 'valentin',
      });
    }

    // Task completions
    for (const newTask of newProject.tasks) {
      const oldTask = oldProject.tasks.find(t => t.id === newTask.id);
      if (oldTask && !oldTask.done && newTask.done) {
        entries.push({
          id: crypto.randomUUID(),
          projectId: newProject.id,
          projectName: newProject.name,
          type: 'task_completed',
          description: `[${newProject.name}] ✅ "${newTask.label}"`,
          createdAt: now,
          author: 'valentin',
        });
      }
    }
  }

  // Todo completions
  for (const newTodo of newData.weeklyTodos) {
    const oldTodo = oldData.weeklyTodos.find(t => t.id === newTodo.id);
    if (oldTodo && !oldTodo.done && newTodo.done) {
      entries.push({
        id: crypto.randomUUID(),
        type: 'todo_completed',
        description: `Quête complétée : "${newTodo.label}"`,
        createdAt: now,
        author: 'valentin',
      });
    }
  }

  return entries;
}

export async function GET() {
  const data = await getData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const oldData = await getData();
  const changes = detectChanges(oldData, body);

  await saveData(body);
  if (changes.length > 0) await addChangelogEntries(changes);

  return NextResponse.json({ ok: true, changes: changes.length });
}
