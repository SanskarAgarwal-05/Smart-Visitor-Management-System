const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

console.log("ENV CHECK:", process.env.MONGODB_URI);

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const visitorRoutes = require("./routes/visitorRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/visitor", visitorRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Server Running");
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();