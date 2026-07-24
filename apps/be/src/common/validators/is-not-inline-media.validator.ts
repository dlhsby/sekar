import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Rejects inline media payloads (`data:` / `blob:` URIs) on a string or string[]
 * field. Photos belong in object storage (MinIO local/prod, S3 staging), with the
 * DB holding only the key/URL — inlining base64 in a `text[]` column is what bloated
 * `activities` to multiple GB and OOM'd the backend (F9). Uploads go through
 * `POST /activities/photos`, which returns the stored URL to put here.
 *
 * Empty/undefined values pass (use `@IsNotEmpty`/`@ArrayMinSize` for presence).
 */
export function IsNotInlineMedia(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isNotInlineMedia',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          const isInline = (v: unknown): boolean =>
            typeof v === 'string' && /^\s*(data:|blob:)/i.test(v);
          if (Array.isArray(value)) return !value.some(isInline);
          return !isInline(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a storage key or URL, not an inline data:/blob: payload — upload the file via POST /activities/photos and send the returned URL`;
        },
      },
    });
  };
}
