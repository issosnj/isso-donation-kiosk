import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('device_telemetry')
@Index(['deviceId', 'createdAt'])
export class DeviceTelemetry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  deviceId: string;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  // Device Information
  @Column({ nullable: true })
  deviceModel: string; // e.g., "iPad Pro 12.9-inch"

  @Column({ nullable: true })
  osVersion: string; // e.g., "17.0"

  @Column({ nullable: true })
  appVersion: string; // e.g., "1.0.0"

  // Battery Information
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  batteryLevel: number; // 0-100

  @Column({ nullable: true })
  batteryState: string; // "charging", "unplugged", "full", "unknown"

  @Column({ default: false })
  isCharging: boolean;

  // Network Information
  @Column({ nullable: true })
  networkType: string; // "wifi", "cellular", "none", "unknown"

  @Column({ nullable: true })
  networkSSID: string; // WiFi network name

  @Column({ default: false })
  isConnected: boolean;

  // System Information
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  diskSpaceUsed: number; // GB

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  diskSpaceTotal: number; // GB

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  memoryUsed: number; // MB

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  memoryTotal: number; // MB

  // Square Hardware Status
  @Column({ default: false })
  squareHardwareConnected: boolean;

  @Column({ nullable: true })
  squareHardwareModel: string;

  // Logs (stored as JSON array of log entries)
  @Column({ type: 'jsonb', nullable: true })
  logs: Array<{
    timestamp: string;
    category: string;
    message: string;
    level?: 'info' | 'warning' | 'error';
  }>;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

