import { useState, useCallback } from 'react';
import * as groupsRepo from '../repositories/groupsRepo';
import { useAuth } from '../contexts/AuthContext';

export interface UseGroupNotificationsResult {
  unreadGroups: Record<string, number>;
  pendingReminderGroups: Record<string, number>;
  refresh: () => Promise<void>;
}

export function useGroupNotifications(): UseGroupNotificationsResult {
  const { user } = useAuth();
  const [unreadGroups, setUnreadGroups] = useState<Record<string, number>>({});
  const [pendingReminderGroups, setPendingReminderGroups] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!user?.id) return;

    const [unreadRes, pendingRes] = await Promise.all([
      groupsRepo.getUnreadThreadGroups(user.id),
      groupsRepo.getPendingReminderGroups(user.id),
    ]);

    if (unreadRes.data) {
      const map: Record<string, number> = {};
      for (const row of unreadRes.data) {
        map[row.group_id] = row.unread_count;
      }
      setUnreadGroups(map);
    }

    if (pendingRes.data) {
      const map: Record<string, number> = {};
      for (const row of pendingRes.data) {
        map[row.group_id] = row.pending_count;
      }
      setPendingReminderGroups(map);
    }
  }, [user?.id]);

  return { unreadGroups, pendingReminderGroups, refresh };
}
