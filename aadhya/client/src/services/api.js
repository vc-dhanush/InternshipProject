import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = String(err.config?.url || "");
    const isAuthAttempt = /\/auth\/(login|signup|forgot-password|reset-password)/.test(url);
    if (status === 401 && !isAuthAttempt && onUnauthorized) {
      onUnauthorized();
    }
    const message = err.response?.data?.message || "Network failure. Please try again.";
    const error = new Error(message);
    error.status = status;
    error.details = err.response?.data?.details;
    error.payload = err.response?.data;
    return Promise.reject(error);
  }
);

export default api;
