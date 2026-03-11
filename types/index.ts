export type MemberRole = 'admin' | 'operator' | 'viewer';

export type HistoryEventType =
  | 'step_change'
  | 'comment'
  | 'assignment'
  | 'priority_change'
  | 'due_date_change';

export type HistoryPayload =
  | { type: 'step_change'; fromStep?: string; toStep: string }
  | { type: 'comment'; text: string }
  | { type: 'assignment'; fromMember?: string; toMember?: string }
  | { type: 'priority_change'; from: number; to: number }
  | { type: 'due_date_change'; from?: string; to?: string };

export interface Team {
  slug: string;
  name: string;
  accentColor: string;
  template: string;
  hasPassword: boolean;
  folderCount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamSlug: string;
  name: string;
  role: MemberRole;
  canComment: boolean;
  createdAt: string;
}

export interface WorkflowStep {
  id: string;
  teamSlug: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface Folder {
  id: string;
  ref: string;
  teamSlug: string;
  title: string;
  assigneeId?: string;
  assigneeName?: string;
  stepId?: string;
  stepName?: string;
  stepColor?: string;
  priority: number;
  tags: string[];
  description?: string;
  dueDate?: string;
  archived: boolean;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  hasUnread?: boolean;
}

export interface FolderComment {
  id: string;
  folderId: string;
  authorId?: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface FolderHistoryEntry {
  id: string;
  folderId: string;
  actorName: string;
  type: HistoryEventType;
  payload: HistoryPayload;
  createdAt: string;
}

export interface TeamSession {
  memberId: string;
  memberName: string;
  role: MemberRole;
  canComment: boolean;
  teamSlug: string;
}
