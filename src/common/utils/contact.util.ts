import { BadRequestException } from '@nestjs/common';
import { normalizePhone } from './office-boy.util';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailOrPhone(value: string): { email: string; phone?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BadRequestException('Email or phone number is required');
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return { email: trimmed.toLowerCase() };
  }

  const digits = normalizePhone(trimmed);
  if (digits.length >= 10) {
    return {
      email: `user.${digits}@register.local`,
      phone: digits,
    };
  }

  throw new BadRequestException('Please enter a valid email or phone number');
}

export function isEmailValue(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isSystemGeneratedEmail(email?: string | null): boolean {
  if (!email) return true;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith('@staff.local') || normalized.endsWith('@register.local');
}
