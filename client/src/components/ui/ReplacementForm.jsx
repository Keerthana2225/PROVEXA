import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, User, DollarSign, Package, Info } from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import { toast } from '../ui/Toast';

export default function ReplacementForm({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
      employee_id: '',
      item_id: '',
      reason: '',
      quantity: 1,
      size: '',
      unit_cost: 0,
      deduction_amount: 0,
      payment_status: 'Not Applicable',
      return_status: 'Not Required'
  });
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null); // full item object with category

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

  // Determine if cost tracking applies based on the selected item's category
  const isCostTrackingItem = !!selectedItem?.category?.requires_cost_tracking;

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

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen]);

  // When cost tracking is disabled, reset all financial fields
  useEffect(() => {
    if (!isCostTrackingItem) {
      setForm(f => ({ ...f, unit_cost: 0, deduction_amount: 0, payment_status: 'Not Applicable' }));
    }
  }, [isCostTrackingItem]);

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
    if (aName.startsWith(s) && !bName.startsWith(s)) return -1;
    if (bName.startsWith(s) && !aName.startsWith(s)) return 1;
    return aName.localeCompare(bName);
  });

  const selectedEmployee = employees?.find(e => e.id?.toString() === form.employee_id?.toString());

  // Update unit cost + selected item ref when item changes
  const handleItemChange = (e) => {
    const itemId = e.target.value;
    const item = items?.find(i => i.id === itemId);
    setSelectedItem(item || null);
    setForm(f => ({
      ...f,
      item_id: itemId,
      unit_cost: item?.category?.requires_cost_tracking ? (item?.cost || 0) : 0,
    }));
  };

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/replacements', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replacements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success('Replacement request submitted successfully!');
      onClose();
      resetForm();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to submit request')
  });

  const resetForm = () => {
    setForm({
      employee_id: '', item_id: '', reason: '',
      quantity: 1, size: '', unit_cost: 0, deduction_amount: 0,
      payment_status: 'Not Applicable', return_status: 'Not Required'
    });
    setSelectedItem(null);
    setEmployeeSearch('');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee_id) { setError('Please select an employee'); return; }
    setError('');
    mutation.mutate(form);
  };

  const totalCost = isCostTrackingItem ? ((form.quantity * form.unit_cost) || 0) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Replacement Request">
      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[75vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
        )}

        {/* Section 1: Employee & Item */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee & Item</h3>

          {/* Searchable Employee Select */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Employee <span className="text-red-500">*</span>
            </label>
            <div className="relative cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User className="w-4 h-4" /></div>
              <input
                type="text"
                placeholder={selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.emp_code})` : "Search by name or code..."}
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setIsDropdownOpen(true);
                  if (form.employee_id) setForm(f => ({ ...f, employee_id: '' }));
                }}
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all ${selectedEmployee && !employeeSearch ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {filteredEmployees?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500 italic">No employees found</div>
                ) : (
                  filteredEmployees?.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => { setForm(f => ({ ...f, employee_id: emp.id.toString() })); setEmployeeSearch(''); setIsDropdownOpen(false); }}
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

          {/* Item Select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Replacement Item <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Package className="w-4 h-4" /></div>
              <select
                required
                value={form.item_id}
                onChange={handleItemChange}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
              >
                <option value="">Select Item</option>
                {items?.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.category?.name})</option>
                ))}
              </select>
            </div>

            {/* Category indicator badge */}
            {selectedItem && (
              <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border w-fit font-semibold ${isCostTrackingItem ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                <Info className="w-3.5 h-3.5" />
                {isCostTrackingItem
                  ? `Uniform item — cost & payment tracking enabled`
                  : `Non-uniform item — no payment tracking required`
                }
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Size <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
              <input type="text" placeholder="e.g. XL, 42, M" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
        </div>

        {/* Section 2: Cost & Payment — ONLY shown for uniform items */}
        {isCostTrackingItem && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Cost & Payment</h3>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">UNIFORM</span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cost per Unit (₹)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                  <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: parseFloat(e.target.value) || 0 }))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Amount (₹)</label>
                <div className="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-700 flex items-center gap-1">
                  ₹ {totalCost.toFixed(2)}
                  <span className="text-[10px] font-normal text-amber-600 opacity-80">(Auto-calculated)</span>
                </div>
              </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salary Deduction Amount (₹)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                  <input type="number" min="0" step="0.01" value={form.deduction_amount} onChange={e => setForm(f => ({ ...f, deduction_amount: parseFloat(e.target.value) || 0 }))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <p className="mt-1 text-[10px] text-slate-400 italic font-medium">* This amount will be automatically marked as 'Pending' for salary deduction.</p>
            </div>
          </div>
        )}

        {/* Section 3: Tracking */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracking</h3>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Return Status for Old Item</label>
            <select value={form.return_status} onChange={e => setForm(f => ({ ...f, return_status: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <option value="Not Required">Not Required</option>
              <option value="Pending Return">Pending Return</option>
              <option value="Returned">Already Returned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason for Replacement <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={2}
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. worn out, damaged, lost..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
