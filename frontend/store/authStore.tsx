import { api } from "@/lib/api";
import { LoginInput, SignupInput } from "@/schemas/auth.schema";
import { create } from "zustand";
import axios from "axios";

interface UserResponse {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  loading: boolean;
  error: string | null;
  user: UserResponse | null;
  signup: (data: SignupInput) => Promise<void>;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  profile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: false,
  error: null,
  user: null,
  signup: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<UserResponse>("/api/auth/signup", data);
      set({ user: res.data, loading: false });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.detail ?? "Signup failed. Please try again.";
        console.error("error in signup store:", message);
        set({ error: message, loading: false });
        throw new Error(message);
      } else {
        console.error("unexpected error in signup store:", error);
        set({ error: "Something went wrong.", loading: false });
        throw error;
      }
    }
  },
  login: async (data) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post(`/api/auth/login`, data);
      set({ user: res.data, loading: false });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.detail ?? "Login failed. Please try again.";
        console.error("error in login store:", message);
        set({ error: message, loading: false });
        throw new Error(message);
      } else {
        console.error("unexpected error in login store:", error);
        set({ error: "Something went wrong.", loading: false });
        throw error;
      }
    }
  },
  logout: async () => {
    try {
      set({ loading: true, error: null });
      await api.post("/api/auth/logout");
      set({ user: null, loading: false });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error?.response?.data.detail ?? "Logout failed. please try again.";
        console.error("error in logout store: ", message);
        throw new Error(message);
      } else {
        console.error("unexpected error in logout store: ", error);
        set({ error: "something went wrong", loading: false });
        throw error;
      }
    }
  },
  profile: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get("/api/user/profile");
      set({ user: res.data, loading: false });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error?.response?.data.detail ?? "error in fetching profile";
        console.error("error in profile store: ", message);
        throw new Error(message);
      } else {
        console.error("unexpected error in profile store: ", error);
        set({ error: "something went wrong", loading: false });
        throw error;
      }
    }
  },
}));
