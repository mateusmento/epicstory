import type { User } from "../types/user.type";

export type SigninRequest = {
  email: string;
  password: string;
};

export type SigninResponse = {
  token: string;
  user: User;
};

export type AuthenticateResponse = {
  token: string;
  user: User;
};
