import { z } from 'zod';

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug invalide (lettres minuscules, chiffres, tirets)'),
  template: z.enum(['juridique', 'dev', 'compta', 'rh', 'custom']),
  password: z.string().min(3).max(100).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  adminName: z.string().min(1).max(80),
});

export const TeamAuthSchema = z.object({
  password: z.string().optional(),
  memberName: z.string().min(1).max(80),
});

export const CreateFolderSchema = z.object({
  title: z.string().min(1).max(200),
  assigneeId: z.string().uuid().optional(),
  stepId: z.string().uuid().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  description: z.string().max(5000).optional(),
  dueDate: z.string().optional(),
});

export const UpdateFolderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  stepId: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  description: z.string().max(5000).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});

export const AddCommentSchema = z.object({
  text: z.string().min(1).max(3000),
});

export const CreateMemberSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
  canComment: z.boolean().optional(),
});

export const UpdateMemberSchema = z.object({
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
  canComment: z.boolean().optional(),
  name: z.string().min(1).max(80).optional(),
});

export const CreateStepSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sortOrder: z.number().int().min(0),
});

export const UpdateStepSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  password: z.string().min(3).max(100).nullable().optional(),
});
