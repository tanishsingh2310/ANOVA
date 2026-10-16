const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const branchRoutes = require("./routes/branchRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({ message: "ANOVA API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`ANOVA server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
