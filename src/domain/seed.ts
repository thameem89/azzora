import type { Database, Project, Task, HandoverItem } from "./model";
import { roles } from "./model";
import { addDays, today, uid } from "./logic";
export const templates = [
  {
    name: "Planning",
    weight: 10,
    tasks: [
      "Site Survey",
      "Project Kickoff",
      "Scope Confirmation",
      "Baseline Programme",
    ],
  },
  {
    name: "Design",
    weight: 20,
    tasks: [
      "Concept Design",
      "Moodboard",
      "Layout Approval",
      "3D Design",
      "Detailed Drawings",
      "MEP Coordination",
    ],
  },
  { name: "Client Approval", weight: 5, tasks: ["Client Design Approval"] },
  {
    name: "Procurement",
    weight: 15,
    tasks: [
      "BOQ Confirmation",
      "Material Selection",
      "Supplier Confirmation",
      "Purchase Orders",
      "Material Delivery",
    ],
  },
  {
    name: "Mobilization",
    weight: 5,
    tasks: ["Site Setup", "Permits", "Protection Works"],
  },
  {
    name: "Execution",
    weight: 35,
    tasks: [
      "Demolition",
      "Civil Works",
      "MEP First Fix",
      "Ceiling Closure",
      "Flooring",
      "Joinery",
      "Painting",
      "MEP Second Fix",
      "Lighting",
      "Furniture",
    ],
  },
  {
    name: "QA / Snagging",
    weight: 7,
    tasks: [
      "Internal Inspection",
      "Snag List",
      "Snag Rectification",
      "Final QA",
    ],
  },
  {
    name: "Handover",
    weight: 3,
    tasks: [
      "Client Inspection",
      "Handover Documents",
      "Final Approval",
      "Project Close",
    ],
  },
];
export function generatePlan(db: Database, p: Project, standard = true) {
  templates.forEach((template, i) => {
    const phaseId = uid();
    db.phases.push({
      id: phaseId,
      projectId: p.id,
      name: template.name,
      weight: template.weight,
      order: i,
    });
    if (standard)
      template.tasks.forEach((name, j) => {
        const start = addDays(p.start, i * 10 + j * 2);
        const id = uid();
        db.tasks.push({
          id,
          projectId: p.id,
          phaseId,
          name,
          description: `${name} for ${p.name}`,
          assigneeId: p.managerId,
          start,
          due: addDays(start, 3),
          progress: 0,
          status: "Not Started",
          priority: "Normal",
          dependencies: [],
          allocation: 5,
          trade: name.includes("MEP")
            ? "MEP"
            : name.includes("Joinery")
              ? "Joinery"
              : template.name === "Design"
                ? "Interior Design"
                : name.includes("Painting")
                  ? "Painting"
                  : name.includes("Ceiling")
                    ? "Ceiling"
                    : "Civil",
          notes: "",
          attachments: [],
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (j === template.tasks.length - 1)
          db.milestones.push({
            id: uid(),
            projectId: p.id,
            name: template.name + " complete",
            due: addDays(start, 3),
            taskId: id,
          });
      });
  });
  const chain = [
    "MEP First Fix",
    "Ceiling Closure",
    "Painting",
    "MEP Second Fix",
  ];
  if (standard)
    chain.forEach((name, i) => {
      if (i) {
        const task = db.tasks.find(
          (t) => t.projectId === p.id && t.name === name,
        );
        const predecessor = db.tasks.find(
          (t) => t.projectId === p.id && t.name === chain[i - 1],
        );
        if (task && predecessor) task.dependencies = [predecessor.id];
      }
    });
  const groups: Record<string, string[]> = {
    "Site Completion": ["All tasks complete", "Final cleaning complete"],
    Quality: [
      "All snags closed",
      "Final QA complete",
      "Client inspection complete",
    ],
    Documents: [
      "As-built drawings uploaded",
      "Warranties uploaded",
      "O&M manuals uploaded",
      "Final photographs uploaded",
    ],
    Client: ["Keys/access handed over", "Client sign-off"],
    Commercial: ["Commercial closure confirmed"],
  };
  Object.entries(groups).forEach(([group, names]) =>
    names.forEach((name) =>
      db.handover.push({
        id: uid(),
        projectId: p.id,
        group,
        name,
        required: true,
        applicable: true,
        complete: false,
        automatic:
          name === "All tasks complete"
            ? "tasks"
            : name === "All snags closed"
              ? "snags"
              : undefined,
      } satisfies HandoverItem),
    ),
  );
}
export function seed(): Database {
  const db: Database = {
    version: 1,
    people: [],
    clients: [],
    projects: [],
    phases: [],
    assignments: [],
    tasks: [],
    milestones: [],
    updates: [],
    snags: [],
    documents: [],
    handover: [],
    activities: [],
  };
  const names = [
    "Sarah Mansoor",
    "Marcus Vance",
    "Elena Rostova",
    "Zaid Kareem",
    "Layla Hassan",
    "Omar Faris",
    "Nadia Saleh",
    "Rami Khalil",
    "Maya Nasser",
    "Ali Rahman",
    "Noor Haddad",
    "Karim Samir",
    "Dina Abbas",
    "Yusuf Amin",
    "Sara Nabil",
    "Faisal Hamad",
  ];
  names.forEach((name, i) =>
    db.people.push({
      id: "person-" + i,
      name,
      role: roles[i % roles.length],
      email: name.toLowerCase().replace(" ", ".") + "@example.com",
      phone: "+971 50 000 " + String(i).padStart(4, "0"),
      status: "Active",
      capacity: 100,
    }),
  );
  const projects = [
    [
      "Downtown Corporate Office",
      "Apex Capital Holdings",
      "Downtown Dubai",
      "Office Fit-Out",
      8450000,
    ],
    [
      "Palm Jumeirah Private Villa",
      "Al-Zahra Residence",
      "Palm Jumeirah",
      "Villa",
      14200000,
    ],
    [
      "Business Bay Retail Flagship",
      "Maison Atelier",
      "Business Bay",
      "Retail",
      5900000,
    ],
    [
      "Abu Dhabi Executive Office",
      "Crescent Group",
      "Al Maryah Island",
      "Office Fit-Out",
      11800000,
    ],
    [
      "Dubai Hills Luxury Villa",
      "The Orchard Family",
      "Dubai Hills Estate",
      "Villa",
      6200000,
    ],
    [
      "JLT Office Renovation",
      "Northstar Studio",
      "Jumeirah Lakes Towers",
      "Office Fit-Out",
      2400000,
    ],
    [
      "Jumeirah Dining Studio",
      "Saffron Hospitality",
      "Jumeirah",
      "Restaurant / F&B",
      3800000,
    ],
  ] as const;
  projects.forEach(([name, client, location, type, value], i) => {
    const id = "project-" + i;
    const date = today();
    db.clients.push({
      id: "client-" + i,
      name: client,
      contact: "Client representative (demo)",
    });
    const p: Project = {
      id,
      code: "AZ-" + String(26 + i).padStart(3, "0"),
      name,
      clientId: "client-" + i,
      location,
      emirate: i === 3 ? "Abu Dhabi" : "Dubai",
      building: location,
      unit: "Unit " + (100 + i),
      area: 400 + i * 100,
      scope: "Complete interior design and fit-out works.",
      disciplines: ["Interior Design", "Civil", "MEP", "Joinery"],
      type,
      value,
      start: addDays(date, -65 + i * 8),
      due: addDays(date, 25 + i * 9),
      managerId: "person-" + (i % 3),
      priority: i === 1 ? "High" : "Normal",
      status: "Active",
    };
    db.projects.push(p);
    generatePlan(db, p);
    db.assignments.push(
      ...roles.map((role, r) => ({
        id: uid(),
        projectId: id,
        personId: "person-" + ((i + r) % 16),
        role,
        start: p.start,
        end: p.due,
        responsibility: role + " delivery",
        status: "Active" as const,
      })),
    );
    db.tasks
      .filter((t) => t.projectId === id)
      .forEach((t, j) => {
        t.assigneeId = "person-" + ((i + j) % 16);
        const phase = db.phases.find((ph) => ph.id === t.phaseId)!;
        t.progress =
          phase.order < (i === 3 ? 7 : i === 0 ? 5 : 3)
            ? 100
            : phase.order === (i === 3 ? 7 : i === 0 ? 5 : 3)
              ? (j % 3) * 35
              : 0;
        t.status =
          t.progress === 100
            ? "Completed"
            : t.progress > 0
              ? "In Progress"
              : "Not Started";
        if (t.status === "Completed") t.completedAt = t.updatedAt;
      });
    const target = db.tasks.find(
      (t) => t.projectId === id && t.status !== "Completed",
    )!;
    target.start = addDays(date, -3);
    target.due = addDays(date, i % 2 === 0 ? 3 : -1);
    if (i === 1) target.status = "Blocked";
    db.updates.push({
      id: uid(),
      projectId: id,
      date: addDays(date, -i % 3),
      completed: "Site protection and setting out verified.",
      inProgress: "Joinery installation and coordinated MEP works.",
      issue: i === 1 ? "Joinery sample approval pending." : "",
      tomorrow: "Continue planned installation and inspection.",
      manpower: 14 + i,
      notes: "Daily supervisor report — fictional demo.",
      authorId: "person-6",
      photos: [],
    });
    db.snags.push({
      id: uid(),
      reference: "SN-" + String(i + 1).padStart(3, "0"),
      projectId: id,
      area: "Reception",
      description: "Align ceiling reveal at reception entrance.",
      assigneeId: "person-" + (i + 3),
      priority: "Normal",
      createdAt: new Date().toISOString(),
      due: addDays(date, 7),
      status: i === 3 ? "Closed" : "Assigned",
      before: [],
      after: [],
      inspection: "Check against approved detail.",
      createdBy: "person-6",
    });
    db.documents.push(
      {
        id: uid(),
        projectId: id,
        name: "Approved layout — " + p.code,
        category: "Design Drawings",
        status: "Approved",
        version: 1,
        uploadedAt: date,
        uploadedBy: "person-1",
      },
      {
        id: uid(),
        projectId: id,
        name: "Material submittal — " + p.code,
        category: "Approvals",
        status: i === 1 ? "Pending" : "Approved",
        version: 1,
        uploadedAt: date,
        uploadedBy: "person-2",
      },
    );
  });
  return db;
}
export function blankTask(
  projectId: string,
  phaseId: string,
  assigneeId: string,
): Task {
  const now = new Date().toISOString();
  return {
    id: uid(),
    projectId,
    phaseId,
    name: "",
    description: "",
    assigneeId,
    start: today(),
    due: addDays(today(), 7),
    progress: 0,
    status: "Not Started",
    priority: "Normal",
    dependencies: [],
    allocation: 10,
    trade: "Civil",
    notes: "",
    attachments: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
  };
}
