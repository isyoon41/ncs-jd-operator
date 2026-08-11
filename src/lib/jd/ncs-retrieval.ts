export type SearchableNcsCandidate = {
  ncsCode: string;
  name: string;
  definition: string | null;
  lclasName: string | null;
  mclasName: string | null;
  sclasName: string | null;
  subdName: string | null;
};

export type NcsRankingPlan = {
  majorCodes: string[];
  searchTerms: string[];
};

const normalize = (value: string | null) => value?.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim() ?? "";

export function scoreNcsCandidate(candidate: SearchableNcsCandidate, plan: NcsRankingPlan): number {
  const name = normalize(candidate.name);
  const definition = normalize(candidate.definition);
  const classification = normalize([candidate.lclasName, candidate.mclasName, candidate.sclasName, candidate.subdName].filter(Boolean).join(" "));
  const terms = [...new Set(plan.searchTerms.map(normalize).filter(Boolean))];

  let score = 0;
  let matchedTerms = 0;
  for (const term of terms) {
    let termScore = 0;
    if (name === term) termScore += 120;
    else if (name.includes(term)) termScore += 80;
    if (definition.includes(term)) termScore += 45;
    if (classification.includes(term)) termScore += 15;
    if (termScore > 0) {
      score += termScore;
      matchedTerms += 1;
    }
  }

  if (matchedTerms > 1) score += (matchedTerms - 1) * 10;
  if (plan.majorCodes.some((code) => candidate.ncsCode.startsWith(code))) score += 25;
  return score;
}

export function rankNcsCandidates<T extends SearchableNcsCandidate>(
  candidates: T[],
  plan: NcsRankingPlan,
  limit = 50,
): T[] {
  return candidates
    .map((candidate) => ({ candidate, score: scoreNcsCandidate(candidate, plan) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.ncsCode.localeCompare(b.candidate.ncsCode))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
