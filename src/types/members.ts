import { GroupRole } from './database';

/** Member that can be invited (either real user or placeholder) */
export interface InvitableMember {
  id: string;
  type: 'user' | 'placeholder';
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  groupRole?: GroupRole;
}
