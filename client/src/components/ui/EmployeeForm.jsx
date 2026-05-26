import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import { toast } from './Toast';

export default function EmployeeForm({ isOpen, onClose, editData = null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    emp_code: '',
    name: '',
    department: '',
    designation: '',
    employee_type: 'Permanent Employee',
    gender: 'Male',
    status: 'active',
    sizes: { shirt: '', pant: '', shoe: '' },
    grade: '',
    is_union_member: false,
    is_alternative_attire: false,
    doj: dayjs().format('YYYY-MM-DD')
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({
        emp_code:      editData?.emp_code || '',
        name:          editData?.name || '',
        department:    editData?.department || '',
        designation:   editData?.designation || '',
        employee_type: editData?.employee_type || 'Permanent Employee',
        gender:        editData?.gender || 'Male',
        status:        editData?.status || 'active',
        sizes: {
          shirt: editData?.sizes?.shirt || editData?.sizes_shirt || '',
          pant:  editData?.sizes?.pant  || editData?.sizes_pant  || '',
          shoe:  editData?.sizes?.shoe  || editData?.sizes_shoe  || '',
        },
        grade:         editData?.grade || '',
        is_union_member: editData?.is_union_member === true || editData?.is_union_member === 1 || false,
        is_alternative_attire: editData?.is_alternative_attire === true || editData?.is_alternative_attire === 1 || false,
        doj:           editData?.doj ? dayjs(editData.doj).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
      });
      setError('');
    }
  }, [editData, isOpen]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (editData) {
        const empId = editData._id || editData.id;
        const { data } = await api.put(`/employees/${empId}`, payload);
        return data;
      }
      const { data } = await api.post('/employees', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      toast.success(editData ? 'Employee updated successfully!' : 'Employee added successfully!');
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to save employee';
      setError(msg);
      toast.error(msg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  };

  const departments = ['Production', 'Maintenance', 'Quality', 'Stores', 'HR', 'Finance', 'Admin', 'Shop Floor', 'Warehouse'];
  const designations = ['Operator', 'Supervisor', 'Union Operator', 'Technician', 'Engineer', 'Manager', 'Executive'];
  const employeeCategories = [
    'Permanent Employee',
    'Operator',
    'Union Operator',
    'Supervisor',
    'Corporate Employee',
    'Trainee'
  ];

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

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Employee Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.employee_type}
              onChange={e => {
                const val = e.target.value;
                setForm(f => ({ 
                  ...f, 
                  employee_type: val,
                  // Auto check Union Member if Union Operator selected
                  is_union_member: val === 'Union Operator' ? true : f.is_union_member 
                }));
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Select Category</option>
              {employeeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Date of Joining (DOJ) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.doj}
              onChange={e => setForm(f => ({ ...f, doj: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Grade
            </label>
            <input
              type="text"
              placeholder="e.g. Grade 12"
              value={form.grade}
              onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gender <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {['Male', 'Female'].map(g => (
                <label key={g} className={`flex-1 flex items-center justify-center gap-2 py-3.5 border rounded-xl cursor-pointer transition-all text-sm font-bold
                  ${form.gender === g
                    ? g === 'Female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}`}>
                  <input type="radio" name="gender" value={g} checked={form.gender === g}
                    onChange={() => setForm(f => ({ 
                      ...f, 
                      gender: g, 
                      // If Male, cannot choose alternative attire
                      is_alternative_attire: g === 'Male' ? false : f.is_alternative_attire 
                    }))} className="hidden" />
                  {g === 'Female' ? '♀ Female' : '♂ Male'}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Switches row for flags */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-3 cursor-pointer p-1">
            <input
              type="checkbox"
              checked={form.is_union_member}
              onChange={e => setForm(f => ({ ...f, is_union_member: e.target.checked }))}
              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
            />
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Union Member</span>
              <span className="block text-[10px] text-slate-400">Eligible for union towels/benefits</span>
            </div>
          </label>

          {form.gender === 'Female' && (
            <label className="flex items-center gap-3 cursor-pointer p-1 animate-fade-in">
              <input
                type="checkbox"
                checked={form.is_alternative_attire}
                onChange={e => setForm(f => ({ ...f, is_alternative_attire: e.target.checked }))}
                className="w-4 h-4 text-pink-600 rounded border-slate-300 focus:ring-pink-500"
              />
              <div>
                <span className="block text-xs font-bold text-pink-700 dark:text-pink-400">Alternative Attire</span>
                <span className="block text-[10px] text-slate-400">Chudidhar Top, Bottom & Coat</span>
              </div>
            </label>
          )}
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
