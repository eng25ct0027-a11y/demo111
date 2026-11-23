import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Code2, Compass, MapPin, MessageCircle, Plus, Search, Sparkles, Target, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { useAuth } from '../store/authStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { goals, interests, roles } from '../utils/constants.js';
import { Avatar } from '../layouts/DashboardLayout.jsx';

const errorText = (error) => error.response?.data?.message || error.message || 'Something went wrong.';
const motionIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: .35 } };
function PageHead({ eyebrow, title, description, action }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
function Panel({ title, children, action, className = '' }) {
  return <section className={`panel ${className}`}><div className="panel-head"><h3>{title}</h3>{action}</div>{children}</section>;
}
function Loading({ label = 'Loading your workspace…' }) { return <div className="loading-inline"><div className="spinner" />{label}</div>; }
function SkillTags({ skills = [] }) {
  return <div className="tag-row">{skills.slice(0, 4).map((skill) => <span className="tag" key={skill.name || skill}>{skill.name || skill}</span>)}</div>;
}
function UserCard({ match, onConnect }) {
  const person = match.user;
  return <motion.article {...motionIn} className="match-card">
    <div className="match-top"><Avatar user={person} size="large" /><div className="score-pill"><Sparkles size={12} />{match.score}%</div></div>
    <h3>{person.name}</h3><div className="card-subtitle">{person.headline || person.role}</div>
    <div className="person-meta"><span className="role-label">{person.role}</span>{person.location?.city && <span><MapPin size={12} />{person.location.city}</span>}</div>
    <SkillTags skills={person.skills || []} />
    {!!match.sharedInterests?.length && <div className="shared-line"><span>Shared</span>{match.sharedInterests.slice(0, 2).join(' · ')}</div>}
    {match.reasons?.length > 0 && <details className="match-reasons"><summary>Why this match?<ChevronDown size={14} /></summary><ul>{match.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul></details>}
    <div className="card-actions"><Link className="button button-muted button-small" to={`/profile/${person._id}`}>View profile</Link><button className="button button-primary button-small" onClick={() => onConnect(person._id)}>Connect <ArrowRight size={14} /></button></div>
  </motion.article>;
}

export function Landing() {
  return <div className="landing"><nav className="landing-nav"><Link className="brand" to="/"><span className="brand-icon"><Sparkles size={18} /></span>cofounder<span className="brand-ai">.ai</span></Link><div><Link to="/login" className="nav-login">Log in</Link><Link to="/register" className="button button-primary button-small">Get started <ArrowRight size={14} /></Link></div></nav>
    <section className="hero"><div className="hero-glow hero-glow-a" /><div className="hero-glow hero-glow-b" /><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> YOUR NEXT BIG THING STARTS HERE</div><h1>Find your perfect<br /><span>co-founder</span> with AI.</h1><p>Meet the people who bring what you’re missing. Build something meaningful, together.</p><div className="hero-actions"><Link to="/register" className="button button-primary">Find your people <ArrowRight size={17} /></Link><a href="#how" className="button button-quiet">See how it works</a></div><div className="hero-social"><div className="avatar-stack"><Avatar user={{ name: 'Aarav' }} /><Avatar user={{ name: 'Ananya' }} /><Avatar user={{ name: 'Ishaan' }} /></div><span><b>2,400+</b> builders finding their team</span></div></div>
      <div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-match"><div className="match-mini-header"><span className="live-dot" /> HIGH COMPATIBILITY</div><div className="hero-match-person"><Avatar user={{ name: 'Ananya Rao' }} size="large" /><div><b>Ananya Rao</b><small>Product designer · Bengaluru</small></div><strong>96%</strong></div><div className="mini-tags"><span>Product design</span><span>AI/ML</span><span>HealthTech</span></div><div className="match-note"><Sparkles size={15} /> She brings design + research, you bring engineering.</div></div><div className="float-chip float-one"><span className="float-icon"><Code2 size={16} /></span><span><b>Skill match</b><small>2 complementary</small></span><i>+24%</i></div><div className="float-chip float-two"><span className="online-dot" /><span><b>12 builders</b><small>online near you</small></span></div></div>
    </section>
    <section id="how" className="landing-section"><div className="section-title"><div className="eyebrow">HOW IT WORKS</div><h2>From idea to <span>co-founder</span></h2><p>A better way to find the people you want to build with.</p></div><div className="steps-grid">{[['01', 'Show us what you’re building', 'Tell us your skills, interests, goals, and what you need in a teammate.'], ['02', 'Meet your best matches', 'Our compatibility engine finds complementary builders—not just similar profiles.'], ['03', 'Start building together', 'Connect, chat, form a team, and find your next hackathon.']].map(([number, title, copy]) => <div className="step-card" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></section>
    <section className="landing-cta"><div><div className="eyebrow">YOUR NEXT CHAPTER</div><h2>Great things happen<br />when the right people meet.</h2><p>Build your profile in minutes. Meet your people today.</p></div><Link to="/register" className="button button-primary">Create your free profile <ArrowRight size={16} /></Link></section>
    <footer className="landing-footer"><Link to="/" className="brand"><span className="brand-icon"><Sparkles size={16} /></span>cofounder<span className="brand-ai">.ai</span></Link><span>Built for the builders of tomorrow.</span><span>© 2026 CoFounder AI</span></footer>
  </div>;
}

export function AuthPage({ register = false }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ defaultValues: { name: '', email: '', password: '' } });
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const submit = async (values) => {
    const schema = register ? z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) })
      : z.object({ email: z.string().email(), password: z.string().min(8) });
    const parsed = schema.safeParse(values);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const response = await api.post(register ? '/auth/register' : '/auth/login', values);
      localStorage.setItem('cofounder-token', response.data.token);
      setUser(response.data.user);
      toast.success(register ? 'Your account is ready!' : 'Welcome back!');
      navigate(response.data.user.onboardingComplete ? '/dashboard' : '/onboarding');
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const demo = () => form.reset({ email: 'demo@cofounder.ai', password: 'Password@123', name: '' });
  return <div className="auth-page"><div className="auth-visual"><Link to="/" className="brand"><span className="brand-icon"><Sparkles size={18} /></span>cofounder<span className="brand-ai">.ai</span></Link><div className="auth-visual-copy"><div className="eyebrow">BUILD BETTER, TOGETHER</div><h1>Big ideas need<br />the <span>right people.</span></h1><p>Meet your future co-founder, teammate, or the person who helps your idea take flight.</p><div className="auth-quote"><div className="quote-stars">★★★★★</div>“I found the design partner my startup was missing.”<small>— Nisha, founder in Bengaluru</small></div></div><span className="auth-visual-foot">A community built for ambitious builders.</span></div>
    <div className="auth-form-side"><div className="auth-mobile-brand"><Link to="/" className="brand"><span className="brand-icon"><Sparkles size={18} /></span>cofounder<span className="brand-ai">.ai</span></Link></div><form className="auth-form" onSubmit={form.handleSubmit(submit)}><div className="eyebrow">{register ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</div><h2>{register ? 'Start building your team.' : 'Good to have you back.'}</h2><p>{register ? 'Create your profile and meet your people.' : 'Log in and pick up where you left off.'}</p>
      {register && <label>Full name<input {...form.register('name')} placeholder="Your name" autoComplete="name" required minLength={2} /></label>}
      <label>Email address<input type="email" {...form.register('email')} placeholder="you@example.com" autoComplete="email" required /></label>
      <label>Password<div className="password-wrap"><input type={visible ? 'text' : 'password'} {...form.register('password')} placeholder="At least 8 characters" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} /><button type="button" onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button></div></label>
      <button className="button button-primary button-full" disabled={busy}>{busy ? 'Just a moment…' : register ? 'Create account' : 'Log in'} <ArrowRight size={16} /></button>
      {!register && <button className="button button-muted button-full" type="button" onClick={demo}>Use demo account</button>}
      <div className="auth-switch">{register ? 'Already have an account?' : 'New to CoFounder AI?'} <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create an account'}</Link></div>
    </form></div>
  </div>;
}

export function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => ({ role: user?.role || 'Developer', headline: user?.headline || '', bio: user?.bio || '', skills: user?.skills || [], interests: user?.interests || [], goals: user?.goals || [], lookingFor: user?.lookingFor || [], experienceLevel: user?.experienceLevel || 'Student', availability: user?.availability || 'Flexible', location: user?.location || {}, remoteOk: user?.remoteOk ?? true, links: user?.links || {} }));
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key, value) => change(key, form[key].includes(value) ? form[key].filter((item) => item !== value) : [...form[key], value]);
  const save = async () => {
    if (!form.headline.trim()) return toast.error('Add a short headline to continue.');
    if (!form.skills.length) return toast.error('Add at least one skill.');
    setBusy(true);
    try {
      const response = await api.put('/users/me/onboarding', form);
      setUser(response.data); toast.success('Your profile is ready. Let’s find your people!'); navigate('/dashboard');
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  return <div className="onboarding-screen"><div className="onboarding-head"><Link to="/" className="brand"><span className="brand-icon"><Sparkles size={18} /></span>cofounder<span className="brand-ai">.ai</span></Link><span>STEP {step + 1} OF 4</span></div><div className="progress-track"><span style={{ width: `${(step + 1) * 25}%` }} /></div><div className="onboarding-card"><div className="eyebrow">LET’S GET TO KNOW YOU</div><h1>{['Your introduction', 'What you bring', 'What you’re looking for', 'The practical details'][step]}</h1><p>{['This is how you’ll show up to potential co-founders.', 'Add skills that you’re excited to put to work.', 'Tell us what you care about and who you need.', 'Help teammates understand how and when you work.'][step]}</p>
    {step === 0 && <div className="form-grid"><label>Your role<select value={form.role} onChange={(e) => change('role', e.target.value)}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label><label className="span-two">Headline<input value={form.headline} maxLength="120" onChange={(e) => change('headline', e.target.value)} placeholder="e.g. Full-stack developer building for climate" /></label><label className="span-two">A little about you<textarea value={form.bio} rows="4" maxLength="1000" onChange={(e) => change('bio', e.target.value)} placeholder="What are you building? What gets you excited?" /></label></div>}
    {step === 1 && <><label>Your skills <span className="muted-caption">Add one at a time</span><div className="add-skill"><input id="skill-input" placeholder="Try React, Product strategy…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const value = e.currentTarget.value.trim(); if (value) { change('skills', [...form.skills, { name: value, level: 'Intermediate' }]); e.currentTarget.value = ''; } } }} /><button className="button button-muted" type="button" onClick={() => { const input = document.getElementById('skill-input'); const value = input.value.trim(); if (value) { change('skills', [...form.skills, { name: value, level: 'Intermediate' }]); input.value = ''; } }}>Add</button></div></label><div className="selected-tags">{form.skills.map((skill, i) => <div className="selected-skill" key={`${skill.name}-${i}`}><span>{skill.name}</span><select aria-label={`${skill.name} skill level`} value={skill.level} onChange={(e) => change('skills', form.skills.map((item, index) => index === i ? { ...item, level: e.target.value } : item))}>{['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => <option key={level}>{level}</option>)}</select><button aria-label={`Remove ${skill.name}`} onClick={() => change('skills', form.skills.filter((_, n) => n !== i))}><X size={12} /></button></div>)}</div><div className="suggestion-label">POPULAR SKILLS</div><div className="chip-group">{['React', 'Python', 'Product Strategy', 'Figma', 'Node.js', 'Marketing', 'Machine Learning', 'Fundraising'].map((skill) => <button key={skill} className={`choice-chip ${form.skills.some((item) => item.name.toLowerCase() === skill.toLowerCase()) ? 'choice-on' : ''}`} onClick={() => !form.skills.some((item) => item.name.toLowerCase() === skill.toLowerCase()) && change('skills', [...form.skills, { name: skill, level: 'Intermediate' }])}>{skill}</button>)}</div></>}
    {step === 2 && <><label>Interests</label><div className="chip-group">{interests.map((item) => <button key={item} className={`choice-chip ${form.interests.includes(item) ? 'choice-on' : ''}`} onClick={() => toggle('interests', item)}>{form.interests.includes(item) && <Check size={13} />}{item}</button>)}</div><label className="section-label">Your goals</label><div className="chip-group">{goals.map((item) => <button key={item} className={`choice-chip ${form.goals.includes(item) ? 'choice-on' : ''}`} onClick={() => toggle('goals', item)}>{form.goals.includes(item) && <Check size={13} />}{item}</button>)}</div><label className="section-label">I’m looking for</label><div className="chip-group">{roles.map((item) => <button key={item} className={`choice-chip ${form.lookingFor.includes(item) ? 'choice-on' : ''}`} onClick={() => toggle('lookingFor', item)}>{item}</button>)}</div></>}
    {step === 3 && <div className="form-grid"><label>Experience<select value={form.experienceLevel} onChange={(e) => change('experienceLevel', e.target.value)}>{['Student', '0-2 years', '3-5 years', '5+ years'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Availability<select value={form.availability} onChange={(e) => change('availability', e.target.value)}>{['Full-time', 'Part-time', 'Weekends', 'Flexible'].map((item) => <option key={item}>{item}</option>)}</select></label><label>City<input value={form.location.city || ''} onChange={(e) => change('location', { ...form.location, city: e.target.value })} placeholder="Bengaluru" /></label><label>Country<input value={form.location.country || ''} onChange={(e) => change('location', { ...form.location, country: e.target.value })} placeholder="India" /></label><label className="span-two checkbox-row"><input type="checkbox" checked={form.remoteOk} onChange={(e) => change('remoteOk', e.target.checked)} /> Open to remote collaboration</label><label>GitHub<input value={form.links.github || ''} onChange={(e) => change('links', { ...form.links, github: e.target.value })} placeholder="https://github.com/…" /></label><label>LinkedIn<input value={form.links.linkedin || ''} onChange={(e) => change('links', { ...form.links, linkedin: e.target.value })} placeholder="https://linkedin.com/in/…" /></label></div>}
    <div className="onboarding-actions"><button className="button button-quiet" disabled={!step} onClick={() => setStep(step - 1)}>{step > 0 && <><ChevronLeft size={16} /> Back</>}</button>{step < 3 ? <button className="button button-primary" onClick={() => step === 0 && !form.headline ? toast.error('Add a headline to continue.') : setStep(step + 1)}>Continue <ChevronRight size={16} /></button> : <button className="button button-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Finish profile'} <ArrowRight size={16} /></button>}</div>
  </div></div>;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [hacks, setHacks] = useState([]);
  const [busy, setBusy] = useState(true);
  const load = () => {
    setBusy(true);
    Promise.all([api.get('/users/me/stats'), api.get('/matches?limit=4'), api.get('/hackathons/recommended')])
      .then(([statsRes, matchRes, hackRes]) => { setStats(statsRes.data); setMatches(matchRes.data.matches); setHacks(hackRes.data.slice(0, 3)); })
      .catch((error) => toast.error(errorText(error))).finally(() => setBusy(false));
  };
  useEffect(load, []);
  const connect = async (id) => {
    try { await api.post(`/connections/${id}`); toast.success('Connection request sent.'); setMatches((items) => items.filter((item) => item.user._id !== id)); }
    catch (error) { toast.error(errorText(error)); }
  };
  return <motion.div {...motionIn}><PageHead eyebrow="YOUR COMMAND CENTER" title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user?.name?.split(' ')[0] || 'builder'}.`} description="Here’s what’s happening in your founder journey." action={<Link to="/discover" className="button button-primary">Discover people <ArrowRight size={15} /></Link>} />
    {busy ? <Loading /> : <><div className="stats-grid">{[['Profile completeness', `${stats?.profileCompleteness || 0}%`, 'Keep your story up to date', Target], ['Connections', stats?.connections || 0, 'People in your network', Users], ['Top match score', `${stats?.topMatchScore || 0}%`, 'Your strongest fit so far', Sparkles], ['Hackathons saved', stats?.interestedHackathons || 0, 'Challenges on your radar', Clock3]].map(([label, value, sub, Icon]) => <div className="stat-card" key={label}><div className="stat-icon"><Icon size={18} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>)}</div>
      <div className="content-grid dashboard-grid"><Panel title="Top matches for you" action={<Link to="/discover" className="text-link">See all <ArrowRight size={14} /></Link>}><div className="compact-match-list">{matches.map((match) => <div className="compact-person" key={match.user._id}><Avatar user={match.user} /><div className="compact-person-copy"><b>{match.user.name}</b><span>{match.user.headline || match.user.role}</span></div><b className="compact-score">{match.score}%</b><button className="icon-btn connect-icon" aria-label={`Connect with ${match.user.name}`} onClick={() => connect(match.user._id)}><Plus size={17} /></button></div>)}{!matches.length && <Empty icon={Users} title="Your next teammate is out there" text="Add a few interests and discover your first match." action={<Link className="text-link" to="/discover">Find a match <ArrowRight size={14} /></Link>} />}</div></Panel>
        <Panel title="Recommended hackathons" action={<Link to="/hackathons" className="text-link">Explore <ArrowRight size={14} /></Link>}><div className="hack-mini-list">{hacks.map((item) => <Link className="hack-mini" to="/hackathons" key={item.hackathon._id}><span className="hack-mini-icon"><Sparkles size={16} /></span><span><b>{item.hackathon.title}</b><small>{item.hackathon.mode} · {item.hackathon.themes?.[0]}</small></span><strong>{item.score}%</strong></Link>)}{!hacks.length && <Empty icon={Sparkles} title="New challenges await" text="Check back soon for upcoming events." />}</div></Panel>
      </div>
      <div className="content-grid dashboard-grid"><Panel title="Your skills" className="chart-panel"><div className="chart-wrap">{stats?.skillDistribution?.length ? <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={stats.skillDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4}>{stats.skillDistribution.map((_, i) => <Cell key={i} fill={['#8b5cf6', '#6366f1', '#22d3ee', '#34d399'][i % 4]} />)}</Pie><Tooltip contentStyle={{ background: '#171c2b', border: '1px solid #ffffff20', borderRadius: 12 }} /></PieChart></ResponsiveContainer> : <Empty icon={Code2} title="Add your skills" text="Your skills will show up here." />}</div></Panel>
        <Panel title="Match score distribution" className="chart-panel"><div className="chart-wrap">{stats?.matchScoreDistribution?.length ? <ResponsiveContainer width="100%" height={210}><BarChart data={stats.matchScoreDistribution}><CartesianGrid stroke="#ffffff0b" vertical={false} /><XAxis dataKey="name" tick={{ fill: '#8b90a3', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={{ background: '#171c2b', border: '1px solid #ffffff20', borderRadius: 12 }} /><Bar dataKey="value" fill="#8b5cf6" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty icon={Target} title="Scores are on their way" text="Browse your ranked recommendations." />}</div></Panel></div>
    </>}
  </motion.div>;
}

function Empty({ icon: Icon, title, text, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={20} /></span><b>{title}</b><p>{text}</p>{action}</div>;
}

export function Discover() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [availability, setAvailability] = useState('');
  const [interest, setInterest] = useState('');
  const [skill, setSkill] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState('score');
  const [page, setPage] = useState(1);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ search, role, city, availability, interests: interest, skills: skill, minScore: String(minScore), sort, page: String(page), limit: '9' });
      api.get(`/matches?${params}`).then((r) => setMatches(r.data)).catch((error) => toast.error(errorText(error))).finally(() => setLoading(false));
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, role, city, minScore, sort, page]);
  const connect = async (id) => {
    try { await api.post(`/connections/${id}`); toast.success('Request sent!'); setMatches((state) => ({ ...state, matches: state.matches.filter((item) => item.user._id !== id), total: Math.max(0, state.total - 1) })); }
    catch (error) { toast.error(errorText(error)); }
  };
  return <motion.div {...motionIn}><PageHead eyebrow="YOUR PEOPLE ARE HERE" title="Discover your co-founder." description="Meet builders who bring a different superpower to your team." />
    <div className="discover-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search by name or what they do…" /></div><select value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }}><option value="">All roles</option>{roles.map((item) => <option key={item}>{item}</option>)}</select><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="score">Best match</option><option value="recent">Recently active</option></select><button className="filter-toggle" onClick={() => document.querySelector('.filter-panel')?.classList.toggle('filter-panel-open')}>Filters</button></div>
    <div className="discover-layout"><aside className="filter-panel"><div className="filter-heading">Refine your search <button onClick={() => { setRole(''); setCity(''); setAvailability(''); setInterest(''); setSkill(''); setMinScore(0); setPage(1); }}>Reset</button></div><label>City<input value={city} onChange={(e) => { setPage(1); setCity(e.target.value); }} placeholder="Any city" /></label><label>Availability<select value={availability} onChange={(e) => { setPage(1); setAvailability(e.target.value); }}><option value="">Any schedule</option>{['Full-time', 'Part-time', 'Weekends', 'Flexible'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Interest<select value={interest} onChange={(e) => { setPage(1); setInterest(e.target.value); }}><option value="">Any interest</option>{interests.map((item) => <option key={item}>{item}</option>)}</select></label><label>Skill<input value={skill} onChange={(e) => { setPage(1); setSkill(e.target.value); }} placeholder="e.g. React" /></label><label>Minimum match <b>{minScore}%</b><input type="range" min="0" max="90" step="10" value={minScore} onChange={(e) => { setPage(1); setMinScore(Number(e.target.value)); }} /></label><div className="filter-hint"><Sparkles size={14} /> Your score combines complementary skills, shared interests, goals, and working style.</div></aside>
      <div className="discover-results"><div className="results-count">{loading ? 'Finding your matches…' : `${matches.total || 0} builders matched to you`}</div>{loading ? <div className="match-grid">{[1, 2, 3].map((n) => <div className="skeleton-card" key={n}><div className="skeleton skeleton-avatar" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>)}</div> : matches.matches?.length ? <div className="match-grid">{matches.matches.map((match) => <UserCard key={match.user._id} match={match} onConnect={connect} />)}</div> : <Empty icon={Compass} title="No matches just yet" text="Try widening your filters or add more skills and interests to your profile." action={<Link className="button button-muted button-small" to="/profile">Update profile</Link>} />}
        {matches.pages > 1 && <div className="pagination"><button className="icon-btn" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page {page} of {matches.pages}</span><button className="icon-btn" disabled={page >= matches.pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div>}
      </div>
    </div>
  </motion.div>;
}

export function Profile() {
  const { id } = useParams();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const own = !id || id === user?._id;
  const [profile, setProfile] = useState(own ? user : null);
  const [connection, setConnection] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(!own);
  useEffect(() => {
    if (own) { setProfile(user); return; }
    setLoading(true);
    Promise.all([api.get(`/users/${id}`), api.get(`/matches/${id}/compatibility`)])
      .then(([person, match]) => { setProfile(person.data.user); setConnection(person.data.connection); setCompatibility(match.data); })
      .catch((error) => toast.error(errorText(error))).finally(() => setLoading(false));
  }, [id, own, user]);
  const [form, setForm] = useState({});
  useEffect(() => { if (profile) setForm({ name: profile.name, headline: profile.headline || '', bio: profile.bio || '', role: profile.role, skills: (profile.skills || []).map((s) => s.name).join(', '), interests: (profile.interests || []).join(', '), location: profile.location || {}, availability: profile.availability, remoteOk: profile.remoteOk }); }, [profile]);
  const save = async (event) => {
    event.preventDefault();
    try {
      const response = await api.put('/users/me', { ...form, skills: form.skills.split(',').map((name) => ({ name: name.trim(), level: 'Intermediate' })).filter((item) => item.name), interests: form.interests.split(',').map((item) => item.trim()).filter(Boolean) });
      setProfile(response.data); setUser(response.data); setEdit(false); toast.success('Profile saved.');
    } catch (error) { toast.error(errorText(error)); }
  };
  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const payload = new FormData();
    payload.append('avatar', file);
    try {
      const response = await api.post('/users/me/avatar', payload, { headers: { 'Content-Type': undefined } });
      setProfile(response.data); setUser(response.data); toast.success('Profile photo updated.');
    } catch (error) { toast.error(errorText(error)); }
  };
  const connect = async () => {
    try { const response = await api.post(`/connections/${id}`); setConnection({ id: response.data._id, status: 'pending', requester: user._id }); toast.success('Connection request sent.'); }
    catch (error) { toast.error(errorText(error)); }
  };
  if (loading) return <Loading />;
  if (!profile) return <Empty icon={Users} title="Profile unavailable" text="This profile could not be found." />;
  return <motion.div {...motionIn}><PageHead eyebrow={own ? 'YOUR PROFILE' : 'BUILDER PROFILE'} title={own ? 'Your story, your way.' : profile.name} description={own ? 'Let people see what makes you a great teammate.' : profile.headline} action={own ? <button className="button button-primary" onClick={() => setEdit(!edit)}>{edit ? 'Cancel editing' : 'Edit profile'}</button> : connection?.status === 'accepted' ? <button className="button button-primary" onClick={async () => { try { const r = await api.post(`/chat/conversations/${id}`); navigate('/messages', { state: { conversationId: r.data._id } }); } catch (error) { toast.error(errorText(error)); } }}><MessageCircle size={15} /> Message</button> : connection?.status === 'pending' ? <button className="button button-muted" disabled>Request pending</button> : <button className="button button-primary" onClick={connect}>Connect <ArrowRight size={15} /></button>} />
    {edit ? <form className="panel edit-profile-form" onSubmit={save}><label className="button button-muted upload-button">Change profile photo<input type="file" accept="image/*" onChange={uploadAvatar} /></label><div className="form-grid"><label>Name<input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Role<select value={form.role || roles[0]} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label><label className="span-two">Headline<input value={form.headline || ''} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label><label className="span-two">Bio<textarea rows="4" value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label><label className="span-two">Skills <small>Comma separated</small><input value={form.skills || ''} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></label><label className="span-two">Interests <small>Comma separated</small><input value={form.interests || ''} onChange={(e) => setForm({ ...form, interests: e.target.value })} /></label><label>City<input value={form.location?.city || ''} onChange={(e) => setForm({ ...form, location: { ...form.location, city: e.target.value } })} /></label><label>Availability<select value={form.availability || 'Flexible'} onChange={(e) => setForm({ ...form, availability: e.target.value })}>{['Full-time', 'Part-time', 'Weekends', 'Flexible'].map((item) => <option key={item}>{item}</option>)}</select></label></div><button className="button button-primary">Save profile</button></form>
      : <div className="profile-layout"><div className="profile-main"><section className="profile-cover"><div className="profile-identity"><Avatar user={profile} size="profile" /><div><span className="role-label">{profile.role}</span><h2>{profile.name}</h2><p>{profile.headline}</p><div className="person-meta">{profile.location?.city && <span><MapPin size={14} />{profile.location.city}{profile.location.country ? `, ${profile.location.country}` : ''}</span>}<span><Clock3 size={14} />{profile.availability}</span></div></div></div><div className="profile-cover-glow" /></section>
        <Panel title="About"><p className="profile-bio">{profile.bio || 'This builder is getting started—check back soon for their story.'}</p></Panel>
        <Panel title="Skills"><div className="skill-bars">{profile.skills?.map((skill) => <div className="skill-item" key={skill.name}><div><b>{skill.name}</b><span>{skill.level}</span></div><div className="skill-track"><i style={{ width: `${{ Beginner: 25, Intermediate: 50, Advanced: 75, Expert: 100 }[skill.level] || 50}%` }} /></div></div>) || <span className="muted-caption">No skills added yet.</span>}</div></Panel>
        <Panel title="Interests"><div className="chip-group">{profile.interests?.map((item) => <span className="choice-chip choice-on" key={item}>{item}</span>)}</div></Panel></div>
        <aside className="profile-aside">{!own && compatibility && <Panel title="Your compatibility"><div className="compat-score">{compatibility.score}<span>%</span></div><div className="compat-bars">{Object.entries(compatibility.breakdown).map(([key, value]) => <div key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><b>{Math.round(value * 100)}%</b><i><em style={{ width: `${value * 100}%` }} /></i></div>)}</div><ul className="reason-list">{compatibility.reasons.map((item) => <li key={item}>{item}</li>)}</ul></Panel>}
          <Panel title="Looking for"><div className="chip-group">{profile.lookingFor?.map((item) => <span className="tag" key={item}>{item}</span>) || <span className="muted-caption">Open to meeting great people.</span>}</div></Panel>
          <Panel title="Current goals"><div className="chip-group">{profile.goals?.map((item) => <span className="tag" key={item}>{item}</span>)}</div></Panel>
        </aside></div>}
  </motion.div>;
}

export function Hackathons() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState(true);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [teammates, setTeammates] = useState({});
  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ mode, search });
    api.get(recommended ? '/hackathons/recommended' : `/hackathons?${params}`)
      .then((response) => setItems(recommended ? response.data : response.data.hackathons.map((hackathon) => ({ hackathon }))))
      .catch((error) => toast.error(errorText(error))).finally(() => setLoading(false));
  };
  useEffect(load, [recommended, mode, search]);
  const interest = async (id) => {
    try {
      const response = await api.post(`/hackathons/${id}/interest`);
      setItems((state) => state.map((item) => item.hackathon._id === id ? { ...item, hackathon: { ...item.hackathon, interestedUsers: response.data.interested ? [...(item.hackathon.interestedUsers || []), user._id] : (item.hackathon.interestedUsers || []).filter((id) => (id._id || id) !== user._id) } } : item));
      toast.success(response.data.interested ? 'Added to your interests.' : 'Removed from your interests.');
    } catch (error) { toast.error(errorText(error)); }
  };
  const showTeammates = async (id) => {
    try { const response = await api.get(`/hackathons/${id}/teammates`); setTeammates((state) => ({ ...state, [id]: response.data })); }
    catch (error) { toast.error(errorText(error)); }
  };
  const connect = async (id) => {
    try { await api.post(`/connections/${id}`); toast.success('Connection request sent.'); }
    catch (error) { toast.error(errorText(error)); }
  };
  return <motion.div {...motionIn}><PageHead eyebrow="BUILD SOMETHING REAL" title="Find your next hackathon." description="Discover challenges where your skills and interests can make a difference." />
    <div className="tab-toolbar"><div className="tabs"><button className={recommended ? 'tab-active' : ''} onClick={() => setRecommended(true)}>Recommended for you</button><button className={!recommended ? 'tab-active' : ''} onClick={() => setRecommended(false)}>All upcoming</button></div><div className="filter-inline"><div className="search-field search-compact"><Search size={16} /><input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="">All formats</option><option>Online</option><option>Offline</option><option>Hybrid</option></select></div></div>
    {loading ? <Loading /> : items.length ? <div className="hack-grid">{items.map(({ hackathon, score, reasons = [] }) => {
      const interested = (hackathon.interestedUsers || []).some((id) => (id._id || id) === user?._id);
      return <motion.article {...motionIn} className="hack-card" key={hackathon._id}><div className="hack-banner" style={{ backgroundImage: `linear-gradient(180deg,transparent,#111827),url("${hackathon.bannerImage}")` }}><span className="hack-mode">{hackathon.mode}</span>{score !== undefined && <span className="hack-score"><Sparkles size={12} /> {score}% match</span>}</div><div className="hack-card-body"><div className="hack-organizer">{hackathon.organizer} <span>·</span> {new Date(hackathon.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div><h3>{hackathon.title}</h3><p>{hackathon.description}</p><div className="chip-group">{hackathon.themes?.map((theme) => <span className="tag" key={theme}>{theme}</span>)}</div><div className="hack-facts"><span><Clock3 size={14} />Deadline {new Date(hackathon.registrationDeadline).toLocaleDateString()}</span><span>Prize {hackathon.prizePool || 'TBA'}</span><span>Teams {hackathon.teamSize?.min}-{hackathon.teamSize?.max}</span></div>{score !== undefined && <div className="hack-reasons">{reasons.join(' ')}</div>}<div className="hack-card-actions"><button className={`button ${interested ? 'button-muted interested' : 'button-primary'} button-small`} onClick={() => interest(hackathon._id)}>{interested ? <><Check size={14} /> Interested</> : 'I’m interested'}</button><button className="button button-quiet button-small" onClick={() => showTeammates(hackathon._id)}><Users size={14} /> Teammates</button><a href={hackathon.website} target="_blank" rel="noreferrer" className="button button-quiet button-small">Details <ArrowRight size={14} /></a></div>
        {teammates[hackathon._id] && <div className="teammate-results"><b>Suggested teammates</b>{teammates[hackathon._id].length ? teammates[hackathon._id].map((person) => <div className="teammate-row" key={person.user._id}><Avatar user={person.user} /><span><b>{person.user.name}</b><small>{person.user.headline}</small></span><strong>{person.score}%</strong><button className="icon-btn" onClick={() => connect(person.user._id)} aria-label={`Connect with ${person.user.name}`}><Plus size={16} /></button></div>) : <small>No interested builders yet—be the first to join.</small>}</div>}
      </div></motion.article>;
    })}</div> : <Empty icon={Sparkles} title="No upcoming events found" text="Try clearing your filters or check back later." action={<button className="button button-muted button-small" onClick={() => { setMode(''); setSearch(''); }}>Clear filters</button>} />}
  </motion.div>;
}

export function Connections() {
  const [tab, setTab] = useState('connected');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const load = () => {
    setLoading(true);
    const endpoint = tab === 'connected' ? '/connections' : `/connections/requests/${tab}`;
    api.get(endpoint).then((response) => setItems(response.data)).catch((error) => toast.error(errorText(error))).finally(() => setLoading(false));
  };
  useEffect(load, [tab]);
  const update = async (id, action) => {
    try {
      if (action === 'remove' || action === 'cancel') await api.delete(`/connections/${id}`);
      else await api.patch(`/connections/${id}`, { action });
      toast.success(action === 'accept' ? 'Connection accepted.' : action === 'reject' ? 'Request declined.' : 'Connection removed.');
      setItems((state) => state.filter((item) => item._id !== id));
    } catch (error) { toast.error(errorText(error)); }
  };
  const message = async (person) => {
    try { await api.post(`/chat/conversations/${person._id}`); navigate(`/messages/${person._id}`); }
    catch (error) { toast.error(errorText(error)); }
  };
  return <motion.div {...motionIn}><PageHead eyebrow="YOUR NETWORK" title="Connections." description="Build your circle and keep the conversation going." />
    <div className="tabs connection-tabs"><button className={tab === 'connected' ? 'tab-active' : ''} onClick={() => setTab('connected')}>Connected</button><button className={tab === 'received' ? 'tab-active' : ''} onClick={() => setTab('received')}>Received</button><button className={tab === 'sent' ? 'tab-active' : ''} onClick={() => setTab('sent')}>Sent</button></div>
    {loading ? <Loading /> : items.length ? <div className="connection-list">{items.map((item) => {
      const person = tab === 'received' ? item.requester : tab === 'sent' ? item.recipient : String(item.requester?._id) === user?._id ? item.recipient : item.requester;
      return <div className="connection-card" key={item._id}><Avatar user={person} size="large" /><div className="connection-copy"><Link to={`/profile/${person?._id}`}><b>{person?.name}</b></Link><span>{person?.headline || person?.role}</span>{tab === 'received' && item.message && <small>“{item.message}”</small>}</div>
        {tab === 'received' ? <div className="connection-actions"><button className="button button-primary button-small" onClick={() => update(item._id, 'accept')}><Check size={14} /> Accept</button><button className="button button-quiet button-small" onClick={() => update(item._id, 'reject')}>Decline</button></div> : tab === 'sent' ? <button className="button button-muted button-small" onClick={() => update(item._id, 'cancel')}>Cancel request</button> : <div className="connection-actions"><button className="button button-muted button-small" onClick={() => message(person)}><MessageCircle size={14} /> Message</button><button className="icon-btn danger-icon" aria-label="Remove connection" onClick={() => update(item._id, 'remove')}><X size={16} /></button></div>}
      </div>;
    })}</div> : <Empty icon={Users} title={tab === 'connected' ? 'Your network starts here' : `No ${tab} requests`} text={tab === 'connected' ? 'Find a builder whose skills complement yours.' : 'There’s nothing to review right now.'} action={tab === 'connected' ? <Link className="button button-primary button-small" to="/discover">Discover people</Link> : null} />}
  </motion.div>;
}

export function Messages() {
  const { user } = useAuth();
  const socket = useSocket();
  const params = useParams();
  const location = useMemo(() => window.history.state?.usr || {}, []);
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(location.conversationId || '');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileChat, setMobileChat] = useState(Boolean(params.userId));
  const listRef = useRef(null);
  useEffect(() => { api.get('/chat/conversations').then((r) => setConversations(r.data)).catch((error) => toast.error(errorText(error))).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!params.userId) return;
    api.post(`/chat/conversations/${params.userId}`).then((r) => { setActive(r.data._id); setMobileChat(true); setConversations((items) => items.some((item) => item._id === r.data._id) ? items : [r.data, ...items]); }).catch((error) => toast.error(errorText(error)));
  }, [params.userId]);
  useEffect(() => {
    if (!active) return;
    api.get(`/chat/conversations/${active}/messages`).then((r) => setMessages(r.data.messages)).catch((error) => toast.error(errorText(error)));
    api.patch(`/chat/conversations/${active}/read`).catch(() => {});
    if (socket) socket.emit('conversation:join', { conversationId: active });
  }, [active, socket]);
  useEffect(() => {
    if (!socket) return;
    const receive = (message) => { if (message.conversation === active || message.conversation?._id === active) setMessages((items) => [...items, message]); };
    const typingEvent = (event) => { if (event.conversationId === active && event.userId !== user?._id) setTyping(event.isTyping); };
    socket.on('message:new', receive); socket.on('typing', typingEvent);
    return () => { socket.off('message:new', receive); socket.off('typing', typingEvent); };
  }, [socket, active, user?._id]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, active]);
  const activeConversation = conversations.find((item) => item._id === active);
  const otherPerson = activeConversation?.participants?.find((person) => (person._id || person) !== user?._id);
  const send = async (event) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || !active) return;
    setText('');
    try {
      const response = await api.post(`/chat/conversations/${active}/messages`, { text: content });
      setMessages((items) => [...items, response.data]);
      setConversations((items) => items.map((item) => item._id === active ? { ...item, lastMessage: response.data, updatedAt: new Date().toISOString() } : item));
    } catch (error) { setText(content); toast.error(errorText(error)); }
  };
  const updateTyping = (value) => {
    setText(value);
    if (socket && active) socket.emit('typing', { conversationId: active, isTyping: Boolean(value.trim()) });
  };
  return <motion.div {...motionIn}><PageHead eyebrow="YOUR CONVERSATIONS" title="Messages." description="Good ideas start with a conversation." />
    <div className={`messages-layout ${mobileChat ? 'mobile-chat-open' : ''}`}><aside className="conversation-sidebar"><div className="conversation-search"><Search size={15} /><input placeholder="Search conversations" /></div>{loading ? <Loading /> : conversations.map((item) => {
      const person = item.participants?.find((candidate) => (candidate._id || candidate) !== user?._id);
      return <button className={`conversation-item ${active === item._id ? 'conversation-active' : ''}`} key={item._id} onClick={() => { setActive(item._id); setMobileChat(true); }}><Avatar user={person} /><span><b>{person?.name || 'Conversation'}</b><small>{item.lastMessage?.text || 'Start a conversation'}</small></span></button>;
    })}</aside>
      <section className="chat-pane">{activeConversation && otherPerson ? <><div className="chat-header"><button className="icon-btn back-mobile" onClick={() => setMobileChat(false)} aria-label="Back to conversations"><ChevronLeft size={18} /></button><Avatar user={otherPerson} /><div><b>{otherPerson.name}</b><small>{otherPerson.headline || otherPerson.role}</small></div><span className="chat-online"><i /> Connection</span></div><div className="message-list" ref={listRef}>{messages.map((message) => { const mine = (message.sender?._id || message.sender) === user?._id; return <div className={`message-row ${mine ? 'message-mine' : ''}`} key={message._id}><div className="message-bubble">{message.text}<small>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div></div>; })}{typing && <div className="typing-indicator"><i /><i /><i /> typing</div>}</div><form className="message-compose" onSubmit={send}><input value={text} onChange={(e) => updateTyping(e.target.value)} placeholder="Write a message…" aria-label="Message" /><button className="button button-primary" disabled={!text.trim()}>Send <ArrowRight size={15} /></button></form></> : <Empty icon={MessageCircle} title="Pick up where you left off" text="Choose a conversation to say hello." action={<Link className="button button-muted button-small" to="/connections">Find a connection</Link>} />}</section>
    </div>
  </motion.div>;
}

export function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [connections, setConnections] = useState([]);
  const [active, setActive] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteTo, setInviteTo] = useState('');
  const load = () => {
    Promise.all([api.get('/teams/mine'), api.get('/connections')]).then(([teamRes, connectionRes]) => { setTeams(teamRes.data); setConnections(connectionRes.data); })
      .catch((error) => toast.error(errorText(error)));
  };
  useEffect(load, []);
  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return toast.error('Give your team a name.');
    try { const response = await api.post('/teams', { name, description }); setTeams((items) => [response.data, ...items]); setName(''); setDescription(''); setCreating(false); toast.success('Your team is ready.'); }
    catch (error) { toast.error(errorText(error)); }
  };
  const accept = async (teamId) => {
    try { await api.post(`/teams/${teamId}/accept`); toast.success('You joined the team!'); load(); }
    catch (error) { toast.error(errorText(error)); }
  };
  const invite = async (teamId) => {
    if (!inviteTo) return toast.error('Choose a connection to invite.');
    try { await api.post(`/teams/${teamId}/invite/${inviteTo}`); toast.success('Invitation sent.'); setInviteTo(''); }
    catch (error) { toast.error(errorText(error)); }
  };
  const visibleTeams = teams.filter((team) => team.members?.some((member) => (member._id || member) === user?._id) || team.owner?._id === user?._id || team.owner === user?._id);
  const invites = teams.filter((team) => team.invites?.some((person) => (person._id || person) === user?._id));
  return <motion.div {...motionIn}><PageHead eyebrow="BUILD YOUR CREW" title="Your teams." description="Bring your people together and turn momentum into progress." action={<button className="button button-primary" onClick={() => setCreating(!creating)}><Plus size={16} /> Create a team</button>} />
    {creating && <form className="panel create-team-form" onSubmit={create}><div className="form-grid"><label>Team name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Climate builders" required /></label><label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you building together?" /></label></div><div className="inline-buttons"><button className="button button-primary button-small">Create team</button><button type="button" className="button button-quiet button-small" onClick={() => setCreating(false)}>Cancel</button></div></form>}
    {invites.length > 0 && <Panel title="Team invitations"><div className="invite-list">{invites.map((team) => <div className="invite-row" key={team._id}><span><b>{team.name}</b><small>Invited to join · {team.members?.length || 0} members</small></span><button className="button button-primary button-small" onClick={() => accept(team._id)}>Accept invite</button></div>)}</div></Panel>}
    {visibleTeams.length ? <div className="teams-grid">{visibleTeams.map((team) => <article className={`team-card ${active?._id === team._id ? 'team-selected' : ''}`} key={team._id}><div className="team-symbol"><Users size={20} /></div><div className="team-info"><h3>{team.name}</h3><p>{team.description || 'A team of builders ready to make things happen.'}</p><div className="team-members"><div className="avatar-stack">{team.members?.slice(0, 4).map((person) => <Avatar key={person._id || person} user={typeof person === 'object' ? person : { name: 'Member' }} />)}</div><span>{team.members?.length || 0} members</span></div></div><button className="button button-muted button-small" onClick={() => setActive(active?._id === team._id ? null : team)}>Manage</button>
      {active?._id === team._id && <div className="team-manage"><b>Invite a connection</b><div className="invite-control"><select value={inviteTo} onChange={(e) => setInviteTo(e.target.value)}><option value="">Select a person</option>{connections.map((connection) => { const person = connection.requester?._id === user?._id ? connection.recipient : connection.requester; return <option key={person._id} value={person._id}>{person.name}</option>; })}</select><button className="button button-primary button-small" onClick={() => invite(team._id)}>Invite</button></div>{team.openRoles?.length > 0 && <div className="tag-row">{team.openRoles.map((role) => <span className="tag" key={role}>{role} wanted</span>)}</div>}</div>}</article>)}</div> : !invites.length && <Empty icon={Users} title="Start your first team" text="Create a team for a side project, startup, or upcoming hackathon." action={<button className="button button-primary button-small" onClick={() => setCreating(true)}>Create a team</button>} />}
  </motion.div>;
}

export function NotFound() {
  return <div className="not-found"><span>404</span><h1>This path hasn’t been built yet.</h1><p>Head back to your workspace and keep building.</p><Link className="button button-primary" to="/dashboard">Go to dashboard <ArrowRight size={15} /></Link></div>;
}
