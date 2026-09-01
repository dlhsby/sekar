/**
 * usePruningSubmitForm — Form state management + validation for pruning request submit.
 * Centralizes 15+ form fields, validation logic, and helper functions.
 */

import { useCallback, useState } from 'react';
import i18n from '../../../i18n/config';
import type { PickedWeek } from '../components/WeekPicker';

// ─── Validation Helpers ────────────────────────────────────────────

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function isValidIndoPhone(s: string): boolean {
  const d = digitsOnly(s);
  return /^08\d{8,12}$/.test(d);
}

// ─── Hook ──────────────────────────────────────────────────────────

export interface FormState {
  districtId: string;
  kecamatanName: string;
  address: string;
  treeCount: string;
  treeHeight: string;
  treeDiameter: string;
  requesterName: string;
  requesterPhone: string;
  rtLeaderName: string;
  rtLeaderPhone: string;
  notes: string;
  expectedWeek: PickedWeek | null;
}

interface FormSetters {
  setDistrictId: (v: string) => void;
  setKecamatanName: (v: string) => void;
  setAddress: (v: string) => void;
  setTreeCount: (v: string) => void;
  setTreeHeight: (v: string) => void;
  setTreeDiameter: (v: string) => void;
  setRequesterName: (v: string) => void;
  setRequesterPhone: (v: string) => void;
  setRtLeaderName: (v: string) => void;
  setRtLeaderPhone: (v: string) => void;
  setNotes: (v: string) => void;
  setExpectedWeek: (w: PickedWeek | null) => void;
}

export function usePruningSubmitForm(
  initialDistrictId: string,
  initialKecamatanName: string,
) {
  const [districtId, setDistrictId] = useState<string>(initialDistrictId);
  const [kecamatanName, setKecamatanName] = useState<string>(initialKecamatanName);
  const [address, setAddress] = useState('');
  const [treeCount, setTreeCount] = useState('');
  const [treeHeight, setTreeHeight] = useState('');
  const [treeDiameter, setTreeDiameter] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [rtLeaderName, setRtLeaderName] = useState('');
  const [rtLeaderPhone, setRtLeaderPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedWeek, setExpectedWeek] = useState<PickedWeek | null>(null);

  const formState: FormState = {
    districtId,
    kecamatanName,
    address,
    treeCount,
    treeHeight,
    treeDiameter,
    requesterName,
    requesterPhone,
    rtLeaderName,
    rtLeaderPhone,
    notes,
    expectedWeek,
  };

  const formSetters: FormSetters = {
    setDistrictId,
    setKecamatanName,
    setAddress,
    setTreeCount,
    setTreeHeight,
    setTreeDiameter,
    setRequesterName,
    setRequesterPhone,
    setRtLeaderName,
    setRtLeaderPhone,
    setNotes,
    setExpectedWeek,
  };

  const validate = useCallback((): string | null => {
    if (!address.trim()) {
      return i18n.t('pruning:submitForm.validationErrors.addressRequired');
    }
    if (address.trim().length < 5) {
      return i18n.t('pruning:submitForm.validationErrors.addressMinLength');
    }
    if (address.trim().length > 500) {
      return i18n.t('pruning:submitForm.validationErrors.addressMaxLength');
    }
    // GPS state will be validated separately since it's not in this hook
    if (!treeCount || isNaN(parseInt(treeCount, 10)) || parseInt(treeCount, 10) < 1) {
      return i18n.t('pruning:submitForm.validationErrors.treeCountRequired');
    }
    if (!treeHeight.trim()) {
      return i18n.t('pruning:submitForm.validationErrors.treeHeightRequired');
    }
    if (!treeDiameter.trim()) {
      return i18n.t('pruning:submitForm.validationErrors.treeDiameterRequired');
    }
    if (!requesterName.trim() || !requesterPhone.trim()) {
      return i18n.t('pruning:submitForm.validationErrors.requesterInfoRequired');
    }
    if (!isValidIndoPhone(requesterPhone)) {
      return i18n.t('pruning:submitForm.validationErrors.requesterPhoneInvalid');
    }
    if (!rtLeaderName.trim() || !rtLeaderPhone.trim()) {
      return i18n.t('pruning:submitForm.validationErrors.rtLeaderInfoRequired');
    }
    if (!isValidIndoPhone(rtLeaderPhone)) {
      return i18n.t('pruning:submitForm.validationErrors.rtLeaderPhoneInvalid');
    }
    return null;
  }, [
    address,
    treeCount,
    treeHeight,
    treeDiameter,
    requesterName,
    requesterPhone,
    rtLeaderName,
    rtLeaderPhone,
  ]);

  const resetForm = useCallback(() => {
    setAddress('');
    setTreeCount('');
    setTreeHeight('');
    setTreeDiameter('');
    setRequesterName('');
    setRequesterPhone('');
    setRtLeaderName('');
    setRtLeaderPhone('');
    setNotes('');
    setExpectedWeek(null);
  }, []);

  return {
    formState,
    formSetters,
    validate,
    resetForm,
    digitsOnly,
    isValidIndoPhone,
  };
}
