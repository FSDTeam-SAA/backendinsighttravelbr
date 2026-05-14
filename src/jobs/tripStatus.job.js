import cron from 'node-cron';
import Trip from '../models/Trip.model.js';

export const initTripStatusJob = () => {
  // Runs every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await Trip.updateMany(
        {
          endDate: { $lt: new Date() },
          status: { $ne: 'End' },
        },
        { $set: { status: 'End' } }
      );
      console.log(`Trip status job ran — updated ${result.modifiedCount} trips`);
    } catch (err) {
      console.error('Trip status job error:', err.message);
    }
  });

  console.log('Trip status cron job initialized');
};
