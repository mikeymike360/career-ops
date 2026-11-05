// Local CPU inference can take longer than the upstream cloud-AI time limits.
// Only the personal launcher opts in. Every other installation keeps upstream defaults.
export function localAiTimeout(ms,env=process.env){const limit=Number(env.CAREER_OPS_LOCAL_AI_TIMEOUT_MS);return Number.isFinite(limit)&&limit>=ms?Math.min(limit,3600000):ms;}
