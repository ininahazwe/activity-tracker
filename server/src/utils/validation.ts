import { z } from "zod";

// ─── AUTH ───
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ─── USER ───
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(["ADMIN", "MANAGER", "FIELD"]),
  projectIds: z.array(z.string()).min(1, "At least one project required"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["ADMIN", "MANAGER", "FIELD"]).optional(),
  status: z.enum(["ACTIVE", "INVITED", "INACTIVE"]).optional(),
  projectIds: z.array(z.string()).optional(),
});

// ─── LOCATION ───
const locationSchema = z.object({
  city: z.string().max(100).optional().default(""),
  region: z.string().max(100).optional().default(""),
  country: z.string().max(100),
  dateStart: z.string(), // ISO date string
  dateEnd: z.string().optional().default(""),
});

// ─── ACTIVITY ───
export const createActivitySchema = z.object({
  projectId: z.string(),
  activityTitle: z.string().min(3, "Title must be at least 3 characters").max(500),
  projectName: z.string().max(200).optional(),
  projectTitle: z.string().max(200).optional(),
  consortium: z.string().max(100).optional(),
  implementingPartners: z.string().max(500).optional(),

  locations: z.array(locationSchema).min(1, "At least one location required"),

  activityTypes: z.array(z.string()).min(1, "At least one activity type required"),
  targetGroups: z.array(z.string()).min(1, "At least one target group required"),
  thematicFocus: z.array(z.string()).min(1, "At least one thematic focus required"),
  funders: z.array(z.string()).min(1, "At least one funder required"),

  maleCount: z.number().int().min(0).optional().default(0),
  femaleCount: z.number().int().min(0).optional().default(0),
  nonBinaryCount: z.number().int().min(0).optional().default(0),
  ageUnder25: z.number().int().min(0).optional().default(0),
  age25to40: z.number().int().min(0).optional().default(0),
  age40plus: z.number().int().min(0).optional().default(0),
  disabilityYes: z.number().int().min(0).optional().default(0),
  disabilityNo: z.number().int().min(0).optional().default(0),

  keyOutputs: z.string().optional().default(""),
  immediateOutcomes: z.string().optional().default(""),
  skillsGained: z.string().optional().default(""),
  actionsTaken: z.string().optional().default(""),
  meansOfVerification: z.string().optional().default(""),
  evidenceAvailable: z.string().optional().default(""),

  policiesInfluenced: z.string().optional().default(""),
  institutionalChanges: z.string().optional().default(""),
  commitmentsSecured: z.string().optional().default(""),

  mediaMentions: z.string().optional().default(""),
  publicationsProduced: z.string().optional().default(""),

  genderOutcomes: z.string().optional().default(""),
  inclusionMarginalised: z.string().optional().default(""),
  womenLeadership: z.string().optional().default(""),
  newPartnerships: z.string().optional().default(""),
  existingPartnerships: z.string().optional().default(""),
});

export const updateActivitySchema = createActivitySchema.partial();

export const validateActivitySchema = z.object({
  status: z.enum(["VALIDATED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

// ─── FINANCE ───
export const createFinanceSchema = z.object({
  projectId: z.string(),
  funder: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USD"),
  status: z.enum(["NEW", "CONTINUOUS"]),
  year: z.number().int().min(2000).max(2100),
  notes: z.string().optional(),
});

export const updateFinanceSchema = createFinanceSchema.partial();

// ─── QUERY PARAMS ───
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const activityFilterSchema = paginationSchema.extend({
  projectId: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"]).optional(),
  country: z.string().optional(),
  funder: z.string().optional(),
  thematic: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
