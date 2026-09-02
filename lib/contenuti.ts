import type { TestPartitoPack } from '@politicare/motore';
import pack from '@/content/test-partito/politiche-2027.v1.json';

export function caricaPackTestPartito(): TestPartitoPack {
  return pack as TestPartitoPack;
}
