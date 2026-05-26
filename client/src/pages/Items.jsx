import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Pencil, Trash2, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import ItemForm from '../components/ui/ItemForm';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';

export default function Items() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editData, setEditData] = useState(null);
    const [filterCategory, setFilterCategory] = useState('');
    
    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState(null);

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await api.get('/items/categories');
            return data;
        }
    });

    const { data: items, isLoading } = useQuery({
        queryKey: ['items', filterCategory],
        queryFn: async () => {
            const url = filterCategory ? `/items?categoryId=${filterCategory}` : '/items';
            const { data } = await api.get(url);
            return data;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/items/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['items']);
            toast.success('Item deleted successfully');
            setDeleteId(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete item');
            setDeleteId(null);
        }
    });

    const handleEdit = (item) => {
        setEditData(item);
        setShowForm(true);
    };

    const handleClose = () => {
        setShowForm(false);
        setEditData(null);
    };

    const confirmDelete = (id) => {
        setDeleteId(id);
    };

    const categoryColors = {
        'Uniforms': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Linen': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
        'Welfare': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        'Safety Gear': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };

    const getFrequencyText = (item) => {
        if (item.fixed_date) {
            return `📅 Due: ${new Date(item.fixed_date).toLocaleDateString()}`;
        }
        const name = (item.name || '').toLowerCase();
        
        if (name === 'soap') {
            return '🔄 Quarterly Distribution (Annual Allocation: 15 Soaps)';
        }
        if (name === 'sweet box') {
            return '🔄 Event Based Distribution';
        }
        if (name === 'boost') {
            return '🔄 Benefit Triggered (Blood Donation)';
        }
        if (name === 'turkey towel') {
            return '🔄 Union Quarterly Distribution (Q1 Split: Issued First Week of April)';
        }
        if (name === '3-piece towel set') {
            return '🔄 Union Quarterly Distribution (Q2 & Q4 Split)';
        }
        if (name === 'bedsheet') {
            return '🔄 Annual Renewal / Union Q3 Split (Issued First Week of October)';
        }
        
        return `🔄 Every ${item.frequency_days} days`;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Items Master</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure company-approved inventory, set renewal intervals, and manage standard catalog items.</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterCategory('')}
                        className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${!filterCategory ? 'bg-primary text-white border-primary shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        All Items
                    </button>
                    {categories?.map(c => (
                        <button
                            key={c._id || c.id}
                            onClick={() => setFilterCategory(c._id || c.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${filterCategory === (c._id || c.id) ? 'bg-primary text-white border-primary shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => { setEditData(null); setShowForm(true); }}
                    className="flex items-center justify-center bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-primary/20 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 animate-pulse">
                            <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                        </div>
                    ))
                ) : items?.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No items found</p>
                        <p className="text-slate-400 text-sm mt-1">Add items to the master list to start tracking distribution.</p>
                    </div>
                ) : (
                    items?.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-card-hover transition-all group animate-fade-in">
                            <div className="flex justify-between items-start mb-5">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Package className="w-6 h-6" />
                                </div>
                                <span 
                                    onClick={() => setFilterCategory(item.category._id || item.category.id)}
                                    className={`cursor-pointer hover:opacity-80 px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[item.category.name] || 'bg-slate-100 text-slate-600'}`}
                                >
                                    {item.category.name}
                                </span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{item.name}</h4>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {getFrequencyText(item)}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-5 min-h-[2.5rem]">
                                {item.description || 'No description provided.'}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary/30 hover:text-primary transition-all"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => confirmDelete(item.id)}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 transition-all"
                                    title="Delete Item"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ItemForm isOpen={showForm} onClose={handleClose} editData={editData} />

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Deletion">
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-bold">Warning</p>
                            <p>Are you sure you want to delete this item? This action cannot be undone.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setDeleteId(null)}
                            className="flex-1 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => deleteMutation.mutate(deleteId)}
                            disabled={deleteMutation.isPending}
                            className="flex-1 px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
