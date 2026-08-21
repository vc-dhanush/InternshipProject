import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aadhya_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || "Network failure. Please try again.";
    const details = err.response?.data?.details;
    const error = new Error(message);
    error.status = err.response?.status;
    error.details = details;
    return Promise.reject(error);
  }
);

export default api;
