export interface User {
  id: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
  avatar?: string;
  avatarColor?: string;
  bio?: string;
  chatBg?: string;
  chatBubble?: string;
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
  kind: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  deleted: boolean;
  reply?: {
    id: string;
    senderName: string;
    kind: 'text' | 'image' | 'video' | 'audio' | 'file';
    deleted: boolean;
    text?: string;
    fileName?: string;
  };
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  colour: string;
  createdBy?: string;
  members: Member[];
  memberCount: number;
  isMember: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GroupMessage {
  id: string;
  group: string;
  sender: { id: string; name: string; avatar?: string; avatarColor?: string };
  kind: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  important: boolean;
  deleted: boolean;
  reply?: {
    id: string;
    senderName: string;
    kind: string;
    deleted: boolean;
    text?: string;
    fileName?: string;
  };
  scheduledFor?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  kind: string;
  group?: string;
  groupName?: string;
  fromName?: string;
  preview?: string;
  read: boolean;
  createdAt: string;
}

export interface SharedFileInfo {
  fileName: string;
  mimeType: string;
  size: number;
  heading?: string;
  sharedBy?: string;
}
