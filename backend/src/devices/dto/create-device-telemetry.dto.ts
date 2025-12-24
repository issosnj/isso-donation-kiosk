export class CreateDeviceTelemetryDto {
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  batteryLevel?: number;
  batteryState?: string;
  isCharging?: boolean;
  networkType?: string;
  networkSSID?: string;
  isConnected?: boolean;
  diskSpaceUsed?: number;
  diskSpaceTotal?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  squareHardwareConnected?: boolean;
  squareHardwareModel?: string;
  logs?: Array<{
    timestamp: string;
    category: string;
    message: string;
    level?: 'info' | 'warning' | 'error';
  }>;
  metadata?: Record<string, any>;
}

