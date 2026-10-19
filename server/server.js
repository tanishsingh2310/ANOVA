require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const menuRoutes = require("./src/routes/menuRoutes");
const tableRoutes = require("./src/routes/tableRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "ANOVA backend is running!",
  });
});



// Menu management API
app.use("/api/menu", menuRoutes);
// Table management API
app.use("/api/tables", tableRoutes);
// Reservations API
app.use("/api/reservations", reservationRoutes);
// Orders API
app.use("/api/orders", orderRoutes);
// Billing & Payments API
app.use("/api/payments", paymentRoutes);




const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`ANOVA server running on port ${PORT}`);
  });
};

startServer();
