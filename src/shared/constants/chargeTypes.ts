import type { LucideIcon } from 'lucide-react';
import { Home, Droplets, Shield, Trash2, Wifi, Car, Wrench, Receipt } from 'lucide-react';

export type ChargeType =
  | 'rent'
  | 'water'
  | 'garbage'
  | 'security'
  | 'service_charge'
  | 'caretaker'
  | 'wifi'
  | 'parking'
  | 'custom';

export const CHARGE_TYPE_META: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  rent: { label: 'Rent', icon: Home, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  water: { label: 'Water', icon: Droplets, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  security: { label: 'Security', icon: Shield, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  garbage: { label: 'Garbage', icon: Trash2, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  service_charge: { label: 'Service charge', icon: Receipt, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  caretaker: { label: 'Caretaker', icon: Wrench, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  wifi: { label: 'Wi‑Fi', icon: Wifi, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  parking: { label: 'Parking', icon: Car, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  custom: { label: 'Other', icon: Receipt, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
};

export function chargeMeta(type: string | null | undefined) {
  return CHARGE_TYPE_META[type ?? 'custom'] ?? CHARGE_TYPE_META.custom;
}
