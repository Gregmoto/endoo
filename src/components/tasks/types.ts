export type TaskStatus   = "open" | "in_progress" | "done" | "cancelled"
export type TaskPriority = "low" | "normal" | "high" | "urgent"
export type TaskEntityType = "contact" | "invoice" | "supplier_invoice" | "journal" | "project" | "contract"

export interface TaskUser {
  id:        string
  fullName:  string
  email?:    string
  avatarUrl: string | null
}

export interface TaskAssignment {
  id:     string
  userId: string
  user:   TaskUser
}

export interface TaskComment {
  id:        string
  body:      string
  authorId:  string
  author:    TaskUser
  editedAt:  string | null
  createdAt: string
}

export interface Task {
  id:               string
  organizationId:   string
  title:            string
  description:      string | null
  status:           TaskStatus
  priority:         TaskPriority
  entityType:       TaskEntityType | null
  entityId:         string | null
  dueDate:          string | null
  remindAt:         string | null
  completedAt:      string | null
  completedByUserId:string | null
  createdByUserId:  string
  createdBy:        TaskUser
  createdAt:        string
  updatedAt:        string
  assignments:      TaskAssignment[]
  comments?:        TaskComment[]
  commentCount?:    number
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  open:        "Öppen",
  in_progress: "Pågår",
  done:        "Klar",
  cancelled:   "Avbruten",
}

export const STATUS_CLS: Record<TaskStatus, string> = {
  open:        "text-gray-600 bg-gray-100",
  in_progress: "text-blue-700 bg-blue-50",
  done:        "text-green-700 bg-green-50",
  cancelled:   "text-gray-400 bg-gray-50",
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:    "Låg",
  normal: "Normal",
  high:   "Hög",
  urgent: "Brådskande",
}

export const PRIORITY_CLS: Record<TaskPriority, string> = {
  low:    "text-gray-400",
  normal: "text-gray-600",
  high:   "text-orange-600",
  urgent: "text-red-600",
}

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  low:    "bg-gray-300",
  normal: "bg-gray-500",
  high:   "bg-orange-500",
  urgent: "bg-red-500",
}

export const ENTITY_LABELS: Record<TaskEntityType, string> = {
  contact:          "Kund",
  invoice:          "Faktura",
  supplier_invoice: "Lev.faktura",
  journal:          "Verifikat",
  project:          "Projekt",
  contract:         "Avtal",
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false
  if (task.status === "done" || task.status === "cancelled") return false
  return new Date(task.dueDate) < new Date()
}

export function formatDue(dueDate: string): string {
  const d    = new Date(dueDate)
  const now  = new Date()
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000)
  if (diff === 0)  return "Idag"
  if (diff === 1)  return "Imorgon"
  if (diff === -1) return "Igår"
  if (diff < 0)   return `${Math.abs(diff)} dagar sedan`
  if (diff < 7)   return `Om ${diff} dagar`
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
}
