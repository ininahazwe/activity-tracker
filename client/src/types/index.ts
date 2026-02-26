// ─── Enums ───
export type Role = "ADMIN" | "MANAGER" | "FIELD";
export type ActivityStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
export type FinanceStatus = "NEW" | "CONTINUOUS";
export type UserStatus = "ACTIVE" | "INVITED" | "INACTIVE";

// ─── Models ───
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  projects: ProjectSummary[];
  activityCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
}

export interface Project extends ProjectSummary {
  description?: string;
  extraFields?: Record<string, boolean>;
  isActive: boolean;
  _count: {
    activities: number;
    users: number;
    finances: number;
  };
}

export interface Location {
  countryId?: string;
  regionId?: string;
  cityId?: string;
  dateStart: string;
  dateEnd: string;
}

export interface Activity {
  id: string;
  projectId: string;
  project: ProjectSummary;
  createdById: string;
  createdBy: { id: string; name: string; email?: string };
  validatedBy?: { id: string; name: string };
  status: ActivityStatus;
  rejectionReason?: string;

  activityTitle: string;
  projectName?: string;
  projectTitle?: string;
  consortium?: string;
  implementingPartners?: string;

  locations: Location[];
  activityTypes: string[];
  targetGroups: string[];
  thematicFocus: string[];
  funders: string[];

  maleCount: number;
  femaleCount: number;
  nonBinaryCount: number;
  ageUnder25: number;
  age25to40: number;
  age40plus: number;
  disabilityYes: number;
  disabilityNo: number;

  keyOutputs?: string;
  immediateOutcomes?: string;
  skillsGained?: string;
  actionsTaken?: string;
  meansOfVerification?: string;
  evidenceAvailable?: string;

  policiesInfluenced?: string;
  institutionalChanges?: string;
  commitmentsSecured?: string;

  mediaMentions?: string;
  publicationsProduced?: string;

  genderOutcomes?: string;
  inclusionMarginalised?: string;
  womenLeadership?: string;
  newPartnerships?: string;
  existingPartnerships?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Finance {
  id: string;
  projectId: string;
  project: ProjectSummary;
  funder: string;
  amount: number;
  currency: string;
  status: FinanceStatus;
  year: number;
  notes?: string;
  createdAt: string;
}

export interface ReferenceData {
  activityTypes: string[];
  thematicFocus: string[];
  funders: string[];
  countries: string[];
  targetGroups: string[];
  regions: string[];
  cities: string[];
}

// ─── API Responses ───
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalActivities: number;
  totalCountries: number;
  totalAttendees: number;
  totalFunding: number;
  totalFunders: number;
  totalUsers: number;
  attendees: {
    male: number;
    female: number;
    nonBinary: number;
    under25: number;
    age25to40: number;
    age40plus: number;
    disability: number;
  };
  byMonth: Record<string, number>;
  funderCounts: Record<string, number>;
  countries: string[];
}

// ─── Form ───
export interface ActivityFormData {
  projectId: string;
  activityTitle: string;
  projectName?: string;
  projectTitle?: string;
  consortium?: string;
  implementingPartners?: string;
  locations: Location[];
  activityTypes: string[];
  targetGroups: string[];
  thematicFocus: string[];
  funders: string[];
  maleCount: number;
  femaleCount: number;
  nonBinaryCount: number;
  ageUnder25: number;
  age25to40: number;
  age40plus: number;
  disabilityYes: number;
  disabilityNo: number;
  keyOutputs: string;
  immediateOutcomes: string;
  skillsGained: string;
  actionsTaken: string;
  meansOfVerification: string;
  evidenceAvailable: string;
  policiesInfluenced: string;
  institutionalChanges: string;
  commitmentsSecured: string;
  mediaMentions: string;
  publicationsProduced: string;
  genderOutcomes: string;
  inclusionMarginalised: string;
  womenLeadership: string;
  newPartnerships: string;
  existingPartnerships: string;
}
