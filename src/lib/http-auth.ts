/** Interceptor Bearer + refresh/retry 401 yang dipakai client quiz dan auth. */
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, notifySessionExpired } from "@/lib/auth-store";

/** Satu retry setelah refresh untuk mencegah loop 401. */
type RetriableRequestConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

export function installAuthInterceptors(instance: AxiosInstance, refresh: () => Promise<unknown>) {
  instance.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) return Promise.reject(error);

      const original = error.config as RetriableRequestConfig | undefined;
      // Endpoint auth ditangani halaman login/provider, bukan interceptor ini.
      const isAuthEndpoint = typeof original?.url === "string" && original.url.includes("/auth/");

      if (error.response?.status !== 401 || !original || original._authRetried || isAuthEndpoint) {
        return Promise.reject(error);
      }
      // Tanpa token (mis. bootstrap gagal) tidak ada yang bisa di-refresh di sini.
      if (!getAccessToken()) return Promise.reject(error);

      original._authRetried = true;
      try {
        await refresh();
      } catch {
        notifySessionExpired();
        return Promise.reject(error);
      }
      return instance(original);
    },
  );
}
