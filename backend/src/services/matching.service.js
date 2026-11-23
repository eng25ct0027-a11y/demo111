import { normalize } from '../utils/constants.js';

const values = (items) => (items || []).map((item) => normalize(typeof item === 'string' ? item : item.name)).filter(Boolean);
const jaccard = (left, right) => {
  const a = new Set(values(left));
  const b = new Set(values(right));
  const union = new Set([...a, ...b]);
  return union.size ? [...a].filter((value) => b.has(value)).length / union.size : 0;
};
const same = (left, right) => normalize(left) === normalize(right);
const experienceOrder = ['student', '0-2 years', '3-5 years', '5+ years'];

export function scoreCompatibility(userA, userB) {
  const aSkills = values(userA.skills);
  const bSkills = values(userB.skills);
  const desired = values(userA.lookingFor);
  const satisfied = desired.filter((skill) => bSkills.includes(skill) || same(userB.role, skill));
  const newSkills = bSkills.filter((skill) => !aSkills.includes(skill));
  const complementarity = desired.length
    ? Math.min(1, satisfied.length / desired.length + Math.min(newSkills.length, 3) * 0.0833)
    : Math.min(newSkills.length / 5, 1);
  const interests = jaccard(userA.interests, userB.interests);
  const goals = jaccard(userA.goals, userB.goals);
  const availability = same(userA.availability, userB.availability) ? 1 :
    normalize(userA.availability) === 'flexible' || normalize(userB.availability) === 'flexible' ? 0.8 : 0.35;
  const cityA = normalize(userA.location?.city);
  const cityB = normalize(userB.location?.city);
  const countryA = normalize(userA.location?.country);
  const countryB = normalize(userB.location?.country);
  const location = cityA && cityA === cityB ? 1 : countryA && countryA === countryB ? 0.7 :
    userA.remoteOk && userB.remoteOk ? 0.6 : 0.2;
  const expA = experienceOrder.indexOf(normalize(userA.experienceLevel));
  const expB = experienceOrder.indexOf(normalize(userB.experienceLevel));
  const experience = expA < 0 || expB < 0 ? 0.4 : expA === expB ? 1 : Math.abs(expA - expB) === 1 ? 0.7 : 0.4;
  const breakdown = {
    skillComplementarity: complementarity, interestOverlap: interests, goalAlignment: goals,
    availability, location, experience
  };
  const score = Math.round(
    complementarity * 35 + interests * 25 + goals * 15 + availability * 10 +
    location * 10 + experience * 5
  );
  const sharedInterests = (userA.interests || []).filter((interest) => values(userB.interests).includes(normalize(interest)));
  const complementarySkills = (userB.skills || []).map((skill) => typeof skill === 'string' ? skill : skill.name)
    .filter((skill) => !aSkills.includes(normalize(skill)));
  const reasons = [];
  if (sharedInterests.length) reasons.push(`You share ${sharedInterests.length} interest${sharedInterests.length === 1 ? '' : 's'}: ${sharedInterests.slice(0, 3).join(', ')}.`);
  if (satisfied.length) reasons.push(`They bring ${satisfied.slice(0, 3).join(', ')}, matching what you're looking for.`);
  if (complementarySkills.length && reasons.length < 3) reasons.push(`Their ${complementarySkills.slice(0, 3).join(' and ')} complement your skill set.`);
  if (availability >= 0.8 && reasons.length < 3) reasons.push('Your availability looks compatible for collaborating.');
  if (!reasons.length) reasons.push('Your experience, goals, and working preferences show potential for a strong collaboration.');
  if (reasons.length === 1) reasons.push('Connecting is a chance to explore whether your strengths fit together.');
  return { score, breakdown, sharedInterests, complementarySkills: complementarySkills.slice(0, 5), reasons: reasons.slice(0, 4) };
}

export function rankCandidates(user, candidates) {
  return candidates.map((candidate) => ({ user: candidate, ...scoreCompatibility(user, candidate) }));
}
