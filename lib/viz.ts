/**
 * Chart palette.
 *
 * Every value here was validated against the app's dark chart surface
 * (#121419) with the data-viz palette validator — lightness band, chroma floor,
 * colour-vision-deficiency separation, normal-vision floor and contrast. Do not
 * hand-pick replacements: re-run the validator if these need to change.
 */

/** Ordinal ramp for pipeline stages: one hue, monotone lightness, dark → light
 *  as a lead advances. Passes the ordinal checks (gaps >= 0.06 L, light end
 *  2.27:1 against the surface). */
export const STAGE_RAMP = [
  "#184f95",
  "#2a78d6",
  "#5598e7",
  "#86b6ef",
  "#b7d3f6",
];

/** Categorical slots for multi-series charts (validated all-pairs on dark). */
export const SERIES = {
  primary: "#3987e5", // slot 1 — blue
  secondary: "#199e70", // slot 3 — aqua
};

/** Chart chrome. */
export const CHROME = {
  surface: "#121419",
  grid: "#2c2c2a",
  axis: "#383835",
  muted: "#898781",
};

/**
 * A stage's colour comes from its position in the pipeline, so the board, the
 * funnel and the badges always agree. Falls back to the stored colour for any
 * stage beyond the ramp.
 */
export function stageColor(stage: { position: number; color?: string }) {
  return STAGE_RAMP[stage.position] ?? stage.color ?? SERIES.primary;
}
