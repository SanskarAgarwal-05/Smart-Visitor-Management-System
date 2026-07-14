const path = require("path");

console.log("NEW SERVER FILE LOADED - CORS VERSION");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

console.log("ENV CHECK:", process.env.MONGODB_URI);
console.log("CORS CHECK:", process.env.CORS_ORIGIN);

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const visitorRoutes = require("./routes/visitorRoutes");

const app = express();


// =======================
// CORS CONFIGURATION
// =======================

const allowedOrigins = [
  "http://localhost:5173",
  "https://smart-visitor-management-system-psi.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {

    // Allow requests from tools like Thunder Client/Postman
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


// =======================
// BODY PARSER
// =======================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));


// =======================
// ROUTES
// =======================

app.use("/api/admin", adminRoutes);
app.use("/api/visitor", visitorRoutes);


// =======================
// TEST ROUTE
// =======================

app.get("/", (req, res) => {
  res.send("Server Running");
});


// =======================
// GLOBAL ERROR HANDLER
// =======================

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});


// =======================
// SERVER START
// =======================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();