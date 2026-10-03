import app from './app';
import connectDB from './config/db';
import { subscriptionReminderService } from './services/subscriptionReminder.service';

const PORT = process.env.PORT || 5001;

// Connect to Database
connectDB();

// Start subscription 3-day due reminder background scheduler
subscriptionReminderService.startSubscriptionReminderScheduler();

app.listen(PORT, () => {
  console.log(`🚀 ResolveBridge Backend running on http://localhost:${PORT}`);
});
