// Client-safe, fixed opt-in catalog. Never inferred from language or profile.
export const CHINA_PRESET = "china-employers";
export const CHINA_SOURCES = ["tencent", "bytedance", "meituan"];
export const SINGAPORE_PRESET = 'singapore-boards';
export const SINGAPORE_SOURCES = ['mycareersfuture','jobstreet'];
export const isPortalPreset = preset => preset === CHINA_PRESET || preset === SINGAPORE_PRESET;
export const EMPLOYER_LABEL = {
  mycareersfuture: 'MyCareersFuture Singapore',
  jobstreet: 'JobStreet Singapore',
  tencent: "Tencent / 腾讯",
  bytedance: "ByteDance / 字节跳动",
  meituan: "Meituan / 美团",
};
export const EMPLOYER_ENTRIES = {
  mycareersfuture: {name:'MyCareersFuture Singapore',provider:'mycareersfuture',careers_url:'https://www.mycareersfuture.gov.sg'},
  jobstreet: {name:'JobStreet Singapore',provider:'jobstreet',careers_url:'https://sg.jobstreet.com',api:'https://sg.jobstreet.com/api/jobsearch/v5/search',siteKey:'SG-Main',searchLocation:'Singapore',pageSize:50},
  tencent: {
    name: "Tencent",
    careers_url: "https://careers.tencent.com/search.html",
  },
  bytedance: {
    name: "ByteDance",
    careers_url: "https://jobs.bytedance.com",
    provider: "feishu-jobs",
  },
  meituan: {
    name: "Meituan",
    careers_url: "https://zhaopin.meituan.com/web/social",
  },
};

/** Reject invalid/empty selections instead of silently substituting sources. */
export function employerRequest(raw) {
  if (!isPortalPreset(raw?.preset)) throw new Error("Unknown employer preset.");
  const singapore = raw.preset === SINGAPORE_PRESET;
  const allowed = singapore ? SINGAPORE_SOURCES : CHINA_SOURCES;
  if (
    !Array.isArray(raw.employers) ||
    !raw.employers.length ||
    raw.employers.some((id) => !allowed.includes(id))
  ) {
    throw new Error(singapore ? 'Select MyCareersFuture or JobStreet.' : "Select at least one of Tencent, ByteDance and Meituan.");
  }
  const terms = (value) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value
              .filter((v) => typeof v === "string")
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        ]
      : [];
  const positive=terms(raw.positive);
  if(singapore&&(!positive.length||positive.length>6||positive.some(t=>t.length>120)))throw new Error('Enter one to six role terms for Singapore job search.');
  // Deliberately exclude recency, negative/profile/YAML filters and scan depth.
  return {
    preset: raw.preset,
    employers: [...new Set(raw.employers)],
    positive,
    allow: singapore ? [] : terms(raw.allow),
  };
}

/** One source can be incomplete even when it returned zero matches. */
export function employerOutcome(sources, count) {
  const complete = sources.filter((s) => s.state === "complete");
  const incomplete = sources.filter((s) => s.state !== "complete");
  const names = sources.map((s) => EMPLOYER_LABEL[s.id] ?? s.id).join(", ");
  const problems = incomplete
    .map((s) => `${EMPLOYER_LABEL[s.id] ?? s.id}: ${s.reason || s.state}`)
    .join("; ");
  if (!complete.length && sources.every((s) => s.state === "failed"))
    return { state: "failed", message: `Failed — ${problems}.` };
  if (incomplete.length)
    return {
      state: "partial",
      message: `Partial / incomplete — ${count} matches. ${problems}.`,
    };
  return {
    state: "complete",
    message: count
      ? `Completed — ${count} matches from ${names}.`
      : `No matches for this scan — ${names}.`,
  };
}
