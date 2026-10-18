
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    shift: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Shift",
  default: null,
  index: true,
},
    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
      default: null,
    },
    breakMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 240,
    },
    status: {
      type: String,
      enum: ["present", "late", "absent", "half-day"],
      default: "present",
      index: true,
    },
    requiresReview: {
  type: Boolean,
  default: false,
  index: true,
},
reviewReason: {
  type: String,
  enum: [
    "no_scheduled_shift",
    "ambiguous_shift",
    "outside_shift_window",
    null,
  ],
  default: null,
},
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// One attendance record per employee per attendance date.
attendanceSchema.index(
  { employee: 1, attendanceDate: 1 },
  { unique: true }
);

attendanceSchema.index({ branch: 1, attendanceDate: 1, status: 1 });

attendanceSchema.pre("validate", function () {
  if (this.clockIn && this.clockOut && this.clockOut <= this.clockIn) {
    this.invalidate("clockOut", "Clock-out must be after clock-in.");
  }

  if (this.clockIn && this.clockOut && this.clockOut > this.clockIn) {
    const durationMinutes =
      (this.clockOut.getTime() - this.clockIn.getTime()) / 60000;

    if (this.breakMinutes > durationMinutes) {
      this.invalidate(
        "breakMinutes",
        "Break duration cannot exceed the attendance duration."
      );
    }
  }
});

module.exports = mongoose.model("Attendance", attendanceSchema);
