export interface User {
  id: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
  avatar?: string;
  avatarColor?: string;
  bio?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  avatarColor?: string;
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
  sender: { id: string; name: string; avatar?: string; avatarColor?: string };
  kind: 'text' | 'image' | 'file';
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
