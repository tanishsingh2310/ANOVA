// ============================================================
// ANOVA CANONICAL UNIT CONVERSION & PRECISION UTILITY (SERVER)
// ============================================================

const UNIT_DIMENSIONS = {
  kg: { dimension: 'WEIGHT', toBase: 1 },
  g: { dimension: 'WEIGHT', toBase: 0.001 },
  mg: { dimension: 'WEIGHT', toBase: 0.000001 },

  L: { dimension: 'VOLUME', toBase: 1 },
  ml: { dimension: 'VOLUME', toBase: 0.001 },
  cl: { dimension: 'VOLUME', toBase: 0.01 },

  pcs: { dimension: 'COUNT', toBase: 1 },
  can: { dimension: 'COUNT', toBase: 1 },
  box: { dimension: 'COUNT', toBase: 1 },
  pack: { dimension: 'COUNT', toBase: 1 }
};

const UnitConversion = {
  areCompatible(fromUnit, toUnit) {
    if (fromUnit === toUnit) return true;
    const fromDef = UNIT_DIMENSIONS[fromUnit];
    const toDef = UNIT_DIMENSIONS[toUnit];
    if (!fromDef || !toDef) return false;
    return fromDef.dimension === toDef.dimension;
  },

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

    const baseValue = qty * fromDef.toBase;
    const targetValue = baseValue / toDef.toBase;

    return this.roundQuantity(targetValue);
  },

  roundQuantity(qty, decimals = 3) {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(qty) + Number.EPSILON) * factor) / factor;
  },

  roundCurrency(amount) {
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  }
};

module.exports = {
  UNIT_DIMENSIONS,
  UnitConversion
};
