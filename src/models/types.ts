// Core data types for the application

export interface AdminUser {
  id?: number;
  username: string;
  email: string;
  password_hash?: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export interface BillingPlan {
  id?: number;
  name: string;
  description?: string;
  price: number;
  time_limit?: number; // in minutes
  data_limit?: number; // in bytes
  speed_limit_up?: number; // in kbps
  speed_limit_down?: number; // in kbps
  validity_period: number; // in days
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HotspotUser {
  id?: number;
  username: string;
  password: string;
  billing_plan_id?: number;
  email?: string;
  phone?: string;
  full_name?: string;
  address?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  data_used: number;
  time_used: number; // in minutes
  last_login?: string;
  billing_plan?: BillingPlan;
}

export interface Voucher {
  id?: number;
  code: string;
  billing_plan_id: number;
  batch_id?: string;
  is_used: boolean;
  used_by_user_id?: number;
  created_at?: string;
  updated_at?: string;
  used_at?: string;
  expires_at?: string;
  billing_plan?: BillingPlan;
  used_by_user?: HotspotUser;
}

export interface UserSession {
  id?: number;
  user_id: number;
  session_id: string;
  ip_address?: string;
  mac_address?: string;
  start_time?: string;
  end_time?: string;
  bytes_in: number;
  bytes_out: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  user?: HotspotUser;
}

export interface AdminLog {
  id?: number;
  admin_user_id: number;
  admin_username: string;
  action: string;
  target_type: 'user' | 'voucher' | 'billing_plan' | 'admin' | 'system' | 'report';
  target_id?: string;
  target_name?: string;
  details: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  timestamp: string;
  created_at?: string;
  admin_user?: AdminUser;
}

export interface SystemSetting {
  id?: number;
  key: string;
  value?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Query interfaces
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  search?: string;
  is_active?: boolean;
  billing_plan_id?: number;
  date_from?: string;
  date_to?: string;
}

// Request/Response types for API
export interface CreateBillingPlanRequest {
  name: string;
  description?: string;
  price: number;
  time_limit?: number; // in minutes
  data_limit?: number; // in bytes
  speed_limit_up?: number; // in kbps
  speed_limit_down?: number; // in kbps
  validity_period: number; // in days
}

export interface VoucherGenerationRequest {
  quantity: number;
  billing_plan_id: number;
  batch_id?: string;
  prefix?: string;
  validity_days: number;
}

export interface VoucherFilters {
  billing_plan_id?: number;
  is_used?: boolean;
  batch_id?: string;
  start_date?: Date;
  end_date?: Date;
}

export interface VoucherStatistics {
  total_vouchers: number;
  used_vouchers: number;
  expired_vouchers: number;
  active_vouchers: number;
  revenue_generated: number;
}

// Repository interface
export interface Repository<T> {
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  findById(id: number): Promise<T | null>;
  findAll(options?: PaginationOptions & FilterOptions): Promise<PaginatedResult<T>>;
  update(id: number, entity: Partial<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
}