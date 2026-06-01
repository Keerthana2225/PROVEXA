import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

export default function Login() {
    const [email, setEmail] = useState(() => {
        return localStorage.getItem('login_email') || 'admin@provexa.com';
    });
    const [password, setPassword] = useState(() => {
        return localStorage.getItem('login_password') || '';
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const queryClient = useQueryClient();

    const loginMutation = useMutation({
        mutationFn: async (credentials) => {
            const { data } = await api.post('/auth/login', credentials);
            return data;
        },
        onSuccess: () => {
            localStorage.setItem('login_email', email);
            localStorage.setItem('login_password', password);
            queryClient.invalidateQueries({ queryKey: ['auth'] });
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
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 transition-all duration-300">
                <div className="text-center mb-8">

                    {/*
                      TSF Logo — Exact S-curve geometry matching the real brand logo.
                      The horizontal centerline of the circle is perfectly flush with the top of the "TSF" text.
                      - Top curve: Starts overlapping the 'T', goes left to 9 o'clock, arches to top-right.
                      - Bottom curve: Starts overlapping the 'F', goes right to 3 o'clock, arches to bottom-left.
                    */}
                    <div className="flex justify-center mb-3 transition-transform duration-300 hover:scale-105">
                        {/* Real Image Logo (cropping out bottom artifact line) */}
                        <img 
                            src="/tsf-logo.jpg.png" 
                            alt="TSF Logo" 
                            className="w-[116px] h-[116px] object-contain mix-blend-multiply [clip-path:inset(0_0_8%_0)]"
                        />
                    </div>

                    {/* Brakes India wordmark — styled like the official brand text */}
                    <h2 className="text-2xl font-bold text-[#1C3A78] dark:text-blue-400 tracking-tight mb-4">
                        Brakes India
                    </h2>

                    {/* Main app title */}
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Provexa</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Asset &amp; Replacement Management</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium text-center border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}

                    {/* Email — pre-filled from localStorage */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-200"
                            required
                        />
                    </div>

                    {/* Password — pre-filled from localStorage, eye toggle */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-200"
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl shadow-lg shadow-primary/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center mt-1"
                    >
                        {loginMutation.isPending ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
