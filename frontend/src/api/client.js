import axios from "axios";

export const TOKEN_KEY = "pa_token";

// Base URL comes from .env (VITE_API_URL). Leave it empty to use the same origin.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// The one axios instance every API call goes through
export const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

// attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// turn axios errors into ApiError, keeping the server's message and status code
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status ?? 0;
    const detail = err.response?.data?.detail;
    let message = "Request failed";
    if (typeof detail === "string") message = detail;
    else if (!err.response) message = "Cannot reach the server";
    return Promise.reject(new ApiError(message, status));
  },
);
