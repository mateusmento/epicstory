import axios from 'axios';

export function createAxios() {
  return axios.create({
    baseURL: import.meta.env.VITE_API_URL,
  });
}
