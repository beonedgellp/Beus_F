export interface User {
  id: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Label {
  heading: string;
  colour: string;
}

export interface FileItem {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  label: Label;
  createdAt: string;
  uploader?: { id: string; name: string } | string;
}

export interface ShareLinkDto {
  id: string;
  token: string;
  url: string;
  itemId: string;
  revoked: boolean;
  expiresAt?: string;
  downloadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: { id: string; name: string };
  kind: 'text' | 'image';
  text?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  deleted: boolean;
  createdAt: string;
}

export interface SharedFileInfo {
  fileName: string;
  mimeType: string;
  size: number;
  heading?: string;
  sharedBy?: string;
}
