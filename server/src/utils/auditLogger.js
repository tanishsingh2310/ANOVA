
const AuditLog = require("../models/AuditLog");

const SECRET_KEY_PATTERN =
  /password|token|secret|authorization|cookie|credential|api.?key/i;

function sanitizeDetails(value, depth = 0) {
  if (depth > 4) {
    return "[truncated]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => sanitizeDetails(item, depth + 1));
  }

  if (typeof value === "object") {
    const safe = {};

    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        continue;
      }

      safe[key] = sanitizeDetails(item, depth + 1);
    }

    return safe;
  }

  return undefined;
}

async function writeAuditLog({
  actor = null,
  action,
  resource,
  resourceId = "",
  branch = null,
  status = "success",
  details = {},
  ipAddress = "",
}) {
  try {
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: actor?.name || "System",
      actorRole: actor?.role || "system",
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : "",
      branch: branch || actor?.branch || null,
      status,
      details: sanitizeDetails(details) || {},
      ipAddress: typeof ipAddress === "string"
        ? ipAddress.slice(0, 100)
        : "",
    });

    return true;
  } catch (error) {
    console.error("Audit log write failed:", error.message);
    return false;
  }
}

module.exports = { writeAuditLog, sanitizeDetails };
