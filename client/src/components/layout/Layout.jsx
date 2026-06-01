import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Users, Package, FileText, Clock, RefreshCw, BarChart2, LogOut, ShieldCheck, Menu } from 'lucide-react';
import api from '../../lib/api';
import ToastContainer from '../ui/Toast';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/items', icon: Package, label: 'Items Master' },
    { path: '/issues', icon: FileText, label: 'Issue Management' },
    { path: '/item-renewal', icon: Clock, label: 'Item Renewal & Return' },
    { path: '/replacements', icon: RefreshCw, label: 'Replacements' },
    { path: '/reports', icon: BarChart2, label: 'Reports' },
];

const pageTitles = {
    '/': 'Dashboard',
    '/employees': 'Employees',
    '/items': 'Items Master',
    '/issues': 'Issue Management',
    '/item-renewal': 'Item Renewal & Return',
    '/replacements': 'Replacements',
    '/reports': 'Reports & Export',
};

export default function Layout() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
            queryClient.clear();
            navigate('/login');
        } catch (err) {
            console.error(err);
        }
    };

    const pageTitle = pageTitles[location.pathname] || 'Provexa';

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Sidebar */}
            <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-100 flex flex-col flex-shrink-0 shadow-sm z-20 transition-all duration-300`}>
                {/* Logo */}
                <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} border-b border-slate-100`}>
                    {/* TSF exact S-curve icon */}
                    <div className={`flex-shrink-0 flex items-center justify-center transition-transform duration-200 hover:scale-110 ${isCollapsed ? '' : 'mr-2.5'}`}>
                        <img 
                            src="/tsf-logo.jpg.png" 
                            alt="TSF Logo" 
                            className="w-[38px] h-[38px] object-contain mix-blend-multiply [clip-path:inset(0_0_8%_0)]"
                        />
                    </div>
                    {!isCollapsed && <span className="text-base font-bold text-slate-900 tracking-tight transition-all truncate">Provexa</span>}
                </div>

                {/* Navigation */}
                <nav className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'} space-y-1`}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={`w-4.5 h-4.5 ${isCollapsed ? 'm-0' : 'mr-3'} flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} style={{width:'18px', height:'18px'}} />
                                    {!isCollapsed && <span className="transition-all">{item.label}</span>}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'px-3'} py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium transition-all group`}
                    >
                        <LogOut className={`w-4.5 h-4.5 ${isCollapsed ? 'm-0' : 'mr-3'} text-slate-400 group-hover:text-red-500`} style={{width:'18px', height:'18px'}} />
                        {!isCollapsed && <span className="transition-all">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 flex-shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-900 transition-colors border border-slate-100"
                            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        >
                            <Menu className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
                        </button>
                        <h1 className="text-lg font-semibold text-slate-800">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs text-slate-500">Store/HR Admin</div>
                            <div className="text-sm font-medium text-slate-700">System Admin</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            A
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-8 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Toast Notifications */}
            <ToastContainer />
        </div>
    );
}
