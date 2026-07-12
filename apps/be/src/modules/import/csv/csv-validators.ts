import { UserRole } from '../../users/entities/user.entity';

/** A single cell-level validation failure. */
export interface ImportValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ValidatedUserRow {
  username: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  /** Optional: when omitted the backend generates a one-time temp password. */
  password?: string;
  location_id?: string;
  rayon_id?: string;
  employee_id?: string;
}

export interface ValidatedAreaRow {
  name: string;
  location_type_id: string;
  rayon_id: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters?: number;
}

export interface ValidationOutcome<T> {
  valid: T[];
  errors: ImportValidationError[];
}

/** Roles a CSV import may assign (excludes superadmin and staff_kecamatan). */
const IMPORTABLE_ROLES: UserRole[] = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_RAYON,
  UserRole.KEPALA_RAYON,
  UserRole.MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
];

/** Roles that must carry a phone number. */
const PHONE_REQUIRED_ROLES: UserRole[] = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_RAYON,
  UserRole.KEPALA_RAYON,
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E164_RE = /^\+62\d{6,15}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

/** Data rows start on line 2 (line 1 is the header). */
const toLineNumber = (index: number): number => index + 2;

function validateUserRow(
  row: Record<string, string>,
  index: number,
  errors: ImportValidationError[],
): ValidatedUserRow | null {
  const line = toLineNumber(index);
  const before = errors.length;
  const fail = (column: string, message: string) =>
    errors.push({ row: line, column, value: row[column] ?? '', message });

  const username = row.username ?? '';
  if (username.length < 3 || username.length > 50 || !USERNAME_RE.test(username)) {
    fail('username', 'Username must be 3–50 chars (letters, numbers, underscore)');
  }

  const fullName = row.full_name ?? '';
  if (fullName.length < 2 || fullName.length > 100) {
    fail('full_name', 'Full name must be 2–100 characters');
  }

  const role = row.role as UserRole;
  if (!IMPORTABLE_ROLES.includes(role)) {
    fail('role', `Invalid role. Use: ${IMPORTABLE_ROLES.join(', ')}`);
  }

  const phone = row.phone_number ?? '';
  if (PHONE_REQUIRED_ROLES.includes(role) && !phone) {
    fail('phone_number', 'Phone number is required for this role');
  } else if (phone && !E164_RE.test(phone)) {
    fail('phone_number', 'Must be E.164 format (+62...)');
  }

  // Password is optional: omit it and the backend generates a one-time temp
  // password (forced change on first login) that is returned so admins can hand
  // it out. Only validate length when a value is actually supplied.
  if (row.password && row.password.length < 8) {
    fail('password', 'Password must be at least 8 characters');
  }

  if (row.location_id && !UUID_RE.test(row.location_id)) {
    fail('location_id', 'location_id must be a valid UUID');
  }
  if (row.rayon_id && !UUID_RE.test(row.rayon_id)) {
    fail('rayon_id', 'rayon_id must be a valid UUID');
  }
  if (row.employee_id && row.employee_id.length > 20) {
    fail('employee_id', 'employee_id must be at most 20 characters');
  }

  if (errors.length !== before) {
    return null;
  }
  return {
    username,
    full_name: fullName,
    role,
    password: row.password || undefined,
    phone_number: phone || undefined,
    location_id: row.location_id || undefined,
    rayon_id: row.rayon_id || undefined,
    employee_id: row.employee_id || undefined,
  };
}

export function validateUsers(rows: Record<string, string>[]): ValidationOutcome<ValidatedUserRow> {
  const errors: ImportValidationError[] = [];
  const valid: ValidatedUserRow[] = [];
  const seenUsernames = new Set<string>();
  const seenPhones = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = validateUserRow(row, index, errors);
    if (parsed) {
      const line = toLineNumber(index);
      // Check batch-level duplicates: keep first, mark later as errors
      if (seenUsernames.has(parsed.username)) {
        errors.push({
          row: line,
          column: 'username',
          value: parsed.username,
          message: 'Duplikat di dalam file CSV',
        });
        return;
      }
      if (parsed.phone_number && seenPhones.has(parsed.phone_number)) {
        errors.push({
          row: line,
          column: 'phone_number',
          value: parsed.phone_number,
          message: 'Duplikat di dalam file CSV',
        });
        return;
      }
      seenUsernames.add(parsed.username);
      if (parsed.phone_number) {
        seenPhones.add(parsed.phone_number);
      }
      valid.push(parsed);
    }
  });
  return { valid, errors };
}

function parseCoordinate(value: string, min: number, max: number): number | null {
  if (value === '') {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

function validateAreaRow(
  row: Record<string, string>,
  index: number,
  errors: ImportValidationError[],
): ValidatedAreaRow | null {
  const line = toLineNumber(index);
  const before = errors.length;
  const fail = (column: string, message: string) =>
    errors.push({ row: line, column, value: row[column] ?? '', message });

  const name = row.name ?? '';
  if (name.length < 2 || name.length > 100) {
    fail('name', 'Name must be 2–100 characters');
  }
  if (!UUID_RE.test(row.location_type_id ?? '')) {
    fail('location_type_id', 'location_type_id must be a valid UUID');
  }
  if (!UUID_RE.test(row.rayon_id ?? '')) {
    fail('rayon_id', 'rayon_id must be a valid UUID');
  }

  const latitude = parseCoordinate(row.latitude ?? '', -90, 90);
  if (latitude === null) {
    fail('latitude', 'latitude must be a decimal between -90 and 90');
  }
  const longitude = parseCoordinate(row.longitude ?? '', -180, 180);
  if (longitude === null) {
    fail('longitude', 'longitude must be a decimal between -180 and 180');
  }

  let radius: number | undefined;
  if (row.radius_meters) {
    const r = Number(row.radius_meters);
    if (!Number.isInteger(r) || r < 10 || r > 10000) {
      fail('radius_meters', 'radius_meters must be an integer between 10 and 10000');
    } else {
      radius = r;
    }
  }

  if (row.address && row.address.length > 500) {
    fail('address', 'address must be at most 500 characters');
  }

  if (errors.length !== before || latitude === null || longitude === null) {
    return null;
  }
  return {
    name,
    location_type_id: row.location_type_id,
    rayon_id: row.rayon_id,
    address: row.address || undefined,
    latitude,
    longitude,
    radius_meters: radius,
  };
}

export function validateAreas(rows: Record<string, string>[]): ValidationOutcome<ValidatedAreaRow> {
  const errors: ImportValidationError[] = [];
  const valid: ValidatedAreaRow[] = [];
  const seenNames = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = validateAreaRow(row, index, errors);
    if (parsed) {
      const line = toLineNumber(index);
      // Check batch-level duplicates: keep first, mark later as errors
      if (seenNames.has(parsed.name)) {
        errors.push({
          row: line,
          column: 'name',
          value: parsed.name,
          message: 'Duplikat di dalam file CSV',
        });
        return;
      }
      seenNames.add(parsed.name);
      valid.push(parsed);
    }
  });
  return { valid, errors };
}
