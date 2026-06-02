import cron from 'node-cron';
import { taskService } from '../services/task.service';

export function startRecurringTasksJob(): void {
  // Every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[RecurringTasks] Generating instances…');
    try {
      const n = await taskService.generateRecurringTasks();
      console.log(`[RecurringTasks] Created ${n} tasks`);
    } catch (err) {
      console.error('[RecurringTasks] Error:', err);
    }
  });
}
