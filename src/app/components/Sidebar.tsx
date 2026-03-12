export interface SidebarProps {
  sections: Array<{ title: string; status: string }>;
  activeSection: string;
  onSectionClick?: (sectionId: string) => void;
}

export function Sidebar(_props: SidebarProps): React.ReactElement {
  throw new Error('Not implemented');
}
