import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, User } from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import { toast } from '../ui/Toast';

export default function ReplacementForm({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ employee_id: '', item_id: '', reason: '' });
  const [error, setError] = useState('');

  // Searchable Select State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await api.get('/employees?limit=200');
      return data.employees;
    },
    enabled: isOpen,
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data } = await api.get('/items');
      return data;
    },
    enabled: isOpen,
  });

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = employees?.filter(emp => {
    if (!employeeSearch.trim()) return emp.status === 'active';
    const s = employeeSearch.toLowerCase().trim();
    return emp.status === 'active' && (
      emp.name.toLowerCase().includes(s) || 
      emp.emp_code.toLowerCase().includes(s)
    );
  }).sort((a, b) => {
    const s = employeeSearch.toLowerCase().trim();
    if (!s) return 0;

    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aCode = a.emp_code.toLowerCase();
    const bCode = b.emp_code.toLowerCase();

    // Exact matches first
    if (aName === s || aCode === s) return -1;
    if (bName === s || bCode === s) return 1;

    // Matches at the start next
    const aStarts = aName.startsWith(s) || aCode.startsWith(s);
    const bStarts = bName.startsWith(s) || bCode.startsWith(s);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;

    // Then alphabetical
    return aName.localeCompare(bName);
  });

  const selectedEmployee = employees?.find(e => e.id?.toString() === form.employee_id?.toString());

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/replacements', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['replacements']);
      queryClient.invalidateQueries(['dashboardStats']);
      toast.success('Replacement request submitted successfully!');
      onClose();
      resetForm();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to submit request');
    }
  });

  const resetForm = () => {
    setForm({ employee_id: '', item_id: '', reason: '' });
    setEmployeeSearch('');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee_id) {
        setError('Please select an employee');
        return;
    }
    setError('');
    mutation.mutate(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Replacement Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
        )}

        {/* Searchable Employee Select */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Employee <span className="text-red-500">*</span>
          </label>
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.emp_code})` : "Search by name or code..."}
              value={employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                setIsDropdownOpen(true);
                if (form.employee_id) setForm(f => ({ ...f, employee_id: '' }));
              }}
              className={`w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all ${selectedEmployee && !employeeSearch ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-slide-up">
              {filteredEmployees?.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 italic">
                  No employees found
                </div>
              ) : (
                filteredEmployees?.map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setForm(f => ({ ...f, employee_id: emp.id.toString() }));
                      setEmployeeSearch('');
                      setIsDropdownOpen(false);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 ${form.employee_id === emp.id.toString() ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-slate-500">{emp.emp_code} · {emp.department}</div>
                    </div>
                    {form.employee_id === emp.id.toString() && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Item Requesting Replacement <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.item_id}
            onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">Select Item</option>
            {items?.map(item => (
              <option key={item.id} value={item.id}>{item.name} ({item.category.name})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Reason for Replacement <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Describe why a replacement is needed (e.g. worn out, damaged, lost)..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 mt-2"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </Modal>
  );
}
