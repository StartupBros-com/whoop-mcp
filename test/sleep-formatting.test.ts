import assert from 'node:assert/strict';
import test from 'node:test';

import type { Sleep } from '../src/api/types';
import { formatSleep } from '../src/shared/sleep-formatting';

const sleep: Sleep = {
  id: 'ecfc6a15-4661-442f-a9a4-f160dd7afae8',
  user_id: 42,
  created_at: '2026-08-20T06:00:00.000Z',
  updated_at: '2026-08-20T14:00:00.000Z',
  start: '2026-08-20T06:15:00.000Z',
  end: '2026-08-20T14:45:00.000Z',
  timezone_offset: '-04:00',
  nap: false,
  score_state: 'SCORED',
  score: {
    respiratory_rate: 14.25,
    sleep_performance_percentage: 88,
    sleep_consistency_percentage: 91,
    sleep_efficiency_percentage: 94.26,
    stage_summary: {
      total_in_bed_time_milli: 30_600_000,
      total_awake_time_milli: 1_800_000,
      total_no_data_time_milli: 0,
      total_light_sleep_time_milli: 13_500_000,
      total_slow_wave_sleep_time_milli: 7_200_000,
      total_rem_sleep_time_milli: 8_100_000,
      sleep_cycle_count: 5,
      disturbance_count: 7,
    },
    sleep_needed: {
      baseline_milli: 28_800_000,
      need_from_sleep_debt_milli: 1_800_000,
      need_from_recent_strain_milli: 900_000,
      need_from_recent_nap_milli: -600_000,
    },
  },
};

test('formats the shared sleep payload without changing fields or units', () => {
  assert.deepEqual(formatSleep(sleep), {
    id: sleep.id,
    user_id: 42,
    date: new Date(sleep.start).toLocaleDateString(),
    start_time: new Date(sleep.start).toLocaleString(),
    end_time: new Date(sleep.end).toLocaleString(),
    duration_hours: '8.50',
    is_nap: false,
    score_state: 'SCORED',
    performance: {
      sleep_performance: '88%',
      sleep_consistency: '91%',
      sleep_efficiency: '94.3%',
      respiratory_rate: '14.3 breaths/min',
    },
    sleep_stages: {
      total_in_bed: '510 minutes',
      awake: '30 minutes',
      light_sleep: '225 minutes',
      deep_sleep: '120 minutes',
      rem_sleep: '135 minutes',
      sleep_cycles: 5,
      disturbances: 7,
    },
    sleep_needed: {
      baseline: '8.0 hours',
      debt_adjustment: '30 minutes',
      strain_adjustment: '15 minutes',
      nap_adjustment: '-10 minutes',
    },
  });
});

test('adds cycle_id without changing the shared sleep fields', () => {
  const { cycle_id: cycleId, ...sharedFields } = formatSleep(sleep, 1234);

  assert.equal(cycleId, 1234);
  assert.deepEqual(sharedFields, formatSleep(sleep));
});

test('omits score-derived sections when WHOOP has not scored the sleep', () => {
  const pending = { ...sleep, score_state: 'PENDING_SCORE' as const, score: undefined };

  assert.deepEqual(formatSleep(pending), {
    id: pending.id,
    user_id: pending.user_id,
    date: new Date(pending.start).toLocaleDateString(),
    start_time: new Date(pending.start).toLocaleString(),
    end_time: new Date(pending.end).toLocaleString(),
    duration_hours: '8.50',
    is_nap: false,
    score_state: 'PENDING_SCORE',
  });
});
