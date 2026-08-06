-- Stage colours come from a validated ordinal ramp (one hue, monotone
-- lightness, dark -> light as a lead advances). The previous ad-hoc colours
-- failed colour-vision-deficiency separation: sky vs violet measured ΔE 5.2,
-- below the ΔE 6 floor, so two adjacent stages were indistinguishable to
-- deutan viewers. See lib/viz.ts — the app derives the same ramp by position.
update public.stages set color = '#184f95' where key = 'new';
update public.stages set color = '#2a78d6' where key = 'contacted';
update public.stages set color = '#5598e7' where key = 'qualified';
update public.stages set color = '#86b6ef' where key = 'proposal';
update public.stages set color = '#b7d3f6' where key = 'won';
