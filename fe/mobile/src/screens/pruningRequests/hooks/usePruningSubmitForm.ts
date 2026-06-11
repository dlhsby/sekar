/**
 * usePruningSubmitForm — Form state management + validation for pruning request submit.
 * Centralizes 15+ form fields, validation logic, and helper functions.
 */

import { useCallback, useState } from 'react';
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
  rayonId: string;
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
  setRayonId: (v: string) => void;
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
  initialRayonId: string,
  initialKecamatanName: string,
) {
  const [rayonId, setRayonId] = useState<string>(initialRayonId);
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
    rayonId,
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
    setRayonId,
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
      return 'Alamat (jalan) wajib diisi.';
    }
    if (address.trim().length < 5) {
      return 'Alamat minimal 5 karakter.';
    }
    if (address.trim().length > 500) {
      return 'Alamat maksimal 500 karakter.';
    }
    // GPS state will be validated separately since it's not in this hook
    if (!treeCount || isNaN(parseInt(treeCount, 10)) || parseInt(treeCount, 10) < 1) {
      return 'Jumlah pohon harus diisi dengan angka minimal 1.';
    }
    if (!treeHeight.trim()) {
      return 'Tinggi pohon (perkiraan) wajib diisi.';
    }
    if (!treeDiameter.trim()) {
      return 'Diameter pohon (perkiraan) wajib diisi.';
    }
    if (!requesterName.trim() || !requesterPhone.trim()) {
      return 'Nama dan nomor HP pemohon wajib diisi.';
    }
    if (!isValidIndoPhone(requesterPhone)) {
      return 'Nomor HP pemohon harus diawali 08 dan 10–14 digit.';
    }
    if (!rtLeaderName.trim() || !rtLeaderPhone.trim()) {
      return 'Nama dan nomor HP ketua RT/RW wajib diisi.';
    }
    if (!isValidIndoPhone(rtLeaderPhone)) {
      return 'Nomor HP ketua RT/RW harus diawali 08 dan 10–14 digit.';
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
