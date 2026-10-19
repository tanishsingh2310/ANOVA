
const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    breakMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 240,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

shiftSchema.index({
  branch: 1,
  startTime: 1,
  status: 1,
});

shiftSchema.index({
  employee: 1,
  startTime: 1,
});

shiftSchema.pre("validate", function () {
  if (
    this.startTime &&
    this.endTime &&
    this.endTime <= this.startTime
  ) {
    this.invalidate(
      "endTime",
      "Shift end time must be after start time."
    );
  }

  if (
    this.startTime &&
    this.endTime &&
    this.endTime > this.startTime
  ) {
    const durationMinutes =
      (this.endTime.getTime() - this.startTime.getTime()) /
      60000;

    if (this.breakMinutes > durationMinutes) {
      this.invalidate(
        "breakMinutes",
        "Break duration cannot exceed shift duration."
      );
    }
  }
});

module.exports = mongoose.model("Shift", shiftSchema);
