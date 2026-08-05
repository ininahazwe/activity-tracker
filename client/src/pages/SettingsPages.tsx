import ReferenceDataSettings from "../components/ReferenceDataSettings";
import ProjectsSettings from "./Projectssettings.tsx";
import ProgrammesSettings from "./ProgrammesSettings.tsx";

// ─── Activity Types Settings ───
export function ActivityTypesPage() {
    return (
        <ReferenceDataSettings
            category="activity_type"
            title="Activity Types"
            icon="📋"
            description="Manage the types of activities (training, workshop, forum, etc.)"
        />
    );
}

// ─── Thematic Focus Settings ───
export function ThematicFocusPage() {
    return (
        <ReferenceDataSettings
            category="thematic_focus"
            title="Thematic Focus"
            icon="🎯"
            description="Define thematic areas of focus (rights, education, health, etc.)"
        />
    );
}

// ─── Funders Settings ───
export function FundersPage() {
    return (
        <ReferenceDataSettings
            category="funder"
            title="Funders"
            icon="💰"
            description="Manage funding organizations and donors"
        />
    );
}

// ─── Target Groups Settings ───
export function TargetGroupsPage() {
    return (
        <ReferenceDataSettings
            category="target_group"
            title="Target Groups"
            icon="👥"
            description="Define target audience groups (women, youth, businesses, etc.)"
        />
    );
}

// ─── Countries Settings ───
export function CountriesPage() {
    return (
        <ReferenceDataSettings
            category="country"
            title="Countries"
            icon="🌍"
            description="Manage countries where activities take place"
        />
    );
}

// ─── Regions Settings ───
export function RegionsPage() {
    return (
        <ReferenceDataSettings
            category="region"
            title="Regions"
            icon="🗺️"
            description="Manage regions within countries"
            parentCategory="countries"
        />
    );
}

// ─── Cities Settings ───
export function CitiesPage() {
    return (
        <ReferenceDataSettings
            category="city"
            title="Cities"
            icon="🏙️"
            description="Manage cities within regions"
            parentCategory="regions"
        />
    );
}

// ─── Programmes Settings ───
export function ProgrammesPage() {
    return <ProgrammesSettings />;
}

// ─── Projects Settings ───
export function ProjectsPage() {
    return <ProjectsSettings />;
}