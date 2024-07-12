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
