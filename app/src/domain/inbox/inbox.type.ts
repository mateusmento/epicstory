export interface IInbox {
  messages: IMessage[];
}

export interface IMessage {
  id: number;
  text: string;
  author: Author;
}

interface Author {
  id: number;
  name: string;
}
