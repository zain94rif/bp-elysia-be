export interface Employee {
  id: string;
  nik: string;
  kpj: string;
  full_name: string;
  phone: string;
  email: string;
  birth_place: string;
  birth_date: string | Date;
  address: string;
  photo_path?: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface EmployeeQuery {
  search?: string;
  field?: string;
  page?: number;
  limit?: number;
}
