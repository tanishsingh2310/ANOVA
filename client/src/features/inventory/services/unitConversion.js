// ============================================================
// ANOVA CANONICAL UNIT CONVERSION & PRECISION UTILITY
// Enforces:
// 1. Valid conversions within physical dimensions (Weight, Volume, Count)
// 2. Strict rejection of incompatible unit conversions
// 3. 3-decimal precision for quantities and 2-decimal precision for monetary values
// ============================================================

export const UNIT_DIMENSIONS = {
  // Weight dimension (Base unit: kg)
  kg: { dimension: 'WEIGHT', toBase: 1 },
  g: { dimension: 'WEIGHT', toBase: 0.001 },
  mg: { dimension: 'WEIGHT', toBase: 0.000001 },

  // Volume dimension (Base unit: L)
  L: { dimension: 'VOLUME', toBase: 1 },
  ml: { dimension: 'VOLUME', toBase: 0.001 },
  cl: { dimension: 'VOLUME', toBase: 0.01 },

  // Count dimension (Discrete units)
  pcs: { dimension: 'COUNT', toBase: 1 },
  can: { dimension: 'COUNT', toBase: 1 },
  box: { dimension: 'COUNT', toBase: 1 },
  pack: { dimension: 'COUNT', toBase: 1 }
};

export const UnitConversion = {
  // Check if two units are dimensionally compatible
  areCompatible(fromUnit, toUnit) {
    if (fromUnit === toUnit) return true;
    const fromDef = UNIT_DIMENSIONS[fromUnit];
    const toDef = UNIT_DIMENSIONS[toUnit];
    if (!fromDef || !toDef) return false;
    return fromDef.dimension === toDef.dimension;
  },

  // Convert quantity between units
  convert(quantity, fromUnit, toUnit) {
    const qty = Number(quantity);
    if (isNaN(qty)) throw new Error(`Invalid quantity: ${quantity}`);
    if (fromUnit === toUnit) return this.roundQuantity(qty);

    const fromDef = UNIT_DIMENSIONS[fromUnit];
    const toDef = UNIT_DIMENSIONS[toUnit];

    if (!fromDef) throw new Error(`Unknown source unit: '${fromUnit}'`);
    if (!toDef) throw new Error(`Unknown target unit: '${toUnit}'`);

    if (fromDef.dimension !== toDef.dimension) {
      throw new Error(`Incompatible unit conversion: Cannot convert '${fromUnit}' (${fromDef.dimension}) to '${toUnit}' (${toDef.dimension}).`);
    }

    // Convert from source to base, then base to target
    const baseValue = qty * fromDef.toBase;
    const targetValue = baseValue / toDef.toBase;

    return this.roundQuantity(targetValue);
  },

  // 3-decimal precision for ingredient quantities
  roundQuantity(qty, decimals = 3) {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(qty) + Number.EPSILON) * factor) / factor;
  },

  // 2-decimal precision for monetary values (paise / cents)
  roundCurrency(amount) {
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  },

  // Format currency with symbol
  formatCurrency(amount, currency = '₹') {
    const rounded = this.roundCurrency(amount);
    return `${currency}${rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};
