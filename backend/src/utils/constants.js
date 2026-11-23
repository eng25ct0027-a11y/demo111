export const ROLES = ['Developer', 'Designer', 'Product', 'Business', 'Marketing', 'Data/AI', 'Domain Expert'];
export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
export const INTERESTS = ['FinTech', 'HealthTech', 'EdTech', 'AI/ML', 'Web3', 'Climate', 'SaaS', 'Gaming', 'Social Impact', 'AgriTech'];
export const GOALS = ['Find co-founder', 'Join hackathon', 'Build side project', 'Join startup', 'Mentorship'];
export const AVAILABILITY = ['Full-time', 'Part-time', 'Weekends', 'Flexible'];
export const EXPERIENCE = ['Student', '0-2 years', '3-5 years', '5+ years'];
export const SYNONYMS = { js: 'javascript', reactjs: 'react', node: 'node.js', ml: 'machine learning', 'ui/ux': 'design' };
export const normalize = (value = '') => {
  const normalized = value.toString().trim().toLowerCase();
  return SYNONYMS[normalized] || normalized;
};
