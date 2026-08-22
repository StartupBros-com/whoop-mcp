import type { Sleep } from '../api/types';

const MILLISECONDS_PER_MINUTE = 1000 * 60;
const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * 60;

/** Format WHOOP sleep data identically for both sleep lookup tools. */
export function formatSleep(sleep: Sleep, cycleId?: number) {
  const start = new Date(sleep.start);
  const end = new Date(sleep.end);

  return {
    id: sleep.id,
    ...(cycleId !== undefined && { cycle_id: cycleId }),
    user_id: sleep.user_id,
    date: start.toLocaleDateString(),
    start_time: start.toLocaleString(),
    end_time: end.toLocaleString(),
    duration_hours: (
      (end.getTime() - start.getTime()) /
      MILLISECONDS_PER_HOUR
    ).toFixed(2),
    is_nap: sleep.nap,
    score_state: sleep.score_state,
    ...(sleep.score && {
      performance: {
        sleep_performance: `${sleep.score.sleep_performance_percentage}%`,
        sleep_consistency: `${sleep.score.sleep_consistency_percentage}%`,
        sleep_efficiency: `${sleep.score.sleep_efficiency_percentage.toFixed(1)}%`,
        respiratory_rate: `${sleep.score.respiratory_rate.toFixed(1)} breaths/min`,
      },
      sleep_stages: sleep.score.stage_summary
        ? {
            total_in_bed: `${(
              sleep.score.stage_summary.total_in_bed_time_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
            awake: `${(
              sleep.score.stage_summary.total_awake_time_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
            light_sleep: `${(
              sleep.score.stage_summary.total_light_sleep_time_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
            deep_sleep: `${(
              sleep.score.stage_summary.total_slow_wave_sleep_time_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
            rem_sleep: `${(
              sleep.score.stage_summary.total_rem_sleep_time_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
            sleep_cycles: sleep.score.stage_summary.sleep_cycle_count,
            disturbances: sleep.score.stage_summary.disturbance_count,
          }
        : undefined,
      sleep_needed: sleep.score.sleep_needed
        ? {
            baseline: `${(
              sleep.score.sleep_needed.baseline_milli / MILLISECONDS_PER_HOUR
            ).toFixed(1)} hours`,
            debt_adjustment: `${(
              sleep.score.sleep_needed.need_from_sleep_debt_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
            strain_adjustment: `${(
              sleep.score.sleep_needed.need_from_recent_strain_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
            nap_adjustment: `${(
              sleep.score.sleep_needed.need_from_recent_nap_milli /
              MILLISECONDS_PER_MINUTE
            ).toFixed(0)} minutes`,
          }
        : undefined,
    }),
  };
}
