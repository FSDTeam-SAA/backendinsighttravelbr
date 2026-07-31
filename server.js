import 'dotenv/config';
import { createServer } from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { initSocket } from './src/sockets/index.js';
import { initTripStatusJob } from './src/jobs/tripStatus.job.js';

const PORT = process.env.PORT || 5000;

// process.on('uncaughtException', (err) => {
//   console.error('Uncaught Exception:', err.message);
//   process.exit(1);
// });

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection full error:");
  console.error(reason);

  server.close(() => {
    process.exit(1);
  });
});

const httpServer = createServer(app);

const io = initSocket(httpServer);
app.set('io', io); // accessible in controllers via req.app.get('io')

connectDB().then(() => {
  initTripStatusJob();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  httpServer.close(() => process.exit(1));
});
