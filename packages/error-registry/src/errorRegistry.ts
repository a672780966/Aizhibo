export type ErrorLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface ErrorRecordInput {
  level: ErrorLevel;
  category: string;
  message: string;
}

export interface ErrorRecord extends ErrorRecordInput {
  id: string;
  timestamp: string;
}

export interface ErrorRegistry {
  record(input: ErrorRecordInput): ErrorRecord;
  list(): readonly ErrorRecord[];
}

export function createErrorRegistry(): ErrorRegistry {
  const records: ErrorRecord[] = [];
  let counter = 0;
  return {
    record(input) {
      counter += 1;
      const record: ErrorRecord = {
        ...input,
        id: `err-${counter}`,
        timestamp: new Date().toISOString(),
      };
      records.push(record);
      return record;
    },
    list() {
      return records.slice();
    },
  };
}
