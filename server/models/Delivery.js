// models/Delivery.js
const deliverySchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  deliveryStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
    default: 'pending',
  },
  pickup: { lat: Number, lng: Number },       // branch location
  dropoff: { lat: Number, lng: Number },      // customer address
  route: [{ lat: Number, lng: Number }],      // simulated path
  currentIndex: { type: Number, default: 0 }, // position along route
  assignedAt: Date,
  deliveredAt: Date,
}, { timestamps: true });