import axios from "axios";
import type { User } from "./types";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface Chef {
  id: string;
  name: string;
  email: string;
  phone: string;
  kitchenName: string;
  location: string;
  businessHours: string;
  verifiedStatus: boolean;
  totalSales: number;
  ratings: number;
  joinedOn: string;
}

interface ChefVerification {
  chefId: string;
  status: "pending" | "approved" | "rejected";
}

export type OrderStatus = "Ordered" | "Preparing" | "Dispatched" | "Delivered" | "Canceled"

export interface OrderItem {
  name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  userId: string
  userName: string
  chefId: string
  chefName: string
  items: OrderItem[]
  totalPrice: number
  status: OrderStatus
  orderTimestamp: string
  deliveryAddress: string
  paymentMethod: string
  paymentStatus: "Paid" | "Pending" | "Failed" | "Refunded"
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | { text: string; formatting: string };
  price: number;
  category: string;
  subcategory?: string | null;
  cuisine: string;
  dietaryInfo: string[];
  status: "available" | "out-of-stock" | "coming-soon";
  preparationTime: number;
  rating: number;
  imageUrl?: string;
  tags?: string[];
  moodTag?: 'good' | 'angry' | 'in_love' | 'sad' | null;
  hungerLevelTag?: 'little_hungry' | 'quite_hungry' | 'very_hungry' | 'super_hungry' | null;
  allergens?: string[];
  recommendedItems?: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Complaint {
  id: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  description: string
  status: "open" | "in-progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  submittedAt: string
  resolvedAt?: string
  category: string
}

// Use a single public env var for the frontend to reach the backend API.
// Prefer NEXT_PUBLIC_API_URL (e.g. http://localhost:5000/api). Fall back to a sensible default.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add request interceptor to include token from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Token management utility
export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminToken', token);
    }
  } else {
    delete api.defaults.headers.common["Authorization"];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
    }
  }
}


export const usersApi = {
  listUsers: (search = "", status = "", preference = "", page = 1, limit = 10) =>
    api.get<{ users: User[]; total: number }>("/admin/users", {
      params: { search, status, preference, page, limit },
      withCredentials: true,
    }),
  getUserDetails: (userId: string) => api.get<User>(`/admin/users/${userId}`),
  updateUser: (userId: string, data: Partial<User>) =>
    api.put<User>(`/admin/users/${userId}`, data),
  addUser: (data: Omit<User, "id" | "registeredOn" | "orders">) => api.post<User>("/admin/users", data),
  exportUsers: () => api.get<Blob>("/admin/users-export", { responseType: "blob" }),
  deleteUser: (userId: string) => api.delete<void>(`/admin/users/${userId}`),
};

export const authApi = {
  login: (data: { email: string; password: string }) => api.post<{ token: string; user: AuthUser }>("/admin/auth/login", data),
  signup: (data: { name: string; email: string; password: string; phone: string }) => api.post<{ message: string; user: AuthUser }>("/admin/auth/signup", data),
};

export const chefsApi = {
  listAllChefs: (search = "", status = "", page = 1, limit = 10) =>
    api.get<{ chefs: Chef[]; total: number }>("/admin/chefs", {
      params: { search, status, page, limit },
      withCredentials: true,
    }),
  listVerifiedChefs: (search = "", page = 1, limit = 10) =>
    api.get<{ chefs: Chef[]; total: number }>("/admin/chefs-verified", {
      params: { search, page, limit },
      withCredentials: true,
    }),
  listPendingVerificationChefs: (search = "", page = 1, limit = 10) =>
    api.get<{ chefs: Chef[]; total: number }>("/admin/chefs-pending", {
      params: { search, page, limit },
      withCredentials: true,
    }),
  getChefDetails: (chefId: string) => api.get<Chef>(`/admin/chefs/${chefId}`, { withCredentials: true }),
  updateChef: (chefId: string, data: Partial<Chef>) =>
    api.put<Chef>(`/admin/chefs/${chefId}`, data, { withCredentials: true }),
  addChef: (data: Omit<Chef, "id" | "joinedOn" | "totalSales" | "ratings">) => api.post<Chef>("/admin/chefs", data, { withCredentials: true }),
  exportChefs: () => api.get<Blob>("/admin/chefs-export", { responseType: "blob", withCredentials: true }),
  deleteChef: (chefId: string) => api.delete<void>(`/admin/chefs/${chefId}`, { withCredentials: true }),
};

export const chefVerificationsApi = {
  listVerificationRequests: () => api.get<{ verifications: ChefVerification[]; total: number }>("/admin/chef-verifications", { withCredentials: true }),
  approveVerification: (chefId: string) => api.put<{ message: string }>(`/admin/chef-verifications/${chefId}/approve`, undefined, { withCredentials: true }),
  rejectVerification: (chefId: string) => api.put<{ message: string }>(`/admin/chef-verifications/${chefId}/reject`, undefined, { withCredentials: true }),
};

export const ordersApi = {
  listOrders: (search = "", status = "", paymentStatus = "", page = 1, limit = 10) =>
    api.get<{ orders: Order[]; total: number }>("/admin/recent-orders", {
      params: { search, status, paymentStatus, page, limit },
      withCredentials: true,
    }),
  getOrderDetails: (orderId: string) => api.get<Order>(`/admin/orders/${orderId}`, { withCredentials: true }),
  updateOrderStatus: (orderId: string, data: { status?: OrderStatus; paymentStatus?: "Paid" | "Pending" | "Failed" | "Refunded" }) =>
    api.put<Order>(`/admin/orders/${orderId}`, data, { withCredentials: true }),
  exportOrders: () => api.get<Blob>("/admin/orders-export", { responseType: "blob", withCredentials: true }),
};

export const menuItemsApi = {
  listMenuItems: (search = "", status = "", category = "", page = 1, limit = 10) =>
    api.get<{ menuItems: MenuItem[]; total: number }>("/admin/menu-items", {
      params: { search, status, category, page, limit },
      withCredentials: true,
    }),
  getMenuItemDetails: (menuItemId: string) => api.get<MenuItem>(`/admin/menu-items/${menuItemId}`, { withCredentials: true }),
  updateMenuItem: (menuItemId: string, data: Partial<MenuItem> | FormData) => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    return api.put<MenuItem>(`/admin/menu-items/${menuItemId}`, data, { 
      withCredentials: true,
      headers
    });
  },
  addMenuItem: (data: Partial<MenuItem> | FormData) => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    return api.post<MenuItem>("/admin/menu-items", data, { 
      withCredentials: true,
      headers
    });
  },
  exportMenuItems: () => api.get<Blob>("/admin/menu-items-export", { responseType: "blob", withCredentials: true }),
  deleteMenuItem: (menuItemId: string) => api.delete<void>(`/admin/menu-items/${menuItemId}`, { withCredentials: true }),
};

export const complaintsApi = {
  listComplaints: (search = "", status = "", priority = "", category = "", page = 1, limit = 10) =>
    api.get<{ complaints: Complaint[]; total: number }>("/admin/complaints", {
      params: { search, status, priority, category, page, limit },
      withCredentials: true,
    }),
  getComplaintDetails: (complaintId: string) => api.get<Complaint>(`/admin/complaints/${complaintId}`, { withCredentials: true }),
  updateComplaint: (complaintId: string, data: Partial<Complaint>) =>
    api.put<Complaint>(`/admin/complaints/${complaintId}`, data, { withCredentials: true }),
  addComplaint: (data: Omit<Complaint, "id" | "submittedAt" | "resolvedAt">) => api.post<Complaint>("/admin/complaints", data, { withCredentials: true }),
  exportComplaints: () => api.get<Blob>("/admin/complaints-export", { responseType: "blob", withCredentials: true }),
  deleteComplaint: (complaintId: string) => api.delete<void>(`/admin/complaints/${complaintId}`, { withCredentials: true }),
};

// Dashboard stats (chart & summary data)
export interface DashboardStats {
  totals: {
    users: number;
    chefs: number;
    orders: number;
    issues: number;
  };
  trends: {
    months: string[];
    users: number[];
    chefs: number[];
    orders: number[];
    issues: number[];
  };
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>("/admin/stats", { withCredentials: true }),
};

export default api;
