import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Compass, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, Sun, Users, Trophy, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { useAuth } from '../store/authStore.js';
import { useTheme } from '../store/themeStore.js';
import { useSocket } from '../hooks/useSocket.js';

const links = [
  ['/dashboard', 'Overview', LayoutDashboard], ['/discover', 'Discover people', Compass],
  ['/hackathons', 'Hackathons', Trophy], ['/connections', 'Connections', Users],
  ['/messages', 'Messages', MessageCircle], ['/teams', 'My teams', Sparkles]
];
export function DashboardLayout({ children }) {
  const { user, clearUser } = useAuth();
  const { theme, toggle } = useTheme();
  const socket = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);
  useEffect(() => {
    api.get('/notifications').then((r) => setNotifications(r.data)).catch(() => toast.error('Could not load notifications.'));
  }, []);
  useEffect(() => {
    if (!socket) return;
    const handle = (notification) => { setNotifications((items) => [notification, ...items]); toast('You have a new update'); };
    socket.on('notification:new', handle);
    return () => socket.off('notification:new', handle);
  }, [socket]);
  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* local sign-out remains available */ }
    clearUser(); navigate('/login');
  };
  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    } catch { toast.error('Could not update notifications.'); }
  };
  return <div className="app-shell">
    {open && <button className="mobile-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-icon"><Sparkles size={18} /></span><span>cofounder<span className="brand-ai">.ai</span></span><button className="icon-btn close-mobile" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">{links.map(([href, label, Icon]) => <NavLink key={href} to={href} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="mini-profile"><Avatar user={user} /><div className="mini-profile-copy"><b>{user?.name}</b><span>{user?.role}</span></div></div>
        <button className="nav-link" onClick={logout}><LogOut size={18} />Sign out</button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-mobile" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="crumb">Workspace <span>/</span> <b>{links.find(([href]) => window.location.pathname.startsWith(href))?.[1] || 'Overview'}</b></div>
        <div className="top-actions"><button className="icon-btn" onClick={toggle} aria-label="Toggle color theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="notification-wrap"><button className="icon-btn notification-trigger" onClick={() => setShowNotifications((value) => !value)} aria-label="Notifications"><Bell size={18} />{notifications.some((item) => !item.read) && <i />}</button>
            {showNotifications && <div className="notification-popover"><div className="popover-head"><b>Notifications</b><button onClick={markAllRead}>Mark all read</button></div>{notifications.length ? notifications.slice(0, 7).map((item) => <div key={item._id} className={`notice ${item.read ? '' : 'notice-unread'}`}><span className="notice-dot" /><div><b>{notificationTitle(item)}</b><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>) : <div className="empty-mini">You’re all caught up.</div>}</div>}
          </div><button className="top-avatar" onClick={() => navigate('/profile')}><Avatar user={user} /></button>
        </div>
      </header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}
function notificationTitle(item) {
  const name = item.data?.name || item.data?.from || 'Someone';
  return item.type === 'connection_request' ? `${name} sent you a connection request` : item.type === 'connection_accepted' ? `${name} accepted your request` : item.type === 'team_invite' ? `Invitation to ${item.data?.teamName || 'a team'}` : `${name} sent you a message`;
}
export function Avatar({ user, size = 'normal' }) {
  const initials = (user?.name || '?').split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const src = user?.avatar ? (/^(https?:|data:)/.test(user.avatar) ? user.avatar : `${apiOrigin}${user.avatar}`) : '';
  return <span className={`avatar avatar-${size}`}>{src ? <img src={src} alt={`${user?.name || 'User'} avatar`} /> : initials}</span>;
}
