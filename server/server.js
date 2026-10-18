require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const menuRoutes = require("./modules/menu/menuRoutes");
const tableRoutes = require("./modules/tables/tableRoutes");
const reservationRoutes = require("./modules/reservations/reservationRoutes");
const orderRoutes = require("./modules/orders/orderRoutes");

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




const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`ANOVA server running on port ${PORT}`);
  });
};

startServer();
