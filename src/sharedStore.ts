"use client";
import { useState, useEffect } from 'react';
import * as activitiesService from './services/activitiesService';

// Re-export Activity type from services for backward compatibility
export type { Activity } from './services';

export function useSharedActivities() {
  const [activities, setActivities] = useState<activitiesService.Activity[]>([]);

  useEffect(() => {
    activitiesService.getActivities().then(setActivities);

    const handler = () => {
      activitiesService.getActivities().then(setActivities);
    };
    window.addEventListener('edugov_activities_updated', handler);
    return () => window.removeEventListener('edugov_activities_updated', handler);
  }, []);

  const addActivity = async (activity: activitiesService.Activity) => {
    await activitiesService.createActivity(activity);
    setActivities(await activitiesService.getActivities());
  };

  const updateActivity = async (id: string, changes: Partial<activitiesService.Activity>) => {
    await activitiesService.updateActivity(id, changes);
    setActivities(await activitiesService.getActivities());
  };

  const deleteActivity = async (id: string) => {
    await activitiesService.deleteActivity(id);
    setActivities(await activitiesService.getActivities());
  };

  return { activities, addActivity, updateActivity, deleteActivity };
}
