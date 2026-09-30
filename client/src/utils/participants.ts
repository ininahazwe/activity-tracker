// Contrôles de cohérence des chiffres de participation.
// Ils produisent des avertissements et ne bloquent jamais l'enregistrement :
// sur le terrain, certaines ventilations sont parfois inconnues.

export interface ParticipantCounts {
    maleCount?: number | null;
    femaleCount?: number | null;
    nonBinaryCount?: number | null;
    ageUnder25?: number | null;
    age25to40?: number | null;
    age40plus?: number | null;
    disabilityYes?: number | null;
    disabilityNo?: number | null;
}

const n = (value: number | null | undefined): number => Number(value) || 0;

export function participantTotals(a: ParticipantCounts) {
    return {
        gender: n(a.maleCount) + n(a.femaleCount) + n(a.nonBinaryCount),
        age: n(a.ageUnder25) + n(a.age25to40) + n(a.age40plus),
        disability: n(a.disabilityYes) + n(a.disabilityNo),
    };
}

// Le total de référence est la somme par genre (c'est celle qu'utilise le tableau de bord).
export function participantWarnings(a: ParticipantCounts): string[] {
    const { gender, age, disability } = participantTotals(a);
    const warnings: string[] = [];

    if (gender === 0) {
        if (age > 0 || disability > 0) {
            warnings.push("Age or disability figures are entered, but the gender breakdown is empty.");
        }
        return warnings;
    }

    const check = (label: string, sum: number) => {
        if (sum === 0) warnings.push(`${label} breakdown is empty (${gender} participants declared by gender).`);
        else if (sum !== gender) warnings.push(`${label} breakdown adds up to ${sum}, but ${gender} participants are declared by gender.`);
    };
    check("Age", age);
    check("Disability", disability);

    return warnings;
}
