import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export default function Login() {
    const [email, setEmail] = useState('admin@provexa.com');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState('');
    const queryClient = useQueryClient();

    const loginMutation = useMutation({
        mutationFn: async (credentials) => {
            const { data } = await api.post('/auth/login', credentials);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['auth']);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Login failed');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90 transition-all">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Provexa</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Asset & Replacement Management</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium text-center border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-200"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-200"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl shadow-lg shadow-primary/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                    >
                        {loginMutation.isPending ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
