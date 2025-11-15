/**
 * Utilities for handling number inputs with better UX
 * Allows users to clear fields and type partial values like "." or "-"
 */

export interface NumberInputConfig {
  min?: number;
  max?: number;
  defaultValue: number;
  allowDecimals?: boolean;
}

/**
 * Parse a string value to integer with defaults and bounds
 */
export function parseIntWithDefault(
  value: string,
  config: NumberInputConfig
): number {
  // Empty string returns default
  if (value === '' || value === null || value === undefined) {
    return config.defaultValue;
  }

  const parsed = parseInt(value, 10);
  
  // NaN returns default
  if (isNaN(parsed)) {
    return config.defaultValue;
  }

  // Clamp to min/max if provided
  let result = parsed;
  if (config.min !== undefined && result < config.min) {
    result = config.min;
  }
  if (config.max !== undefined && result > config.max) {
    result = config.max;
  }

  return result;
}

/**
 * Parse a string value to float with defaults and bounds
 */
export function parseFloatWithDefault(
  value: string,
  config: NumberInputConfig
): number {
  // Empty string returns default
  if (value === '' || value === null || value === undefined) {
    return config.defaultValue;
  }

  const parsed = parseFloat(value);
  
  // NaN returns default
  if (isNaN(parsed)) {
    return config.defaultValue;
  }

  // Clamp to min/max if provided
  let result = parsed;
  if (config.min !== undefined && result < config.min) {
    result = config.min;
  }
  if (config.max !== undefined && result > config.max) {
    result = config.max;
  }

  return result;
}

/**
 * Create an onChange handler that allows partial input
 * Stores the raw string value in state
 */
export function createNumberInputChangeHandler(
  setter: (value: string) => void
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
  };
}

/**
 * Create an onBlur handler that validates and applies defaults
 */
export function createNumberInputBlurHandler(
  rawValue: string,
  setter: (value: string) => void,
  config: NumberInputConfig
) {
  return () => {
    const parsed = config.allowDecimals
      ? parseFloatWithDefault(rawValue, config)
      : parseIntWithDefault(rawValue, config);
    
    setter(parsed.toString());
  };
}
