import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Modal from '../ui/Modal';

export default function EmployeeForm({ isOpen, onClose, editData = null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    emp_code: '',
    name: '',
    department: '',
    designation: '',
    employee_type: 'Permanent',
    gender: 'Male',
    status: 'active',
    sizes: { shirt: '', pant: '', shoe: '' },
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({
        emp_code:      editData?.emp_code || '',
        name:          editData?.name || '',
        department:    editData?.department || '',
        designation:   editData?.designation || '',
        employee_type: editData?.employee_type || 'Permanent',
        gender:        editData?.gender || 'Male',
        status:        editData?.status || 'active',
        sizes: {
          shirt: editData?.sizes?.shirt || '',
          pant:  editData?.sizes?.pant  || '',
          shoe:  editData?.sizes?.shoe  || '',
        },
      });
      setError('');
    }
  }, [editData, isOpen]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (editData) {
        const { data } = await api.put(`/employees/${editData.id}`, payload);
        return data;
      }
      const { data } = await api.post('/employees', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to save employee');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  };

  const departments = ['Production', 'Maintenance', 'Quality', 'Stores', 'HR', 'Finance', 'Admin'];
  const designations = ['Operator', 'Technician', 'Supervisor', 'Manager', 'Engineer', 'Executive'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Employee' : 'Add New Employee'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Employee Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!!editData}
              placeholder="e.g. 11222"
              value={form.emp_code}
              onChange={e => setForm(f => ({ ...f, emp_code: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Kumar"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.department}
            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">Select Department</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Designation <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.designation}
            onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">Select Designation</option>
            {designations.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Employment Type</label>
          <div className="flex gap-3">
            {['Permanent', 'Intern'].map(type => (
              <label key={type} className={`flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer capitalize transition-all text-sm font-medium
                ${form.employee_type === type
                  ? type === 'Intern'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input type="radio" name="employee_type" value={type} checked={form.employee_type === type}
                  onChange={() => setForm(f => ({ ...f, employee_type: type }))} className="hidden" />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gender <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            {['Male', 'Female'].map(g => (
              <label key={g} className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-all text-sm font-medium
                ${form.gender === g
                  ? g === 'Female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}`}>
                <input type="radio" name="gender" value={g} checked={form.gender === g}
                  onChange={() => setForm(f => ({ ...f, gender: g }))} className="hidden" />
                {g === 'Female' ? '♀' : '♂'} {g}
              </label>
            ))}
          </div>
        </div>

        {/* Uniform Sizes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Uniform Sizes <span className="text-slate-400 text-xs font-normal">(fill now to pre-fill issue forms)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'shirt', label: 'Shirt', placeholder: 'e.g. 40, M, L' },
              { key: 'pant',  label: 'Pant',  placeholder: 'e.g. 32, 34' },
              { key: 'shoe',  label: 'Shoe',  placeholder: 'e.g. 7, 8, 9' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label} Size</label>
                <input type="text" placeholder={placeholder} value={form.sizes?.[key] || ''}
                  onChange={e => setForm(f => ({ ...f, sizes: { ...f.sizes, [key]: e.target.value } }))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-center" />
              </div>
            ))}
          </div>
        </div>

        {editData && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
            <div className="flex gap-3">
              {['active', 'inactive'].map(s => (
                <label key={s} className={`flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer capitalize transition-all text-sm font-medium
                  ${form.status === s
                    ? s === 'active'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <input type="radio" name="status" value={s} checked={form.status === s}
                    onChange={() => setForm(f => ({ ...f, status: s }))} className="hidden" />
                  {s}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 mt-2"
        >
          {mutation.isPending ? 'Saving...' : editData ? 'Save Changes' : 'Add Employee'}
        </button>
      </form>
    </Modal>
  );
}
