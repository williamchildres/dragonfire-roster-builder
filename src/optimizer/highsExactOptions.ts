import type { HiGHS } from '@bubblyworld/highs-ts';

/**
 * Every roster-optimizer MILP phase has an integral objective. Both HiGHS MIP
 * gaps are therefore set to zero so `optimal` cannot mean "within tolerance"
 * for a lower-order histogram or stable-key unit.
 */
export const ROSTER_OPTIMIZER_MIP_GAP_OPTIONS = {
  mip_rel_gap: 0,
  mip_abs_gap: 0,
} as const;

interface HiGHSWasmModule {
  ccall: (
    name: string,
    returnType: string,
    argumentTypes: string[],
    arguments_: unknown[],
  ) => unknown;
}

interface HiGHSWasmRuntime {
  module: HiGHSWasmModule;
  highsPtr: number;
}

export interface AppliedHiGHSDoubleOption {
  name: string;
  value: number;
  status: number;
}

/**
 * highs-ts 1.2.0 exposes `HiGHS.setParam`, but it discards the C API status and
 * dispatches integral JavaScript numbers through the integer setter. Zero is
 * integral, while these two HiGHS options are doubles. This narrow adapter uses
 * the same packaged WASM instance and calls `Highs_setDoubleOptionValue`
 * directly, rejecting the configuration unless HiGHS returns kOk (0).
 */
export function applyRosterOptimizerExactGapOptions(highs: HiGHS): AppliedHiGHSDoubleOption[] {
  return Object.entries(ROSTER_OPTIMIZER_MIP_GAP_OPTIONS).map(([name, value]) =>
    applyHiGHSDoubleOption(highs, name, value),
  );
}

export function applyHiGHSDoubleOption(
  highs: HiGHS,
  name: string,
  value: number,
): AppliedHiGHSDoubleOption {
  const runtime = highs as unknown as HiGHSWasmRuntime;
  if (!runtime.module?.ccall || !Number.isFinite(runtime.highsPtr)) {
    throw new Error('The installed highs-ts runtime does not expose the required WASM option API.');
  }
  const status = Number(
    runtime.module.ccall(
      'Highs_setDoubleOptionValue',
      'number',
      ['number', 'string', 'number'],
      [runtime.highsPtr, name, value],
    ),
  );
  if (status !== 0) {
    throw new Error(`HiGHS rejected exact option ${name}=${value} with status ${status}.`);
  }
  return { name, value, status };
}
