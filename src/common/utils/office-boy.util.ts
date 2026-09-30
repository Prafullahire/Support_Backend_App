export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function generateOfficeBoyEmail(phone: string): string {
  const digits = normalizePhone(phone);
  return `ob.${digits || Date.now()}@staff.local`;
}

export function generateEmployeeId(phone: string): string {
  const digits = normalizePhone(phone);
  const suffix = digits.slice(-10) || String(Date.now()).slice(-10);
  return `OB-${suffix}`;
}
