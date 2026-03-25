export interface Conversation {
  id: string;
  anonName: string;
  anonId: string;
  blocked: boolean;
  typing: boolean;
  ownerTyping: boolean;
}

export interface ChatMsg {
  id: string;
  sender: string;
  senderUid: string | null;
  text: string;
  time: string;
  createdAt: Date;
  seen?: boolean;
}

export function getAnonId(): string {
  if (typeof window === 'undefined') return 'Anony-000000';
  let id = localStorage.getItem('veilo_anon_id');
  if (!id) {
    id = 'Anony-' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('veilo_anon_id', id);
  }
  return id;
}

export function generateAnonName(): string {
  return 'Anony-' + Math.random().toString(36).substring(2, 8);
}
