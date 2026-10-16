
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "System",
    },
    actorRole: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "system",
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    resourceId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
