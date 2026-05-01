import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Check } from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';

export default function ItemForm({ isOpen, onClose, editData = null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: editData?.name || '',
    category_id: editData?.category_id || '',
    new_category_name: '',
    frequency_days: editData?.frequency_days || '',
    fixed_date: editData?.fixed_date ? new Date(editData.fixed_date).toISOString().split('T')[0] : '',
    description: editData?.description || '',
  });
  const [distributionType, setDistributionType] = useState(editData?.fixed_date ? 'fixed' : 'frequency');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [error, setError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/items/categories');
      return data;
    },
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: async (payload) => {
      // If adding a new category, create it first or let backend handle it
      // Let's assume backend handles it if we send new_category_name
      if (editData) {
        const { data } = await api.put(`/items/${editData.id}`, payload);
        return data;
      }
      const { data } = await api.post('/items', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
      queryClient.invalidateQueries(['categories']);
      onClose();
      resetForm();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to save item');
    }
  });

  const resetForm = () => {
    setForm({ name: '', category_id: '', new_category_name: '', frequency_days: '', fixed_date: '', description: '' });
    setDistributionType('frequency');
    setIsAddingCategory(false);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAddingCategory && !form.category_id) return setError('Please select a category');
    if (isAddingCategory && !form.new_category_name) return setError('Please enter a category name');
    if (distributionType === 'frequency' && !form.frequency_days) return setError('Please enter frequency days');
    if (distributionType === 'fixed' && !form.fixed_date) return setError('Please select a fixed date');
    
    // Clean up payload
    const payload = { ...form };
    if (distributionType === 'frequency') payload.fixed_date = null;
    if (distributionType === 'fixed') payload.frequency_days = null;

    setError('');
    mutation.mutate(payload);
  };

  const frequencyPresets = [
    { label: 'Daily (1d)', value: 1 },
    { label: 'Monthly (30d)', value: 30 },
    { label: 'Quarterly (90d)', value: 90 },
    { label: 'Biannual (180d)', value: 180 },
    { label: 'Annual (365d)', value: 365 },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Item' : 'Add New Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Towel"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between items-center">
            <span>Category <span className="text-red-500">*</span></span>
            <button 
                type="button" 
                onClick={() => {
                    setIsAddingCategory(!isAddingCategory);
                    setForm(f => ({ ...f, category_id: '', new_category_name: '' }));
                }}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
                <Plus className="w-3 h-3" />
                {isAddingCategory ? 'Select Existing Category' : 'Add New Category'}
            </button>
          </label>
          
          {isAddingCategory ? (
            <input
              type="text"
              placeholder="Enter new category name..."
              value={form.new_category_name}
              onChange={e => setForm(f => ({ ...f, new_category_name: e.target.value }))}
              className="w-full px-4 py-3 bg-blue-50/50 border border-primary/30 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              autoFocus
            />
          ) : (
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Select Category</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Distribution Schedule <span className="text-red-500">*</span>
          </label>
          
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="radio" 
                name="distType" 
                checked={distributionType === 'frequency'} 
                onChange={() => setDistributionType('frequency')} 
                className="text-primary focus:ring-primary" 
              />
              Frequency (Days)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="radio" 
                name="distType" 
                checked={distributionType === 'fixed'} 
                onChange={() => setDistributionType('fixed')} 
                className="text-primary focus:ring-primary" 
              />
              Fixed Date
            </label>
          </div>

          {distributionType === 'frequency' ? (
            <>
              <div className="flex gap-2 mb-2 flex-wrap">
                {frequencyPresets.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, frequency_days: p.value }))}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                      parseInt(form.frequency_days) === p.value
                        ? 'bg-primary text-white border-primary'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                placeholder="Custom days..."
                value={form.frequency_days}
                onChange={e => setForm(f => ({ ...f, frequency_days: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </>
          ) : (
            <input
              type="date"
              value={form.fixed_date}
              onChange={e => setForm(f => ({ ...f, fixed_date: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of the item..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 mt-2"
        >
          {mutation.isPending ? 'Saving...' : editData ? 'Save Changes' : 'Add Item'}
        </button>
      </form>
    </Modal>
  );
}
