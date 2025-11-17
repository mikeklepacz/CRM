// QUARANTINED: This file is deprecated and replaced by Matrix2 slot-first scheduling system.
// All imports/calls to this file should fail immediately to prevent accidental usage.

throw new Error(
  '❌ CRITICAL ERROR: matrixScheduler.ts is DEPRECATED and QUARANTINED.\n\n' +
  'Matrix2 slot-first scheduling system has replaced per-recipient scheduling.\n\n' +
  'DO NOT use getNextMatrixSlot() or any function from this file.\n\n' +
  'Instead:\n' +
  '1. Create sequence_recipients with metadata (timezone, business_hours, state)\n' +
  '2. Set status="in_sequence" and currentStep=0\n' +
  '3. Matrix2 slot assigner will automatically assign recipients to daily slots\n\n' +
  'If you see this error, remove all imports from matrixScheduler.ts immediately.'
);
