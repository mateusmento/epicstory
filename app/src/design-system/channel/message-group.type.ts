export type IMessageGroup = {
  id: number;
  sender: Sender;
  sentAt: string;
  messages: IMessage[];
};

export type Sender = {
  id: 1;
  name: string;
  photo: string;
};

export type IMessage = {
  id: number;
  content: string;
};
