import type { Health } from '@interactive-story/shared';

export interface HealthSource {
  name: string;
  getHealth(): Health | Promise<Health>;
}

export type AggregateStatus = 'OK' | 'DEGRADED' | 'DOWN';

export interface AggregateHealth {
  overall: AggregateStatus;
  sources: Record<string, Health>;
}

export interface HealthRegistry {
  register(source: HealthSource): void;
  getAggregateHealth(): Promise<AggregateHealth>;
}

const STATUS_RANK: Record<AggregateStatus, number> = { OK: 0, DEGRADED: 1, DOWN: 2 };

export function createHealthRegistry(): HealthRegistry {
  const sources = new Map<string, HealthSource>();
  return {
    register(source) {
      sources.set(source.name, source);
    },
    async getAggregateHealth() {
      const results: Record<string, Health> = {};
      let worst: AggregateStatus = 'OK';
      for (const source of sources.values()) {
        const health = await source.getHealth();
        results[source.name] = health;
        if (STATUS_RANK[health.status] > STATUS_RANK[worst]) {
          worst = health.status;
        }
      }
      return { overall: worst, sources: results };
    },
  };
}
