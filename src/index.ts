import app from './app';
import connectDB from './config/db';

const PORT = process.env.PORT || 5001;

// Connect to Database
connectDB();

app.listen(PORT, () => {
  console.log(`🚀 ResolveBridge Backend running on http://localhost:${PORT}`);
});
