import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportValidationErrorDto {
  @ApiProperty({ example: 3 })
  row: number;

  @ApiProperty({ example: 'phone_number' })
  column: string;

  @ApiProperty({ example: '0812xxx' })
  value: string;

  @ApiProperty({ example: 'Must be E.164 format (+62...)' })
  message: string;
}

export class CsvValidationResponseDto {
  @ApiProperty({ description: 'Count of rows that passed validation' })
  validCount: number;

  @ApiProperty({ type: [ImportValidationErrorDto] })
  errors: ImportValidationErrorDto[];

  @ApiPropertyOptional({
    description: 'Present only when ≥1 row is valid; pass to POST /import/confirm/:sessionId',
  })
  sessionId?: string;
}

export class CsvCommitResponseDto {
  @ApiProperty({ description: 'Rows successfully inserted' })
  imported: number;

  @ApiProperty({ description: 'Rows skipped (e.g. duplicate, FK violation)' })
  skipped: number;

  @ApiPropertyOptional({ type: [String], description: 'Per-row skip reasons' })
  skippedReasons?: string[];
}
