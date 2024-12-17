export type IMessageGroup = {
  id: number;
  senderId: number;
  sender: Sender;
  sentAt: string;
  messages: IMessage[];
};

export type Sender = {
  id: number;
  name: string;
  picture: string;
};

export type IMessage = {
  id: number;
  content: string;
};
