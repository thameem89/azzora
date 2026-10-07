export const quotationStatuses = [
  "Draft",
  "Finalized",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
  "Revised",
] as const;
export type QuotationStatus = (typeof quotationStatuses)[number];
export const pricingTypes = [
  "Normal Rate",
  "FOC",
  "By Client",
  "Excluded",
  "Heading",
  "Included",
] as const;
export type PricingType = (typeof pricingTypes)[number];
export interface QuotationCustomerSnapshot {
  name: string;
  contact: string;
  address: string;
  email: string;
  phone: string;
}
export interface QuotationProjectSnapshot {
  name: string;
  location: string;
}
export interface QuotationCompanyDetails {
  name: string;
  location: string;
  email: string;
  phone: string;
}
export interface QuotationLineItem {
  id: string;
  parentId?: string;
  number: string;
  description: string;
  location: string;
  quantity: string;
  unit: string;
  rate: string;
  pricingType: PricingType;
  notes: string;
  amountOverride?: string;
  overrideReason?: string;
  minHeight?: number;
  pageBreakBefore?: boolean;
  pageLogo?: boolean;
  priceSpanRows?: number;
}
export interface QuotationSection {
  id: string;
  number: string;
  title: string;
  parentId?: string;
  rows: QuotationLineItem[];
}
export interface QuotationPaymentTerm {
  id: string;
  number: string;
  description: string;
  percentage: string;
  notes: string;
  amountOverride?: string;
}
export interface QuotationTermCondition {
  id: string;
  number: string;
  text: string;
  pageBreakBefore?: boolean;
}
export interface QuotationRevision {
  date: string;
  notes: string;
  sourceId?: string;
}
export interface Quotation {
  id: string;
  familyId: string;
  number: string;
  date: string;
  reference: string;
  revision: number;
  revisionDetails: QuotationRevision;
  status: QuotationStatus;
  customerId: string;
  projectId: string;
  customer: QuotationCustomerSnapshot;
  project: QuotationProjectSnapshot;
  company: QuotationCompanyDetails;
  preparedBy: string;
  validity: string;
  vatEnabled: boolean;
  vatPercentage: string;
  introduction: {
    attention: string;
    opening: string;
    proposal: string;
    quality: string;
    clarification: string;
    closing: string;
    signature: string;
  };
  sections: QuotationSection[];
  payments: QuotationPaymentTerm[];
  terms: QuotationTermCondition[];
  amountWordsOverride: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  history: { date: string; action: string; notes: string; snapshot?: string }[];
}
