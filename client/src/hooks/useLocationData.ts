import { useMemo } from "react";

/**
 * Structure des données géographiques
 * Adapt this to your actual reference data structure
 */
interface GeographicData {
    [country: string]: {
        regions: string[];
        cities: {
            [region: string]: string[];
        };
    };
}

// À adapter avec vos vraies données de référence
// Pour la Gambie, par exemple :
const GEOGRAPHIC_DATA: GeographicData = {
    Gambia: {
        regions: ["Banjul", "Kanifing", "Kombo North", "Kombo South", "Foni", "Kiang", "Lower River", "Central River", "Upper River"],
        cities: {
            "Banjul": ["Banjul"],
            "Kanifing": ["Kanifing", "Bakau", "Serrekunda"],
            "Kombo North": ["Lamin", "Kartong"],
            "Kombo South": ["Brikama", "Gunjur", "Sanyang"],
            "Foni": ["Kaur", "Koina"],
            "Kiang": ["Kaolack", "Kuntaur"],
            "Lower River": ["Soma", "Kaur"],
            "Central River": ["Janjanbureh", "Kuntaur"],
            "Upper River": ["Basse Santa Su", "Gabu"],
        }
    },
    Senegal: {
        regions: ["Dakar", "Thiès", "Kaolack", "Tambacounda", "Saint-Louis", "Louga"],
        cities: {
            "Dakar": ["Dakar", "Pikine", "Guédiawaye"],
            "Thiès": ["Thiès", "Mbour"],
            "Kaolack": ["Kaolack", "Caolack"],
            "Tambacounda": ["Tambacounda", "Kaédi"],
            "Saint-Louis": ["Saint-Louis", "Podor"],
            "Louga": ["Louga", "Linguère"],
        }
    },
    Mali: {
        regions: ["Bamako", "Kayes", "Koulikoro", "Segou", "Mopti", "Timbuktu", "Gao"],
        cities: {
            "Bamako": ["Bamako"],
            "Kayes": ["Kayes", "Kéniéba"],
            "Koulikoro": ["Koulikoro", "Niono"],
            "Segou": ["Segou", "San"],
            "Mopti": ["Mopti", "Djenne"],
            "Timbuktu": ["Timbuktu", "Araouane"],
            "Gao": ["Gao", "Menaka"],
        }
    },
};

export function useLocationData() {
    const countries = useMemo(() => Object.keys(GEOGRAPHIC_DATA), []);

    const getRegions = (country: string): string[] => {
        return GEOGRAPHIC_DATA[country]?.regions ?? [];
    };

    const getCities = (country: string, region: string): string[] => {
        return GEOGRAPHIC_DATA[country]?.cities[region] ?? [];
    };

    return {
        countries,
        getRegions,
        getCities,
    };
}