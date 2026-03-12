import type { VersionMeta } from '../../shared/types.js';

export interface TimelineProps {
  versions: VersionMeta[];
  currentVersion: number;
  onVersionSelect?: (version: number) => void;
}

export function Timeline(_props: TimelineProps): React.ReactElement {
  throw new Error('Not implemented');
}
