export function isValidQueryValue(value?: string): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== 'undefined' && normalized !== 'null';
}

export function parseOptionalDate(value?: string): Date | undefined {
  if (!isValidQueryValue(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildExpenseDateFilter(startDate?: string, endDate?: string) {
  const gte = parseOptionalDate(startDate);
  const lte = parseOptionalDate(endDate);
  if (!gte && !lte) return {};
  return {
    expenseDate: {
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    },
  };
}
