# Web Forms Specification

---

## Overview

Form handling patterns using React Hook Form with Zod validation for the SEKAR web dashboard.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Form Library | React Hook Form v7 |
| Validation | Zod |
| UI Components | Shadcn/ui Form |
| Date Picker | react-day-picker |
| File Upload | react-dropzone |

---

## Form Architecture

### Standard Form Structure

```typescript
// 1. Define Zod schema
const formSchema = z.object({
  field: z.string().min(1, 'Required'),
});

// 2. Infer TypeScript type
type FormValues = z.infer<typeof formSchema>;

// 3. Create form with useForm
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: { field: '' },
});

// 4. Handle submit
const onSubmit = async (data: FormValues) => {
  await mutation.mutateAsync(data);
};
```

---

## Reusable Form Components

### Text Input Field

```typescript
// components/forms/TextField.tsx
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Control } from 'react-hook-form';

interface TextFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  disabled?: boolean;
}

export function TextField({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  disabled,
}: TextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### Select Field

```typescript
// components/forms/SelectField.tsx
interface SelectFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

export function SelectField({
  control,
  name,
  label,
  placeholder,
  options,
  disabled,
}: SelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### Date Picker Field

```typescript
// components/forms/DateField.tsx
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DateField({
  control,
  name,
  label,
  placeholder = 'Pilih tanggal',
  disabled,
  minDate,
  maxDate,
}: DateFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full pl-3 text-left font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  {field.value
                    ? format(field.value, 'PPP', { locale: id })
                    : placeholder}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) => {
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                initialFocus
                locale={id}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### Date Range Field

```typescript
// components/forms/DateRangeField.tsx
interface DateRangeFieldProps {
  control: Control<any>;
  name: string;
  label: string;
}

export function DateRangeField({ control, name, label }: DateRangeFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value?.from ? (
                    field.value.to ? (
                      <>
                        {format(field.value.from, 'LLL dd, y')} -{' '}
                        {format(field.value.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(field.value.from, 'LLL dd, y')
                    )
                  ) : (
                    'Pilih rentang tanggal'
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={field.value}
                onSelect={field.onChange}
                numberOfMonths={2}
                locale={id}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### Textarea Field

```typescript
// components/forms/TextareaField.tsx
export function TextareaField({
  control,
  name,
  label,
  placeholder,
  rows = 3,
}: TextareaFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea placeholder={placeholder} rows={rows} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### Checkbox Field

```typescript
// components/forms/CheckboxField.tsx
export function CheckboxField({ control, name, label }: CheckboxFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center space-x-2">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <FormLabel className="!mt-0">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
```

### File Upload Field

```typescript
// components/forms/FileUploadField.tsx
import { useDropzone } from 'react-dropzone';

interface FileUploadFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
}

export function FileUploadField({
  control,
  name,
  label,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg'] },
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB
}: FileUploadFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const { getRootProps, getInputProps, isDragActive } = useDropzone({
          accept,
          maxFiles,
          maxSize,
          onDrop: (files) => field.onChange(files),
        });

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer',
                  isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm">
                  {isDragActive
                    ? 'Drop files here'
                    : 'Drag & drop or click to select'}
                </p>
              </div>
            </FormControl>
            {field.value?.length > 0 && (
              <div className="mt-2 space-y-1">
                {field.value.map((file: File, i: number) => (
                  <div key={i} className="flex items-center text-sm">
                    <FileIcon className="h-4 w-4 mr-2" />
                    {file.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newFiles = [...field.value];
                        newFiles.splice(i, 1);
                        field.onChange(newFiles);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
```

---

## Validation Schemas

### User Form Schema

```typescript
// lib/validations/user.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .regex(/^[a-z0-9_]+$/, 'Username hanya boleh huruf kecil, angka, dan underscore'),
  fullName: z
    .string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  phone: z
    .string()
    .regex(/^08[0-9]{9,12}$/, 'Nomor HP tidak valid (contoh: 081234567890)'),
  role: z.enum(['Worker', 'Supervisor', 'Admin'], {
    required_error: 'Pilih peran',
  }),
  areaId: z.string().uuid().optional(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
```

### Location Form Schema

```typescript
// lib/validations/location.ts
export const createLocationSchema = z.object({
  name: z.string().min(3, 'Nama lokasi minimal 3 karakter'),
  locationTypeId: z.number({ required_error: 'Pilih jenis lokasi' }),
  description: z.string().optional(),
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(50).max(1000),
});
```

### Report Filter Schema

```typescript
// lib/validations/report-filter.ts
export const reportFilterSchema = z.object({
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  locationId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  condition: z.enum(['Baik', 'Cukup', 'Buruk']).optional(),
});
```

---

## Complete Form Examples

### Create User Form

```typescript
// components/users/CreateUserForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, CreateUserFormValues } from '@/lib/validations/user';
import { useCreateUser } from '@/lib/hooks/useUsers';
import { useAreas } from '@/lib/hooks/useAreas';

interface CreateUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateUserForm({ onSuccess, onCancel }: CreateUserFormProps) {
  const createUser = useCreateUser();
  const { data: areas } = useAreas();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      fullName: '',
      phone: '',
      role: undefined,
      areaId: undefined,
      password: '',
    },
  });

  const watchRole = form.watch('role');

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      await createUser.mutateAsync(data);
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField
          control={form.control}
          name="username"
          label="Username"
          placeholder="contoh: worker_budi"
        />

        <TextField
          control={form.control}
          name="fullName"
          label="Nama Lengkap"
          placeholder="Budi Santoso"
        />

        <TextField
          control={form.control}
          name="phone"
          label="Nomor HP"
          type="tel"
          placeholder="081234567890"
        />

        <SelectField
          control={form.control}
          name="role"
          label="Peran"
          placeholder="Pilih peran"
          options={[
            { value: 'Worker', label: 'Petugas' },
            { value: 'Supervisor', label: 'Supervisor' },
            { value: 'Admin', label: 'Administrator' },
          ]}
        />

        {watchRole === 'Worker' && (
          <SelectField
            control={form.control}
            name="locationId"
            label="Location Tugas"
            placeholder="Pilih lokasi"
            options={locations?.map((a) => ({ value: a.id, label: a.name })) || []}
          />
        )}

        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          placeholder="Minimal 8 karakter"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### Filter Form

```typescript
// components/reports/ReportFilterForm.tsx
export function ReportFilterForm({ onFilter }: ReportFilterFormProps) {
  const { data: areas } = useAreas();
  const { data: workers } = useWorkers();

  const form = useForm<ReportFilterFormValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      dateRange: {
        from: startOfMonth(new Date()),
        to: new Date(),
      },
    },
  });

  const onSubmit = (data: ReportFilterFormValues) => {
    onFilter(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-4 items-end">
        <DateRangeField
          control={form.control}
          name="dateRange"
          label="Periode"
        />

        <SelectField
          control={form.control}
          name="locationId"
          label="Location"
          placeholder="Semua lokasi"
          options={[
            { value: '', label: 'Semua lokasi' },
            ...(locations?.map((a) => ({ value: a.id, label: a.name })) || []),
          ]}
        />

        <SelectField
          control={form.control}
          name="condition"
          label="Kondisi"
          placeholder="Semua kondisi"
          options={[
            { value: '', label: 'Semua kondisi' },
            { value: 'Baik', label: 'Baik' },
            { value: 'Cukup', label: 'Cukup' },
            { value: 'Buruk', label: 'Buruk' },
          ]}
        />

        <Button type="submit">Filter</Button>
      </form>
    </Form>
  );
}
```

---

## Form Patterns

### Async Validation

```typescript
const schema = z.object({
  username: z
    .string()
    .min(3)
    .refine(
      async (username) => {
        const exists = await checkUsernameExists(username);
        return !exists;
      },
      { message: 'Username sudah digunakan' }
    ),
});
```

### Conditional Fields

```typescript
const schema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('Worker'),
    areaId: z.string().uuid({ message: 'Pilih area tugas' }),
  }),
  z.object({
    role: z.literal('Supervisor'),
    areaId: z.string().uuid().optional(),
  }),
  z.object({
    role: z.literal('Admin'),
  }),
]);
```

### Field Arrays

```typescript
// For dynamic list of items
const schema = z.object({
  recipients: z.array(z.string().email()).min(1, 'Minimal 1 penerima'),
});

// In component
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'recipients',
});

return (
  <>
    {fields.map((field, index) => (
      <div key={field.id} className="flex gap-2">
        <Input {...form.register(`recipients.${index}`)} />
        <Button onClick={() => remove(index)}>Remove</Button>
      </div>
    ))}
    <Button onClick={() => append('')}>Add Recipient</Button>
  </>
);
```

---

## Error Handling

### Form-Level Errors

```typescript
const onSubmit = async (data: FormValues) => {
  try {
    await mutation.mutateAsync(data);
  } catch (error) {
    if (error.response?.status === 400) {
      // Validation errors from backend
      const errors = error.response.data.errors;
      Object.entries(errors).forEach(([field, message]) => {
        form.setError(field as any, { message: message as string });
      });
    } else {
      // Generic error
      form.setError('root', { message: 'Terjadi kesalahan. Coba lagi.' });
    }
  }
};

// Display root error
{form.formState.errors.root && (
  <Alert variant="destructive">
    {form.formState.errors.root.message}
  </Alert>
)}
```

---

## Dependencies

```bash
npm install react-hook-form
npm install @hookform/resolvers
npm install zod
npm install react-dropzone
npm install date-fns
```

---

**Last Updated:** 2026-01-16
