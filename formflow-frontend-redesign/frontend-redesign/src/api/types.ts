export type FieldType = 'text' | 'number' | 'email' | 'date' | 'dropdown' | 'checkbox' | 'radio' | 'file' | 'rating'
export type Operator = 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'not_empty'

export interface User { id: number; full_name: string; email: string; role_name: 'admin' | 'user'; is_active: boolean; created_at: string }
export interface Option { id: number; label: string; value: string; order_index: number }
export interface Field {
  id: number; form_id: number; label: string; field_type: FieldType; placeholder: string | null; help_text: string | null
  is_required: boolean; order_index: number; min_value: number | null; max_value: number | null
  cond_field_id: number | null; cond_operator: Operator | null; cond_value: string | null; options: Option[]
}
export interface Form {
  id: number; title: string; description: string | null; slug: string; owner_id: number; is_active: boolean
  is_public: boolean; allow_response_editing: boolean; created_at: string; updated_at: string; fields: Field[]
}
export interface FormListItem {
  id: number; title: string; description: string | null; slug: string; owner_id: number; owner_name: string
  is_active: boolean; is_public: boolean; allow_response_editing: boolean; field_count: number; response_count: number
  created_at: string; updated_at: string
}
export interface Page<T> { items: T[]; total: number; page: number; size: number; pages: number }
export interface Answer { field_id: number; label: string; field_type: string; value: any }
export interface FormResponse {
  id: number; form_id: number; form_title: string | null; user_id: number | null; submitted_by: string | null
  created_at: string; updated_at: string; answers: Answer[]
}
export interface HistoryItem {
  id: number; action: string; changed_by_name: string | null; created_at: string
  changes: { field_id: number; label: string; old: any; new: any }[]
}
export interface Upload { file_id: string; original_name: string; size: number; url: string }
export interface Dashboard {
  total_forms: number; active_forms: number; disabled_forms: number; total_responses: number; responses_today: number
  total_users: number | null; responses_per_day: { date: string; count: number }[]; top_forms: { form_id: number; title: string; responses: number }[]
}
export interface FieldStat {
  field_id: number; label: string; field_type: string; answered: number; skipped: number
  distribution: Record<string, number> | null; average: number | null; minimum: number | null; maximum: number | null; samples: any[] | null
}
export interface FormAnalytics {
  form_id: number; title: string; total_responses: number; authenticated_responses: number; anonymous_responses: number
  last_response_at: string | null; responses_per_day: { date: string; count: number }[]; fields: FieldStat[]
}
export interface ActivityLog {
  id: number; user_id: number | null; user_name: string | null; action: string; entity_type: string
  entity_id: number | null; details: any; ip_address: string | null; created_at: string
}
