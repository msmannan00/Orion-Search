export interface SharedChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: Date;
}
