import { PrismaClient } from "@prisma/client";
// @ts-ignore
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── CLEAR EXISTING DATA ───
  console.log("🗑️  Clearing existing data...");
  await prisma.activityTargetGroup.deleteMany();
  await prisma.activityThematicFocus.deleteMany();
  await prisma.activityActivityType.deleteMany();
  await prisma.activityFunder.deleteMany();
  await prisma.activityLocation.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.finance.deleteMany();
  await prisma.userProject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();
  await prisma.referenceData.deleteMany();

  // ─── SEED USERS ───
  console.log("👥 Creating users...");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@tracker.com",
        name: "Admin User",
        passwordHash: await bcrypt.hash("Admin@123", 12),
        role: "ADMIN",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        email: "manager@tracker.com",
        name: "Project Manager",
        passwordHash: await bcrypt.hash("Manager@123", 12),
        role: "MANAGER",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        email: "agent1@tracker.com",
        name: "Field Agent 1",
        passwordHash: await bcrypt.hash("Agent@123", 12),
        role: "FIELD",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        email: "agent2@tracker.com",
        name: "Field Agent 2",
        passwordHash: await bcrypt.hash("Agent@123", 12),
        role: "FIELD",
        status: "ACTIVE",
      },
    }),
  ]);

  // ─── SEED REFERENCE DATA (pour Settings) ───
  console.log("📚 Creating reference data...");

  // ═══════════════════════════════════════════════════════════
  // PROGRAMME AREAS (ne change pas)
  // ═══════════════════════════════════════════════════════════
  const programmeAreas = await Promise.all([
    prisma.referenceData.create({
      data: {
        category: "programme_area",
        name: "Media Development and Freedom of Expression",
        description: "MDGG",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "programme_area",
        name: "Digital Rights & Technology",
        description: "FoE & Digital Rights",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "programme_area",
        name: "Fourth Estate",
        description: "Investigative Journalism",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "programme_area",
        name: "Institutional Development & MEL",
        description: "ID & MEL",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "programme_area",
        name: "Finance",
        description: "Financial Governance",
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // ACTIVITY TYPES
  // ═══════════════════════════════════════════════════════════
  const activityTypes = await Promise.all([
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Awareness and Media Campaigns",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Conferences and Seminars",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Content Production and Publications",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Coordination and Review Meetings",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Fellowships and Mentorship Programmes",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Investigative Reporting Activities",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Learning and Knowledge-Sharing Events",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Media Monitoring",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Monitoring Visits",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Policy Dialogues and Stakeholder Consultations",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Project Launch and Dissemination Events",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Research Studies and Surveys",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Roundtables and Public Forums",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Study and Exchange Visits",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Training and Workshops",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "activity_type",
        name: "Other",
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // THEMATIC FOCUS
  // ═══════════════════════════════════════════════════════════
  const thematicFocus = await Promise.all([
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Accountability, Anti-Corruption, and Transparency",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Climate Change, Environment, and Natural Resources",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Democracy, Governance, and Human Rights",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Digital Rights, Technology, and Information Integrity",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Economic Governance, Finance, and Tax Justice",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Education, Media Literacy, and Capacity Development",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Gender Equality and Social Inclusion",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Health and Public Interest Communication",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Media Development and Freedom of Expression",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Peace, Security, and Social Cohesion",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "thematic_focus",
        name: "Other",
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // TARGET GROUPS
  // ═══════════════════════════════════════════════════════════
  const targetGroups = await Promise.all([
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Academia and Researchers",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Citizens and Communities in Target Locations",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Civil Society Organisations (CSOs) and Community-Based Organisations (CBOs)",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Community Leaders and Local Authorities",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Democratic Institutions and Society at Large",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "General Public",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Government Institutions, Policy Makers, and Regulatory Bodies",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Journalists, Media Professionals, and Media Organisations",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Private Sector Actors",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Vulnerable and Marginalised Populations (including PWDs)",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Women and Youth Groups",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "target_group",
        name: "Other",
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // COUNTRIES (16 West African + others)
  // ═══════════════════════════════════════════════════════════
  const countries = await Promise.all([
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Benin",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Burkina Faso",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Cape Verde",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Côte d'Ivoire",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Gambia",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Ghana",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Guinea",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Guinea-Bissau",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Liberia",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Mali",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Niger",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Nigeria",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Senegal",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Sierra Leone",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Togo",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Central African Republic",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "country",
        name: "Other",
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // REGIONS (Ghana seulement, comme demandé)
  // ═══════════════════════════════════════════════════════════
  const ghanaCountry = countries.find(c => c.name === "Ghana");
  const ghanaRegions = await Promise.all([
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Ashanti Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Ahafo Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Bono East Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Bono Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Central Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Eastern Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Greater Accra Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "North East Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Northern Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Oti Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Savannah Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Upper East Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Upper West Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Volta Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Western North Region",
        parentId: ghanaCountry!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "region",
        name: "Western Region",
        parentId: ghanaCountry!.id,
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // CITIES (pour certaines régions Ghana + autres pays)
  // ═══════════════════════════════════════════════════════════
  const accraRegion = ghanaRegions.find(r => r.name === "Greater Accra Region");
  const ashantiRegion = ghanaRegions.find(r => r.name === "Ashanti Region");
  const northernRegion = ghanaRegions.find(r => r.name === "Northern Region");
  const guineaCountry = countries.find(c => c.name === "Guinea");

  const cities = await Promise.all([
    // Ghana cities
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Accra",
        parentId: accraRegion!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Kumasi",
        parentId: ashantiRegion!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Tamale",
        parentId: northernRegion!.id,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Cape Coast",
        parentId: null,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Sekondi-Takoradi",
        parentId: null,
      },
    }),
    // Other countries
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Conakry",
        parentId: null,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Dakar",
        parentId: null,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Ouagadougou",
        parentId: null,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Bamako",
        parentId: null,
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "city",
        name: "Abidjan",
        parentId: null,
      },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // FUNDERS
  // ═══════════════════════════════════════════════════════════
  const funders = await Promise.all([
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "GIZ (German International Cooperation)",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "World Bank",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "African Union",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "USAID",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "EU Delegation",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "Ford Foundation",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "Open Society Foundations",
      },
    }),
    prisma.referenceData.create({
      data: {
        category: "funder",
        name: "Transparency International",
      },
    }),
  ]);

  // ─── SEED PROJECTS ───
  console.log("📋 Creating projects...");
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Media Integrity Initiative",
        slug: "media-integrity",
        description: "Strengthening media integrity and digital literacy across West Africa",
        isActive: true,
        users: {
          create: [
            { userId: users[0].id },
            { userId: users[1].id },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: "Governance & Democracy",
        slug: "governance-democracy",
        description: "Promoting transparent governance and democratic participation",
        isActive: true,
        users: {
          create: [
            { userId: users[1].id },
            { userId: users[2].id },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: "Digital Rights Advocacy",
        slug: "digital-rights",
        description: "Defending digital rights and fighting cyber threats",
        isActive: true,
        users: {
          create: [
            { userId: users[2].id },
            { userId: users[3].id },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: "Financial Accountability",
        slug: "financial-accountability",
        description: "Ensuring financial transparency in public institutions",
        isActive: true,
        users: {
          create: [
            { userId: users[1].id },
            { userId: users[3].id },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: "Community Empowerment",
        slug: "community-empowerment",
        description: "Empowering communities through civic education",
        isActive: true,
        users: {
          create: [
            { userId: users[2].id },
          ],
        },
      },
    }),
  ]);

  // ─── SEED ACTIVITIES (liées aux données de référence) ───
  console.log("🎯 Creating activities with reference data...");

  const accraCity = cities.find(c => c.name === "Accra");
  const kumasi = cities.find(c => c.name === "Kumasi");
  const tamale = cities.find(c => c.name === "Tamale");
  const conakry = cities.find(c => c.name === "Conakry");

  const activityData = [
    {
      title: "Media Training Workshop on Fact-Checking",
      projectId: projects[0].id,
      createdById: users[1].id,
      programmeAreaId: programmeAreas[0].id,
      locations: [{ countryId: countries[5].id, regionId: accraRegion!.id, cityId: accraCity!.id }],
      activityTypeIds: [activityTypes[14].id],
      thematicIds: [thematicFocus[8].id],
      targetGroupIds: [targetGroups[7].id],
      funderIds: [funders[0].id],
    },
    {
      title: "Policy Dialogue on Digital Rights",
      projectId: projects[2].id,
      createdById: users[2].id,
      programmeAreaId: programmeAreas[1].id,
      locations: [{ countryId: countries[6].id, regionId: null, cityId: conakry!.id }],
      activityTypeIds: [activityTypes[9].id],
      thematicIds: [thematicFocus[3].id],
      targetGroupIds: [targetGroups[6].id, targetGroups[7].id],
      funderIds: [funders[1].id, funders[4].id],
    },
    {
      title: "Investigative Reporting on Corruption",
      projectId: projects[0].id,
      createdById: users[1].id,
      programmeAreaId: programmeAreas[2].id,
      locations: [{ countryId: countries[5].id, regionId: ashantiRegion!.id, cityId: kumasi!.id }],
      activityTypeIds: [activityTypes[5].id],
      thematicIds: [thematicFocus[0].id],
      targetGroupIds: [targetGroups[7].id, targetGroups[1].id],
      funderIds: [funders[5].id],
    },
    {
      title: "Youth Civic Education Campaign",
      projectId: projects[4].id,
      createdById: users[2].id,
      programmeAreaId: programmeAreas[3].id,
      locations: [{ countryId: countries[5].id, regionId: northernRegion!.id, cityId: tamale!.id }],
      activityTypeIds: [activityTypes[0].id],
      thematicIds: [thematicFocus[2].id],
      targetGroupIds: [targetGroups[10].id, targetGroups[1].id],
      funderIds: [funders[3].id],
    },
    {
      title: "Financial Transparency Workshop",
      projectId: projects[3].id,
      createdById: users[3].id,
      programmeAreaId: programmeAreas[4].id,
      locations: [{ countryId: countries[6].id, regionId: null, cityId: conakry!.id }],
      activityTypeIds: [activityTypes[14].id, activityTypes[9].id],
      thematicIds: [thematicFocus[4].id],
      targetGroupIds: [targetGroups[6].id],
      funderIds: [funders[0].id, funders[2].id],
    },
    {
      title: "Research Study on Media Ownership",
      projectId: projects[0].id,
      createdById: users[1].id,
      programmeAreaId: programmeAreas[0].id,
      locations: [
        { countryId: countries[5].id, regionId: accraRegion!.id, cityId: accraCity!.id },
        { countryId: countries[6].id, regionId: null, cityId: conakry!.id },
      ],
      activityTypeIds: [activityTypes[11].id],
      thematicIds: [thematicFocus[8].id],
      targetGroupIds: [targetGroups[0].id, targetGroups[7].id],
      funderIds: [funders[1].id],
    },
    {
      title: "Conference on Democracy & Governance",
      projectId: projects[1].id,
      createdById: users[1].id,
      programmeAreaId: programmeAreas[0].id,
      locations: [{ countryId: countries[5].id, regionId: accraRegion!.id, cityId: accraCity!.id }],
      activityTypeIds: [activityTypes[1].id],
      thematicIds: [thematicFocus[2].id],
      targetGroupIds: [targetGroups[2].id, targetGroups[6].id, targetGroups[0].id],
      funderIds: [funders[4].id, funders[5].id],
    },
    {
      title: "Content Series on Gender Equality",
      projectId: projects[0].id,
      createdById: users[2].id,
      programmeAreaId: programmeAreas[0].id,
      locations: [{ countryId: countries[5].id, regionId: ashantiRegion!.id, cityId: kumasi!.id }],
      activityTypeIds: [activityTypes[2].id],
      thematicIds: [thematicFocus[6].id],
      targetGroupIds: [targetGroups[10].id, targetGroups[1].id],
      funderIds: [funders[0].id],
    },
    {
      title: "Digital Security Training for Journalists",
      projectId: projects[2].id,
      createdById: users[3].id,
      programmeAreaId: programmeAreas[1].id,
      locations: [{ countryId: countries[6].id, regionId: null, cityId: conakry!.id }],
      activityTypeIds: [activityTypes[14].id],
      thematicIds: [thematicFocus[3].id],
      targetGroupIds: [targetGroups[7].id],
      funderIds: [funders[3].id],
    },
    {
      title: "Community Monitoring & Advocacy Forum",
      projectId: projects[4].id,
      createdById: users[2].id,
      programmeAreaId: programmeAreas[3].id,
      locations: [{ countryId: countries[5].id, regionId: northernRegion!.id, cityId: tamale!.id }],
      activityTypeIds: [activityTypes[9].id],
      thematicIds: [thematicFocus[0].id, thematicFocus[2].id],
      targetGroupIds: [targetGroups[1].id, targetGroups[10].id],
      funderIds: [funders[2].id],
    },
  ];

  for (let index = 0; index < activityData.length; index++) {
    const data = activityData[index];

    const activity = await prisma.activity.create({
      data: {
        projectId: data.projectId,
        createdById: data.createdById,
        validatedById: index % 3 === 0 ? users[0].id : undefined,
        status: index % 3 === 0 ? "VALIDATED" : "SUBMITTED",
        activityTitle: data.title,
        projectName: projects.find(p => p.id === data.projectId)?.name,
        programmeAreaId: data.programmeAreaId,
        activityStartDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        activityEndDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        totalAttendees: Math.floor(Math.random() * 100) + 20,
        maleCount: Math.floor(Math.random() * 40) + 10,
        femaleCount: Math.floor(Math.random() * 40) + 10,
        nonBinaryCount: Math.floor(Math.random() * 5),
        ageUnder25: Math.floor(Math.random() * 30) + 5,
        age25to40: Math.floor(Math.random() * 40) + 10,
        age40plus: Math.floor(Math.random() * 30) + 5,
        disabilityYes: Math.floor(Math.random() * 10),
        disabilityNo: Math.floor(Math.random() * 50) + 10,
        immediateOutcomes: "Participants gained knowledge on the topic and shared insights with their networks.",
        skillsGained: "Critical thinking, fact-checking, digital literacy, and communication skills.",
        actionsTaken: "Participants committed to implementing lessons learned in their respective organizations.",
        policiesInfluenced: "Contributed to draft guidelines on digital security.",
        institutionalChanges: "One institution adopted new content verification procedures.",
        commitmentsSecured: "CSOs committed to collaborative monitoring efforts.",
        mediaMentions: "Featured in local radio stations and online publications.",
        mediaLinks: "https://example.com/article1\nhttps://example.com/article2",
        publicationsProduced: "2 research briefs and 1 policy brief published.",
        genderOutcomes: "60% female participation, improved women's representation in discussions.",
        inclusionChallenges: "Limited participation from PWDs, transportation challenges.",
        existingPartnerships: "Strengthened partnerships with 3 CSOs and 2 government institutions.",
        newPartnerships: "Established new relationship with university research center.",
      },
    });

    // Add locations
    for (const loc of data.locations) {
      await prisma.activityLocation.create({
        data: {
          activityId: activity.id,
          countryId: loc.countryId,
          regionId: loc.regionId,
          cityId: loc.cityId,
        },
      });
    }

    // Add activity types
    for (const typeId of data.activityTypeIds) {
      await prisma.activityActivityType.create({
        data: {
          activityId: activity.id,
          activityTypeId: typeId,
        },
      });
    }

    // Add thematic focus
    for (const thematicId of data.thematicIds) {
      await prisma.activityThematicFocus.create({
        data: {
          activityId: activity.id,
          thematicId: thematicId,
        },
      });
    }

    // Add target groups
    for (const groupId of data.targetGroupIds) {
      await prisma.activityTargetGroup.create({
        data: {
          activityId: activity.id,
          groupId: groupId,
        },
      });
    }

    // Add funders
    for (const funderId of data.funderIds) {
      await prisma.activityFunder.create({
        data: {
          activityId: activity.id,
          funderId: funderId,
        },
      });
    }
  }

  // ─── SEED FINANCES ───
  console.log("💰 Creating finance records...");
  await Promise.all([
    prisma.finance.create({
      data: {
        projectId: projects[0].id,
        funder: "GIZ",
        amount: 50000,
        currency: "USD",
        year: 2024,
        status: "CONTINUOUS",
        notes: "Annual funding for media integrity initiatives",
      },
    }),
    prisma.finance.create({
      data: {
        projectId: projects[1].id,
        funder: "World Bank",
        amount: 75000,
        currency: "USD",
        year: 2024,
        status: "NEW",
        notes: "One-time grant for governance project",
      },
    }),
    prisma.finance.create({
      data: {
        projectId: projects[2].id,
        funder: "EU Delegation",
        amount: 60000,
        currency: "EUR",
        year: 2024,
        status: "CONTINUOUS",
        notes: "Quarterly disbursement",
      },
    }),
    prisma.finance.create({
      data: {
        projectId: projects[3].id,
        funder: "African Union",
        amount: 40000,
        currency: "USD",
        year: 2024,
        status: "NEW",
        notes: "Regional initiative funding",
      },
    }),
    prisma.finance.create({
      data: {
        projectId: projects[4].id,
        funder: "Ford Foundation",
        amount: 35000,
        currency: "USD",
        year: 2024,
        status: "CONTINUOUS",
        notes: "Community empowerment program",
      },
    }),
  ]);

  console.log("✅ Seeding completed successfully!");
  console.log(`📊 Created:`);
  console.log(`   - ${users.length} users`);
  console.log(`   - ${projects.length} projects`);
  console.log(`   - ${activityData.length} activities`);
  console.log(`   - ${countries.length} countries`);
  console.log(`   - ${ghanaRegions.length} Ghana regions`);
  console.log(`   - ${cities.length} cities`);
  console.log(`   - ${funders.length} funders`);
  console.log(`   - ${activityTypes.length} activity types`);
  console.log(`   - ${thematicFocus.length} thematic focus areas`);
  console.log(`   - ${targetGroups.length} target groups`);
}

main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("❌ Seeding failed:", e);
      await prisma.$disconnect();
      process.exit(1);
    });