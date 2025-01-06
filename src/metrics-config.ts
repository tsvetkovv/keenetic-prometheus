import { KeeneticClient } from "./keenetic-api.ts";

export interface MetricDefinition {
  name: string;
  field?: string;
  type: "gauge" | "counter";
  help: string;
  labels?: string[];
  array_selector?: string;
  calculate?: string;
}

interface MetricGroupConfig {
  path: string;
  metrics: MetricDefinition[];
  params?: Record<string, string | number>;
}

interface MetricsConfig {
  metrics: Record<string, MetricGroupConfig>;
}

interface MetricTransform {
  (value: unknown): number;
}

const transforms: Record<string, MetricTransform> = {
  // Add a transform for the memory field
  "system.memory": (value: unknown): number => {
    if (typeof value !== "string") return 0;
    // Parse "usage/total" format, e.g. "84824/262144"
    const usage = value.split("/")[0];
    return parseInt(usage, 10);
  },
};

export function transformMetricValue(
  path: string,
  field: string,
  value: unknown,
): number {
  // Check if we have a custom transform for this metric
  const transformKey = `${path}.${field}`;
  if (transformKey in transforms) {
    return transforms[transformKey](value);
  }

  // Default transformation
  if (typeof value === "string") {
    return parseInt(value, 10);
  }
  if (typeof value === "number") {
    return value;
  }
  return 0;
}

// Add these type guard functions at the top level
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayOfRecords(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => isRecord(item));
}

// Add these interfaces at the top with the other interfaces
interface MetricValue {
  labels?: Record<string, string>;
  value: number;
}

interface MetricData {
  type: "gauge" | "counter";
  help: string;
  values?: MetricValue[];
  value?: number;
}

export class MetricsCollector {
  private config: MetricsConfig;
  private client: KeeneticClient;

  constructor(config: MetricsConfig, client: KeeneticClient) {
    this.config = config;
    this.client = client;
  }

  async collectMetrics(): Promise<Record<string, MetricData>> {
    const results: Record<string, MetricData> = {};

    for (
      const [groupName, groupConfig] of Object.entries(this.config.metrics)
    ) {
      try {
        const data = await this.client.metric(
          groupConfig.path,
          groupConfig.params,
        );

        if (!isRecord(data)) {
          console.error(`Invalid data format for ${groupName}`);
          continue;
        }

        for (const metric of groupConfig.metrics) {
          if (metric.array_selector) {
            // Handle array-based metrics with labels
            const items = this.evaluateArraySelector(
              data,
              metric.array_selector,
            );
            const metricName = `keenetic_${groupName}_${metric.name}`;

            if (!isArrayOfRecords(items)) continue;

            results[metricName] = {
              type: metric.type,
              help: metric.help,
              values: items.map((item) => ({
                labels: this.extractLabels(item, metric.labels || []),
                value: metric.field
                  ? transformMetricValue(
                    groupConfig.path,
                    metric.field,
                    this.extractValue(item, metric.field),
                  )
                  : 0,
              })),
            };
          } else if (metric.calculate) {
            // Handle calculated metrics
            const value = this.evaluateCalculation(data, metric.calculate);
            results[`keenetic_${groupName}_${metric.name}`] = {
              value,
              type: metric.type,
              help: metric.help,
            };
          } else if (metric.field) {
            // Handle simple metrics
            const rawValue = this.extractValue(data, metric.field);
            const value = transformMetricValue(
              groupConfig.path,
              metric.field,
              rawValue,
            );
            results[`keenetic_${groupName}_${metric.name}`] = {
              value,
              type: metric.type,
              help: metric.help,
            };
          }
        }
      } catch (error) {
        console.error(`Error collecting metrics for ${groupName}:`, error);
      }
    }

    return results;
  }

  private extractValue(data: Record<string, unknown>, field: string): unknown {
    return field.split(".").reduce((obj, key) => {
      if (isRecord(obj)) {
        return obj[key];
      }
      return undefined;
    }, data as unknown);
  }

  private extractLabels(
    item: Record<string, unknown>,
    labelNames: string[],
  ): Record<string, string> {
    const labels: Record<string, string> = {};
    for (const label of labelNames) {
      const value = this.extractValue(item, label);
      labels[label] = String(value ?? "");
    }
    return labels;
  }

  public evaluateArraySelector(
    data: Record<string, unknown>,
    selector: string,
  ): unknown[] {
    // Parse selector in format "field[?condition]"
    const match = selector.match(/^(\w+)\[?\?(\w+)(?:===(.+?))?\]?$/);
    if (!match) {
      console.debug("Selector match failed:", selector);
      return [];
    }

    const [, fieldName, conditionField, expectedValue] = match;

    // Get the array from data using fieldName
    const items = Array.isArray(data[fieldName]) ? data[fieldName] : [];

    return items.filter((item): item is Record<string, unknown> => {
      if (!isRecord(item)) return false;

      // If no expected value provided, just check if field exists
      if (expectedValue === undefined) {
        return conditionField in item;
      }

      // Parse expected value (handle booleans and other types)
      let parsedValue: string | boolean | number = expectedValue;
      if (expectedValue === "true") parsedValue = true;
      if (expectedValue === "false") parsedValue = false;

      return item[conditionField] === parsedValue;
    });
  }

  private evaluateCalculation(
    data: Record<string, unknown>,
    calculation: string,
  ): number {
    // Basic implementation for length calculation
    if (calculation.startsWith("length(")) {
      const selector = calculation.slice(7, -1); // Remove length( and )
      const items = this.evaluateArraySelector(data, selector);
      return items.length;
    }
    return 0;
  }
}
