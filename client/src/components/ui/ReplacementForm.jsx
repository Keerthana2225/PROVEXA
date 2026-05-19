import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, User, DollarSign, Package, Info, AlertTriangle, HelpCircle } from 'lucide-react';
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
      return_status: 'Not Required',
      allocation_type: 'Standard',
      is_salary_deduction: false,
      approved_standard_quantity: 0
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

  // Query Allocation Configurations
  const { data: configs } = useQuery({
    queryKey: ['allocation-configs'],
    queryFn: async () => {
      const { data } = await api.get('/replacements/configs');
      return data;
    },
    enabled: isOpen,
  });

  // Query active issues for the selected employee to run standard allocation limits validation
  const { data: activeIssues } = useQuery({
    queryKey: ['active-issues', form.employee_id],
    queryFn: async () => {
      if (!form.employee_id) return [];
      const { data } = await api.get(`/issues?employeeId=${form.employee_id}&lifecycle_status=Active`);
      return data;
    },
    enabled: isOpen && !!form.employee_id,
  });

  const getItemType = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('t-shirt') || n.includes('tshirt')) return 'T-Shirt';
    if (n.includes('shirt')) return 'Shirt';
    if (n.includes('pant')) return 'Pant';
    return 'Other';
  };

  const getLimit = (itemType, employee) => {
    const conf = configs?.find(c => c.item_type === itemType);
    const isNewcomer = employee?.employee_type === 'Newcomer';
    if (conf) {
      return isNewcomer ? (conf.newcomer_quantity ?? 3) : (conf.permanent_quantity ?? 2);
    }
    const defaults = { 
      'Pant': isNewcomer ? 3 : 2, 
      'Shirt': 2, 
      'T-Shirt': 1 
    };
    return defaults[itemType] || 0;
  };

  // Determine if cost tracking applies based on category or type
  const isCostTrackingItem = !!selectedItem?.category?.requires_cost_tracking || form.allocation_type === 'Additional';

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

  const itemType = selectedItem ? getItemType(selectedItem.name) : 'Other';
  const limit = getLimit(itemType, selectedEmployee);

  // Automatic excess limits validation and deduction calculation
  useEffect(() => {
    if (!selectedItem) return;

    if (form.allocation_type === 'Replacement') {
      // Keep user choice for replacements (Optional Deduction)
      return;
    }

    if (limit > 0 && activeIssues) {
      let alreadyReceived = 0;
      activeIssues.forEach(issue => {
        const name = issue.item_name || issue.item?.name;
        if (getItemType(name) === itemType) {
          alreadyReceived += (issue.quantity || 0);
        }
      });

      const totalProposed = alreadyReceived + form.quantity;
      if (totalProposed > limit) {
        let defaultCost = 200;
        if (itemType === 'Pant') defaultCost = 250;
        else if (itemType === 'Shirt') defaultCost = 150;
        else if (itemType === 'T-Shirt') defaultCost = 100;

        setForm(f => ({
          ...f,
          allocation_type: 'Additional',
          is_salary_deduction: true,
          unit_cost: f.unit_cost || defaultCost,
          deduction_amount: f.deduction_amount || (f.quantity * (f.unit_cost || defaultCost)),
          payment_status: 'Pending'
        }));
      } else {
        setForm(f => ({
          ...f,
          allocation_type: 'Standard',
          is_salary_deduction: false,
          approved_standard_quantity: f.quantity,
          unit_cost: 0,
          deduction_amount: 0,
          payment_status: 'Not Applicable'
        }));
      }
    } else {
      // General item allocation
      setForm(f => ({
        ...f,
        allocation_type: 'Standard',
        is_salary_deduction: false,
        approved_standard_quantity: f.quantity,
        unit_cost: 0,
        deduction_amount: 0,
        payment_status: 'Not Applicable'
      }));
    }
  }, [form.employee_id, form.item_id, form.quantity, form.allocation_type, activeIssues, selectedItem, limit, itemType]);

  // Update selected item reference when dropdown changes
  const handleItemChange = (e) => {
    const itemId = e.target.value;
    const item = items?.find(i => i.id === itemId);
    setSelectedItem(item || null);
    
    let defaultCost = 0;
    const type = item ? getItemType(item.name) : 'Other';
    if (type === 'Pant') defaultCost = 250;
    else if (type === 'Shirt') defaultCost = 150;
    else if (type === 'T-Shirt') defaultCost = 100;

    setForm(f => ({
      ...f,
      item_id: itemId,
      unit_cost: defaultCost,
      deduction_amount: defaultCost * f.quantity
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
      toast.success('Uniform allocation request recorded successfully!');
      onClose();
      resetForm();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to submit request')
  });

  const resetForm = () => {
    setForm({
      employee_id: '', item_id: '', reason: '',
      quantity: 1, size: '', unit_cost: 0, deduction_amount: 0,
      payment_status: 'Not Applicable', return_status: 'Not Required',
      allocation_type: 'Standard', is_salary_deduction: false, approved_standard_quantity: 0
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

  const totalCost = form.quantity * form.unit_cost;

  // Compute dynamic form title
  const getFormTitle = () => {
    if (form.allocation_type === 'Standard') return 'New Standard Uniform Allocation';
    if (form.allocation_type === 'Additional') return 'New Additional Uniform Request';
    return 'New Exchange / Replacement Request';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getFormTitle()}>
      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[75vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">{error}</div>
        )}

        {/* Dynamic standard guidelines reference panel */}
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Info className="w-4 h-4 text-blue-500" />
              Standard Allocation Guidelines
            </div>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded leading-none ${selectedEmployee?.employee_type === 'Newcomer' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'}`}>
              Quota: {selectedEmployee?.employee_type || 'Permanent'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center mt-2">
            {[
              { type: 'Pants', limit: getLimit('Pant', selectedEmployee), bg: 'bg-indigo-50/50 text-indigo-700 border-indigo-100/50' },
              { type: 'Shirts', limit: getLimit('Shirt', selectedEmployee), bg: 'bg-sky-50/50 text-sky-700 border-sky-100/50' },
              { type: 'T-Shirts', limit: getLimit('T-Shirt', selectedEmployee), bg: 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50' }
            ].map((item, idx) => (
              <div key={idx} className={`p-2 py-3 rounded-xl border ${item.bg}`}>
                <span className="block text-[9px] font-black uppercase tracking-wider opacity-80">{item.type}</span>
                <span className="text-base font-black mt-1 block">{item.limit} Units</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic mt-2 leading-relaxed">
            * Requests exceeding these limits convert automatically to "Additional Requests" and apply deductions.
          </p>
        </div>

        {/* Section 1: Employee & Item */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Allocation Target & Item</h3>

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
                  <div className="p-4 text-center text-sm text-slate-500 italic">No active employees found</div>
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

          {/* Allocation Type selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Allocation Workflow <span className="text-red-500">*</span>
            </label>
            <select
              value={form.allocation_type}
              onChange={e => {
                const val = e.target.value;
                setForm(f => ({
                  ...f,
                  allocation_type: val,
                  is_salary_deduction: val === 'Additional',
                  payment_status: val === 'Additional' ? 'Pending' : (val === 'Replacement' ? (f.is_salary_deduction ? 'Pending' : 'Not Applicable') : 'Not Applicable')
                }));
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            >
              <option value="Standard">Standard Allocation (Free limit check)</option>
              <option value="Additional">Additional Request (Deduction applies)</option>
              <option value="Replacement">Exchange / Replacement (Optional deduction)</option>
            </select>
          </div>

          {/* Item Select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Item Selected <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Package className="w-4 h-4" /></div>
              <select
                required
                value={form.item_id}
                onChange={handleItemChange}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none font-medium"
              >
                <option value="">Select Uniform / Asset</option>
                {items?.filter(item => {
                  const catName = (item.category?.name || '').toLowerCase();
                  const itemName = (item.name || '').toLowerCase();
                  return catName.includes('uniform') || 
                         catName.includes('apparel') || 
                         catName.includes('linen') ||
                         itemName.includes('uniform') ||
                         itemName.includes('pant') ||
                         itemName.includes('shirt') ||
                         itemName.includes('t-shirt') ||
                         itemName.includes('tshirt');
                }).map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.category?.name})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Allocation Exceeded warnings */}
          {selectedItem && form.allocation_type !== 'Replacement' && activeIssues && (() => {
            let alreadyReceived = 0;
            activeIssues.forEach(issue => {
              const name = issue.item_name || issue.item?.name;
              if (getItemType(name) === itemType) {
                alreadyReceived += (issue.quantity || 0);
              }
            });
            const totalProposed = alreadyReceived + form.quantity;
            if (totalProposed > limit && limit > 0) {
              return (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-xs border border-amber-200/50 space-y-1 shadow-sm">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                    Allocation Limit Exceeded: Classified as Additional
                  </div>
                  <p className="leading-relaxed text-amber-700 font-medium">
                    Employee has already received <strong>{alreadyReceived} {itemType}s</strong> (Limit is {limit}). This new request makes the total <strong>{totalProposed}</strong>, which creates an excess of <strong>{totalProposed - limit} units</strong>. Payroll deduction of unit cost is automatically configured.
                  </p>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity</label>
              <input 
                type="number" 
                min="1" 
                value={form.quantity} 
                onChange={e => {
                  const q = parseInt(e.target.value) || 1;
                  setForm(f => ({ ...f, quantity: q, deduction_amount: q * f.unit_cost }));
                }} 
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" 
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Size <span className="text-slate-450 font-normal text-xs">(optional)</span></label>
              <input type="text" placeholder="e.g. XL, 42, 38" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold" />
            </div>
          </div>
        </div>

        {/* Section 2: Cost & Payment - Dynamic Hide/Show rules */}
        {(form.allocation_type === 'Additional' || form.allocation_type === 'Replacement') && (
          <div className="space-y-4 pt-4 border-t border-slate-100 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Deduction & Billing details</h3>
              {form.allocation_type === 'Replacement' && (
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition-all border border-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_salary_deduction}
                    onChange={e => {
                      const chk = e.target.checked;
                      setForm(f => ({
                        ...f,
                        is_salary_deduction: chk,
                        payment_status: chk ? 'Pending' : 'Not Applicable',
                        deduction_amount: chk ? f.quantity * f.unit_cost : 0
                      }));
                    }}
                    className="w-3.5 h-3.5 accent-amber-600 rounded"
                  />
                  <span className="text-[10px] font-black uppercase text-slate-600">Apply Deduction</span>
                </label>
              )}
            </div>

            {(form.allocation_type === 'Additional' || form.is_salary_deduction) && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cost per Unit (₹)</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={form.unit_cost} 
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setForm(f => ({ ...f, unit_cost: val, deduction_amount: val * f.quantity }));
                        }} 
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" 
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Cost (₹)</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                      <input 
                        type="number" 
                        readOnly
                        value={totalCost} 
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payroll Deduction Amount (₹)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={form.deduction_amount} 
                      onChange={e => setForm(f => ({ ...f, deduction_amount: parseFloat(e.target.value) || 0 }))} 
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-black text-amber-700" 
                    />
                  </div>
                </div>

                {/* Net Take home salary calculator */}
                {selectedEmployee && (
                  <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-2.5 border border-slate-800 shadow-lg">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Salary Statement</span>
                      <span className="text-emerald-400">Calculator</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Base Salary</span>
                        <span className="font-semibold">₹{(selectedEmployee.salary || 18000).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">This Uniform Deduction</span>
                        <span className="font-semibold text-red-400">- ₹{(form.deduction_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 font-bold text-sm">
                        <span className="text-slate-355">Est. Net Take Home</span>
                        <span className="text-emerald-400">₹{(Math.max(0, (selectedEmployee.salary || 18000) - (form.deduction_amount || 0))).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section 3: Tracking & Exchange */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auditing & Reason</h3>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Return Status for Old Item</label>
            <select value={form.return_status} onChange={e => setForm(f => ({ ...f, return_status: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium">
              <option value="Not Required">Not Required (First allocation / Extra purchase)</option>
              <option value="Pending Return">Pending Return (Bring damaged item during handover)</option>
              <option value="Returned">Already Returned (Old item handed over to stores)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks / Reason <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={2}
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g., Exceeded limits / Damaged replacement / Size swap..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none font-medium"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-750 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-2xl shadow-xl shadow-blue-500/10 transition-all active:scale-95 disabled:opacity-70"
          >
            {mutation.isPending ? 'Recording Request...' : 'Confirm Allocation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
