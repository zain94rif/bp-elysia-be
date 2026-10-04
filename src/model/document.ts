export interface EmployeeDocument {
  id: string;
  employee_id: string;
  type: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: Date;
}
