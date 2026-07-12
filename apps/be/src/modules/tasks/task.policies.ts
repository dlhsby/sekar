import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Task, TaskStatus } from './entities/task.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { VALID_TASK_ASSIGNMENTS } from '../users/constants/role-groups';

/**
 * Pure task authorization rules shared by TasksService and its sub-services.
 * Every function either returns silently or throws the same HTTP exception
 * the inline checks used to throw — no I/O, no mutation.
 */

const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
];

// Once an assignee has accepted, they co-own the roster; while merely
// `assigned` (not yet accepted) only the creator may shape it.
const ASSIGNEE_ACCEPTED_STATUSES: TaskStatus[] = [
  TaskStatus.ACCEPTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVISION_NEEDED,
];

// Sealed states — the task record is closed, no more roster changes.
const SEALED_STATUSES: TaskStatus[] = [
  TaskStatus.COMPLETED,
  TaskStatus.VERIFIED,
  TaskStatus.DECLINED,
];

/** Throw unless the user holds a role that can receive task assignments and is active. */
export function assertValidAssignee(user: User): void {
  if (!ASSIGNABLE_ROLES.includes(user.role)) {
    throw new BadRequestException(
      'Tasks can only be assigned to Satgas, Linmas, Korlap, or Kepala Rayon',
    );
  }
  if (!user.is_active) {
    throw new BadRequestException('Cannot assign task to inactive user');
  }
}

/** Throw unless the actor's role may assign tasks to the assignee's role. */
export function assertAssignmentHierarchy(actorRole: UserRole, assigneeRole: UserRole): void {
  const validAssignments = VALID_TASK_ASSIGNMENTS[actorRole];
  if (!validAssignments || !validAssignments.includes(assigneeRole)) {
    throw new ForbiddenException(
      `Users with role "${actorRole}" cannot assign tasks to users with role "${assigneeRole}"`,
    );
  }
}

/**
 * Throw unless the caller may edit visibility tags on the task.
 * Creator anytime (until sealed); assignee only after they've accepted.
 */
export function assertCanEditTags(task: Task, callerId: string, action: 'modify' | 'remove'): void {
  if (!canEditTags(task, callerId)) {
    throw new ForbiddenException(`Only the task creator or accepted assignee can ${action} tags`);
  }
  if (SEALED_STATUSES.includes(task.status)) {
    throw new BadRequestException(`Cannot modify tags on a task with status "${task.status}"`);
  }
}

function canEditTags(task: Task, callerId: string): boolean {
  if (task.created_by === callerId) return true;
  return task.assigned_to === callerId && ASSIGNEE_ACCEPTED_STATUSES.includes(task.status);
}

/**
 * Throw unless the user may read the task. staff_kecamatan is handled
 * separately (needs an async DB lookup); roles missing from the map
 * (top_management, admin_system, superadmin) have no restriction.
 */
export function assertTaskReadAccess(task: Task, user: User): void {
  const canRead = TASK_READ_RULES[user.role] ?? (() => true);
  if (!canRead(task, user)) {
    throw new ForbiddenException('You do not have access to this task');
  }
}

type ReadRule = (task: Task, user: User) => boolean;

const isTagged = (task: Task, userId: string): boolean =>
  task.tags?.some((t) => t.user_id === userId) ?? false;

const fieldWorkerCanRead: ReadRule = (task, user) =>
  task.assigned_to === user.id || task.created_by === user.id || isTagged(task, user.id);

const korlapCanRead: ReadRule = (task, user) =>
  task.location_id === user.location_id ||
  task.created_by === user.id ||
  task.assigned_to === user.id ||
  isTagged(task, user.id);

// May 11, 2026 — admin_data joined the rayon-scoped admin path (was falling
// through to "no restriction", which was incorrect).
const rayonAdminCanRead: ReadRule = (task, user) =>
  task.area?.rayon_id === user.rayon_id ||
  task.rayon_id === user.rayon_id ||
  task.created_by === user.id ||
  task.assigned_to === user.id;

const TASK_READ_RULES: Partial<Record<UserRole, ReadRule>> = {
  [UserRole.SATGAS]: fieldWorkerCanRead,
  [UserRole.LINMAS]: fieldWorkerCanRead,
  [UserRole.KORLAP]: korlapCanRead,
  [UserRole.KEPALA_RAYON]: rayonAdminCanRead,
  [UserRole.ADMIN_DATA]: rayonAdminCanRead,
};
