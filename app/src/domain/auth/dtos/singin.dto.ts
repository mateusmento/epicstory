import type { User } from "../user.type";

export type SigninRequest = {
  email: string;
  password: string;
};

export type SigninResponse = {
  token: string;
  user: User;
};

export type AuthenticateResponse = {
  user: User;
};
