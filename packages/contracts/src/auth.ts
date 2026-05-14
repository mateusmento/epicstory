import type { IUser } from "./user";

export type SignupRequest = {
  name: string;
  email: string;
  password: string;
};

export type SignupResponse = {
  id: number;
  name: string;
  email: string;
};

export type SigninRequest = {
  email: string;
  password: string;
};

export type SigninResponse = {
  token: string;
  user: IUser;
};

export type AuthenticateResponse = {
  token: string;
  user: IUser;
};
