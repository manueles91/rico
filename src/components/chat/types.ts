export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  imageBase64?: string;
}

export interface MessageContent {
  type: 'input_text' | 'input_image';
  text?: string;
  image_url?: string;
  detail?: 'low' | 'high' | 'auto';
}

export interface ChatRequestMessage {
  role: MessageRole;
  content: string | MessageContent[];
}
