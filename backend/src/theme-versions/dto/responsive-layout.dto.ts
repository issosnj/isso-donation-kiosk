/**
 * Responsive Layout DTOs
 * 
 * Defines the structure for responsive layout positioning using relative units
 * instead of absolute pixel coordinates for universal scaling across devices.
 */

export interface RelativePosition {
  /** X position as percentage of screen width (0.0 to 1.0) */
  x?: number;
  /** Y position as percentage of screen height (0.0 to 1.0) */
  y?: number;
  /** Width as percentage of screen width (0.0 to 1.0) */
  width?: number;
  /** Height as percentage of screen height (0.0 to 1.0) */
  height?: number;
  /** Alignment: 'left', 'center', 'right', 'top', 'bottom' */
  alignment?: string;
  /** Whether element should use flex layout instead of absolute positioning */
  useFlexLayout?: boolean;
}

export interface ResponsiveLayoutConfig {
  /** Base reference screen width in points (default: 1024 - iPad Pro 12.9") */
  baseScreenWidth?: number;
  /** Base reference screen height in points (default: 1366 - iPad Pro 12.9") */
  baseScreenHeight?: number;
  /** Element positioning configurations */
  elements?: {
    [elementType: string]: RelativePosition;
  };
}

