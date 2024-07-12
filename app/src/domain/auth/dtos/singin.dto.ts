export type SigninRequest = {
  email: string;
  password: string;
};

export type SigninResponse = {
  token: string;
  user: any;
};
