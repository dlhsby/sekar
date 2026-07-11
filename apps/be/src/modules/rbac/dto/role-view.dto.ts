import { ApiProperty } from '@nestjs/swagger';
import { MonitoringScope } from '../enums/monitoring-scope.enum';

/** Shape returned by the roles API — a Role plus its permission keys and counts. */
export class RoleView {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description?: string;
  @ApiProperty() is_system: boolean;
  @ApiProperty({ enum: MonitoringScope }) monitoring_scope: MonitoringScope;
  @ApiProperty({ nullable: true }) marker_icon?: string;
  @ApiProperty({ nullable: true }) marker_color?: string;
  @ApiProperty({ nullable: true }) marker_image_url?: string;
  @ApiProperty({ type: [String] }) permissionKeys: string[];
  @ApiProperty() permissionCount: number;
  @ApiProperty() userCount: number;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
