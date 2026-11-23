import { describe, expect, test } from '@jest/globals';
import { scoreCompatibility, rankCandidates } from '../matching.service.js';

describe('scoreCompatibility', () => {
  test('complements missing skills and rewards shared normalized interests', () => {
    const founder = {
      role: 'Developer', skills: [{ name: 'JS' }], lookingFor: ['Design'],
      interests: ['AI/ML', 'HealthTech'], goals: ['Find co-founder'],
      availability: 'Flexible', location: { city: 'Pune', country: 'India' },
      remoteOk: true, experienceLevel: 'Student'
    };
    const candidate = {
      role: 'Designer', skills: [{ name: 'UI/UX' }, { name: 'Figma' }],
      interests: ['AI/ML', 'HealthTech'], goals: ['Find co-founder'],
      availability: 'Part-time', location: { city: 'Pune', country: 'India' },
      remoteOk: true, experienceLevel: 'Student'
    };
    const result = scoreCompatibility(founder, candidate);
    expect(result.score).toBe(98);
    expect(result.breakdown.skillComplementarity).toBe(1);
    expect(result.sharedInterests).toEqual(['AI/ML', 'HealthTech']);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.reasons.length).toBeLessThanOrEqual(4);
  });
});

test('ranking returns candidates in supplied order with compatibility details', () => {
  const user = { interests: ['SaaS'], skills: [], goals: [], availability: 'Flexible', remoteOk: true };
  const ranked = rankCandidates(user, [{ _id: 'candidate', interests: ['SaaS'], availability: 'Flexible', remoteOk: true }]);
  expect(ranked[0].user._id).toBe('candidate');
  expect(Number.isInteger(ranked[0].score)).toBe(true);
});
