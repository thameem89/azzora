import type { Quotation } from "../quotation/model";
export type TaskStatus =
  "Not Started" | "In Progress" | "Waiting" | "Blocked" | "Completed";
export type Priority = "Low" | "Normal" | "High" | "Critical";
export type SnagStatus =
  "Open" | "Assigned" | "Rectification" | "Ready for Inspection" | "Closed";
export interface Person {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: "Active" | "Away";
  capacity: number;
}
export interface Client {
  id: string;
  name: string;
  contact: string;
}
export interface Project {
  id: string;
  code: string;
  name: string;
  clientId: string;
  location: string;
  emirate: string;
  building: string;
  unit: string;
  area: number;
  scope: string;
  disciplines: string[];
  type: string;
  value: number;
  start: string;
  due: string;
  managerId: string;
  priority: Priority;
  status: "Active" | "Draft" | "On Hold" | "Completed";
}
export interface Phase {
  id: string;
  projectId: string;
  name: string;
  weight: number;
  order: number;
}
export interface Assignment {
  id: string;
  projectId: string;
  personId: string;
  role: string;
  start: string;
  end: string;
  responsibility: string;
  status: "Active" | "Replaced" | "Removed";
}
export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  category: string;
}
export interface Task {
  id: string;
  projectId: string;
  phaseId: string;
  parentId?: string;
  name: string;
  description: string;
  assigneeId: string;
  start: string;
  due: string;
  progress: number;
  status: TaskStatus;
  priority: Priority;
  dependencies: string[];
  allocation: number;
  trade: string;
  notes: string;
  attachments: Attachment[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  due: string;
  taskId: string;
}
export interface SiteUpdate {
  id: string;
  projectId: string;
  date: string;
  completed: string;
  inProgress: string;
  issue: string;
  tomorrow: string;
  manpower: number;
  notes: string;
  authorId: string;
  photos: Attachment[];
}
export interface Snag {
  id: string;
  reference: string;
  projectId: string;
  area: string;
  description: string;
  assigneeId: string;
  priority: Priority;
  createdAt: string;
  due: string;
  status: SnagStatus;
  before: Attachment[];
  after: Attachment[];
  inspection: string;
  createdBy: string;
  closedBy?: string;
  closedAt?: string;
}
export interface DocumentRecord {
  id: string;
  projectId: string;
  name: string;
  category: string;
  status: "Pending" | "Approved";
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  attachment?: Attachment;
}
export interface HandoverItem {
  id: string;
  projectId: string;
  group: string;
  name: string;
  required: boolean;
  applicable: boolean;
  complete: boolean;
  automatic?: "tasks" | "snags";
}
export interface Activity {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId: string;
  timestamp: string;
  summary: string;
  previous?: string;
}
export interface Database {
  version: 1;
  quotations: Quotation[];
  quotationNumbering: { prefix: string; next: number };
  people: Person[];
  clients: Client[];
  projects: Project[];
  phases: Phase[];
  assignments: Assignment[];
  tasks: Task[];
  milestones: Milestone[];
  updates: SiteUpdate[];
  snags: Snag[];
  documents: DocumentRecord[];
  handover: HandoverItem[];
  activities: Activity[];
}
export const taskStatuses: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Waiting",
  "Blocked",
  "Completed",
];
export const snagStatuses: SnagStatus[] = [
  "Open",
  "Assigned",
  "Rectification",
  "Ready for Inspection",
  "Closed",
];
export const priorities: Priority[] = ["Low", "Normal", "High", "Critical"];
export const roles = [
  "Project Manager",
  "Interior Designer",
  "Quantity Surveyor",
  "Site Engineer",
  "MEP Engineer",
  "Procurement Coordinator",
  "Site Supervisor",
];
export const trades = [
  "Interior Design",
  "Civil",
  "MEP",
  "Joinery",
  "Ceiling",
  "Flooring",
  "Painting",
  "Furniture",
  "Lighting",
  "Signage",
  "Other",
];
export const categories = [
  "Contracts",
  "Design Drawings",
  "Approvals",
  "BOQ",
  "Purchase Orders",
  "Material Submittals",
  "Site Documents",
  "QA / Inspection",
  "Handover",
  "Other",
];
export const emirates = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];
export const projectTypes = [
  "Office Fit-Out",
  "Retail",
  "Restaurant / F&B",
  "Villa",
  "Apartment",
  "Hospitality",
  "Commercial",
  "Other",
];
