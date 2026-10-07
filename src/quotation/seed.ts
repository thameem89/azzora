import type {
  Quotation,
  QuotationSection,
  QuotationTermCondition,
} from "./model";
import reference from "./reference.json";
import { today, uid } from "../domain/logic";
export const defaultCompany = {
  name: "AZZORA DESIGN TECHNICAL SERVICEs LLC",
  location: "Dubai, UAE",
  email: "info@azzora.ae",
  phone: "+971 56 333 9288",
};
export const defaultIntroduction = {
  attention: "Dear:  Mr. Roshan Lanesol",
  opening:
    "Thank you for giving us an opportunity and expressing interest in our services. We are pleased to quote our best price, and details are as below.",
  proposal:
    "With reference to the above-mentioned project, we are pleased to submit our costing proposal for the scope of work detailed herein. Based on our discussions, we confirm our willingness to execute the complete scope of works for the agreed contract value as outlined in the attached quotation.",
  quality:
    "We are committed to delivering the project to the highest standards of quality, safety, and professionalism, while ensuring timely completion and client satisfaction. We value the opportunity to work with your esteemed organization and look forward to establishing a strong and long-term business relationship founded on mutual trust, transparency, and continued cooperation.",
  clarification:
    "Should you require any further clarification or additional information, please do not hesitate to contact us. We appreciate your consideration and look forward to your favorable response.",
  closing: "Thank you for the opportunity.",
  signature:
    "AZZORA DESIGN TECHNICAL SERVICEs LLC\nDubai, UAE\nEmail: info@azzora.ae\nMob : +971 56 333 9288",
};
export const defaultTermTexts = [
  "Any works to be done other than listed are subject to extra cost and time.",
  "Work Will start after receive the LPO",
  "Completion time - To be agreed.",
  "Works will be started only after a formal contract / purchase order accepted by both parties",
  "Delays in statutory/local authority / govt. departments are not contractors responsibility",
  "Night work & Authority permission excluded.",
  "All gate pass / police permission- all supportive documents provided by client.",
  "Safe storage for keeping materials to be provided.",
  "Any additional requirement or Comments from Municipality, Civil Défense, Electricity.",
  "All material finishes as per approved sample.",
  "The contractor’s obligations and responsibilities are strictly confined to the scope of work as defined in this agreement. This includes delivering the specified services, materials, and workmanship within the agreed-upon parameters. The contractor shall not bear any liability or responsibility for tasks, actions, or issues that fall outside the defined scope, including but not limited to, the work of external parties, third-party contractors, suppliers, or any unforeseen circumstances arising from their involvement. Furthermore, any impact caused by delays, defects, or non-compliance by external entities will not be attributed to the contractor, provided the contractor has fulfilled their duties as per this agreement",
];
export const defaultTerms = (): QuotationTermCondition[] =>
  defaultTermTexts.map((text, i) => ({
    id: uid(),
    number: String(i + 1),
    text,
  }));
export function blankQuotation(number: string): Quotation {
  const now = new Date().toISOString();
  return {
    id: uid(),
    familyId: uid(),
    number,
    date: today(),
    reference: "",
    revision: 0,
    revisionDetails: { date: today(), notes: "" },
    status: "Draft",
    customerId: "",
    projectId: "",
    customer: { name: "", contact: "", address: "", email: "", phone: "" },
    project: { name: "", location: "" },
    company: { ...defaultCompany },
    preparedBy: "Sarah Mansoor",
    validity: "30 days",
    vatEnabled: true,
    vatPercentage: "5",
    introduction: { ...defaultIntroduction, attention: "Dear: " },
    sections: [],
    payments: [
      {
        id: uid(),
        number: "1",
        description: "Advance with LPO",
        percentage: "50",
        notes: "",
      },
      {
        id: uid(),
        number: "2",
        description: "50% of work progress",
        percentage: "45",
        notes: "",
      },
      {
        id: uid(),
        number: "3",
        description: "After Handover 15 days from the date of invoice",
        percentage: "5",
        notes: "",
      },
    ],
    terms: defaultTerms(),
    amountWordsOverride: "",
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}
export function referenceQuotation(): Quotation {
  const q = blankQuotation("QTN-AF-26049");
  Object.assign(q, {
    id: "quotation-reference",
    familyId: "quotation-reference",
    date: "2026-09-30",
    revisionDetails: {
      date: "2026-09-30",
      notes: "Transcribed from the supplied seven-page quotation.",
    },
    customerId: "client-roshan",
    customer: {
      ...q.customer,
      name: "Mr. Roshan Lanesol",
      contact: "Mr. Roshan Lanesol",
    },
    project: {
      name: "Apartment Renovation",
      location: "M801 Apartment, Business bay, Dubai, UAE",
    },
    introduction: { ...defaultIntroduction },
    sections: structuredClone(reference) as QuotationSection[],
    amountWordsOverride:
      "Two Hundred Ten Thousand Three Hundred Thirty Six Dirhams and Seventy Eight Fills",
  });
  q.payments[0].amountOverride = "105168.39";
  q.payments[1].amountOverride = "94651.55";
  q.terms[3].pageBreakBefore = true;
  q.history.push({
    date: q.createdAt,
    action: "Reference imported",
    notes:
      "Source spelling, numbering, merged painting lump sum and two amount inconsistencies preserved.",
  });
  return q;
}
