import { normalize } from '../utils/constants.js';
import { scoreCompatibility } from './matching.service.js';

export function scoreHackathon(user, hackathon) {
  const interests = new Set((user.interests || []).map(normalize));
  const themes = (hackathon.themes || []).map(normalize);
  const skillSet = new Set((user.skills || []).map((skill) => normalize(typeof skill === 'string' ? skill : skill.name)));
  const skills = (hackathon.requiredSkills || []).map(normalize);
  const interestScore = themes.length ? themes.filter((theme) => interests.has(theme)).length / themes.length : 0;
  const skillScore = skills.length ? skills.filter((skill) => skillSet.has(skill)).length / skills.length : 0;
  const deadline = new Date(hackathon.registrationDeadline).getTime();
  const daysLeft = (deadline - Date.now()) / 86400000;
  const urgency = Number.isFinite(daysLeft) && daysLeft > 0 ? Math.max(0, 1 - daysLeft / 60) : 0;
  const score = Math.round(interestScore * 50 + skillScore * 40 + urgency * 10);
  const reasons = [];
  if (interestScore) reasons.push(`Themes match ${Math.round(interestScore * 100)}% of your interests.`);
  if (skillScore) reasons.push(`Your skills cover ${Math.round(skillScore * 100)}% of the requested skills.`);
  if (urgency >= 0.5) reasons.push('Registration closes soon.');
  if (!reasons.length) reasons.push('A chance to explore a new challenge and meet collaborators.');
  return { score, reasons };
}

export function suggestTeammates(user, hackathon, interestedUsers) {
  return interestedUsers.filter((candidate) => candidate._id.toString() !== user._id.toString())
    .map((candidate) => ({ user: candidate, ...scoreCompatibility(user, candidate) }))
    .sort((a, b) => b.score - a.score).slice(0, 6);
}
