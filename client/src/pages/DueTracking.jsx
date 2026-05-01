import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AlertCircle, Clock, CalendarDays } from 'lucide-react';
import api from '../lib/api';

const DueSection = ({ title, items, icon: Icon, colorClass, emptyMessage }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center ${colorClass}`}>
            <Icon className="w-5 h-5 mr-3" />
            <h3 className="font-semibold text-lg">{title} <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-white/20">{items?.length || 0}</span></h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items?.length === 0 ? (
                <div className="p-6 text-center text-slate-500">{emptyMessage}</div>
            ) : (
                items?.map(issue => (
                    <div key={issue.id} className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-white flex items-center">
                                {issue.employee.name} 
                                <span className="text-xs font-normal text-slate-500 ml-2">({issue.employee.emp_code}) - {issue.employee.department}</span>
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {issue.item.name}
                            </p>
                        </div>
                        <div className="flex items-center sm:justify-end gap-4 sm:w-1/3">
                            <div className="text-right">
                                <div className="text-xs text-slate-500 mb-0.5">Due Date</div>
                                <div className={`font-medium ${colorClass.includes('red') ? 'text-red-600 dark:text-red-400' : ''}`}>
                                    {dayjs(issue.next_due_date).format('MMM D, YYYY')}
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                                Re-issue
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
);

export default function DueTracking() {
    const { data, isLoading } = useQuery({
        queryKey: ['dueTracking'],
        queryFn: async () => {
            const res = await api.get('/issues/due');
            return res.data;
        }
    });

    if (isLoading) {
        return <div className="animate-pulse space-y-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
        </div>;
    }

    return (
        <div className="space-y-8">
            <DueSection 
                title="Overdue Items" 
                items={data?.overdue} 
                icon={AlertCircle} 
                colorClass="text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30" 
                emptyMessage="No overdue items. Great job!"
            />
            <DueSection 
                title="Due This Week" 
                items={data?.dueThisWeek} 
                icon={Clock} 
                colorClass="text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" 
                emptyMessage="Nothing due this week."
            />
            <DueSection 
                title="Upcoming (Next 30 Days)" 
                items={data?.upcoming} 
                icon={CalendarDays} 
                colorClass="text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" 
                emptyMessage="No upcoming dues next month."
            />
        </div>
    );
}
