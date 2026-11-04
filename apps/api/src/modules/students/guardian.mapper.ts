import type { GuardianRow } from "./guardian.schemas";

export function toGuardianRow(input: {
  guardians: {
    id: string;
    nameEn: string;
    nameBn: string;
    phone: string;
    altPhone: string | null;
    address: string | null;
  };
  relationship: GuardianRow["relationship"];
  isPrimary: boolean;
}): GuardianRow {
  return {
    id: input.guardians.id,
    nameEn: input.guardians.nameEn,
    nameBn: input.guardians.nameBn,
    phone: input.guardians.phone,
    altPhone: input.guardians.altPhone,
    address: input.guardians.address,
    relationship: input.relationship,
    isPrimary: input.isPrimary,
  };
}
