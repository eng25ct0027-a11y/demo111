const themes = ['AI/ML', 'FinTech', 'HealthTech', 'Climate', 'EdTech', 'SaaS', 'Gaming', 'Web3', 'AgriTech', 'Social Impact'];
const skills = ['JavaScript', 'Python', 'React', 'Design', 'Machine Learning', 'Node.js', 'Figma', 'Data'];
const organizers = ['BuildTogether', 'DevPost', 'Tech for Good', 'Open Innovation Lab', 'Founders Circle'];
export default Array.from({ length: 22 }, (_, index) => {
  const start = new Date(Date.now() + (index + 9) * 86400000);
  const deadline = new Date(start.getTime() - (index % 5 + 2) * 86400000);
  const theme = themes[index % themes.length];
  return {
    title: [`${theme} for Good`, `Future Founders Challenge`, `Build Week: ${theme}`, `Open Innovation Sprint`][index % 4],
    organizer: organizers[index % organizers.length],
    description: `Collaborate with builders across disciplines to create practical solutions in ${theme}.`,
    bannerImage: `https://images.unsplash.com/photo-${['1519389950473-47ba0277781c', '1556761175-b413da4baf72', '1522071820081-009f0129c71c'][index % 3]}?auto=format&fit=crop&w=1200&q=80`,
    mode: ['Online', 'Offline', 'Hybrid'][index % 3], location: ['Bengaluru', 'Mumbai', 'Online'][index % 3],
    startDate: start, endDate: new Date(start.getTime() + 2 * 86400000), registrationDeadline: deadline,
    themes: [theme, themes[(index + 3) % themes.length]],
    requiredSkills: [skills[index % skills.length], skills[(index + 2) % skills.length]],
    prizePool: `₹${(index + 1) * 25000}`, teamSize: { min: 2, max: 5 }, website: 'https://example.com'
  };
});
