import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Search, ChevronDown, User, Package, Check, X, Users } from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import { toast } from '../ui/Toast';

export default function IssueForm({ isOpen, onClose, initialData, profileData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employee_ids: [],
    item_ids: [],
    item_quantities: {}, // { item_id: quantity }
    issued_date: dayjs().format('YYYY-MM-DD'),
    notes: '',
    override: false,
  });
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  
  // Searchable Employee Select State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const empDropdownRef = useRef(null);

  // Searchable Item Select State
  const [itemSearch, setItemSearch] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await api.get('/employees?limit=500'); // Increased limit for bulk
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

  // Handle outside click for employee dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(event.target)) {
        setIsEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          employee_ids: initialData.employee_ids ? initialData.employee_ids.map(String) : (initialData.employee_id ? [initialData.employee_id.toString()] : []),
          item_ids: initialData.item_ids ? initialData.item_ids.map(String) : (initialData.item_id ? [initialData.item_id.toString()] : []),
          item_quantities: initialData.item_id ? { [initialData.item_id.toString()]: initialData.quantity || 1 } : (initialData.item_quantities || {}),
          issued_date: dayjs().format('YYYY-MM-DD'),
          notes: '',
          override: initialData.override || false,
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const filteredEmployees = employees?.filter(emp => 
    emp.status === 'active' && 
    (emp.name.toLowerCase().includes(employeeSearch.toLowerCase().trim()) || 
     emp.emp_code.toLowerCase().includes(employeeSearch.toLowerCase().trim()) ||
     emp.department.toLowerCase().includes(employeeSearch.toLowerCase().trim()))
  );

  const filteredItems = items?.filter(item => 
    item.name?.toLowerCase().includes(itemSearch.toLowerCase().trim()) || 
    item.category?.name?.toLowerCase().includes(itemSearch.toLowerCase().trim())
  );

  const toggleEmployee = (id) => {
    if (!id) return;
    const idStr = id.toString();
    setForm(f => {
        const employee_ids = f.employee_ids.includes(idStr) 
            ? f.employee_ids.filter(i => i !== idStr)
            : [...f.employee_ids, idStr];
        return { ...f, employee_ids };
    });
  };

  const toggleAllEmployees = () => {
    const activeEmployees = employees?.filter(e => e.status === 'active') || [];
    if (form.employee_ids.length === activeEmployees.length) {
        setForm(f => ({ ...f, employee_ids: [] }));
    } else {
        const allIds = activeEmployees.map(e => (e.id || e._id)?.toString()).filter(Boolean);
        setForm(f => ({ ...f, employee_ids: allIds }));
    }
  };

  const toggleItem = (id) => {
    if (!id) return;
    const idStr = id.toString();
    setForm(f => {
        const item_ids = f.item_ids.includes(idStr) 
            ? f.item_ids.filter(i => i !== idStr)
            : [...f.item_ids, idStr];
        
        const item_quantities = { ...f.item_quantities };
        if (f.item_ids.includes(idStr)) {
            delete item_quantities[idStr];
        } else {
            // Auto-Suggest Standard Quantities for Free Allocation
            const itemObj = items?.find(i => i.id === id || i._id === id);
            let suggestedQty = 1;
            if (itemObj) {
                const name = (itemObj.name || '').toLowerCase();
                if (name.includes('intern t-shirt')) suggestedQty = 1;
                else if (name.includes('t-shirt') || name.includes('tshirt')) suggestedQty = 1;
                else if (name.includes('shirt')) suggestedQty = 2;
                else if (name.includes('pant')) suggestedQty = 2;
            }
            item_quantities[idStr] = suggestedQty;
        }
        
        return { ...f, item_ids, item_quantities };
    });
  };

  const updateQuantity = (id, val) => {
    const q = parseInt(val) || 1;
    setForm(f => ({
        ...f,
        item_quantities: {
            ...f.item_quantities,
            [id]: q
        }
    }));
  };

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/issues', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['dueTracking'] });
      // Invalidate ALL employee profiles so Verify Now banner appears immediately
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      toast.success(`Success! Created ${data.count} issue records.`);
      onClose();
      resetForm();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create issues';
      if (err.response?.status === 400 && err.response?.data?.activeIssue) {
        setDuplicateWarning({
            ...err.response.data.activeIssue,
            itemName: items?.find(i => (i.id || i._id)?.toString() === err.response.data.itemId?.toString())?.name
        });
      } else {
        setError(msg);
      }
    }
  });

  const resetForm = () => {
    setForm({ employee_ids: [], item_ids: [], item_quantities: {}, issued_date: dayjs().format('YYYY-MM-DD'), notes: '', override: false });
    setEmployeeSearch('');
    setItemSearch('');
    setDuplicateWarning(null);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.employee_ids.length === 0) return setError('Please select at least one employee');
    if (form.item_ids.length === 0) return setError('Please select at least one item');
    
    // Custom Validation for Individual Asset Profile Issuance
    if (profileData && profileData.allocations) {
        for (const itemId of form.item_ids) {
            const item = items?.find(i => (i.id || i._id)?.toString() === itemId.toString());
            if (item && item.category) {
                const catName = item.category.name;
                const summary = profileData.allocations.summary.find(s => s.item.toLowerCase() === catName.toLowerCase());
                const qtyToIssue = form.item_quantities[itemId] || 1;
                
                if (summary && summary.allowed > 0 && (summary.issued + qtyToIssue) > summary.allowed) {
                    setDuplicateWarning({
                        itemName: item.name,
                        message: `Employee already reached ${catName} allocation limit. Proceed as Additional Request?`
                    });
                    return; // Stop submission
                }
                
                // Duplicate check — item field is a string ID, Item (capital I) is the joined object
                const active = profileData.allocations.active.find(a => {
                    const aItemId = (typeof a.item === 'string' ? a.item : (a.item?._id || a.item?.id || a.Item?._id || a.Item?.id))?.toString();
                    return aItemId === itemId.toString();
                });
                if (active) {
                    setDuplicateWarning({
                        itemName: item.name,
                        message: `Employee already has an active allocation for ${item.name}. Proceed anyway?`
                    });
                    return;
                }
            }
        }
    }

    const itemsPayload = form.item_ids.map(id => ({
        item_id: id,
        quantity: form.item_quantities[id] || 1
    }));
    
    setError('');
    createMutation.mutate({ ...form, items: itemsPayload });
  };

  const handleOverride = () => {
    setDuplicateWarning(null);
    const itemsPayload = form.item_ids.map(id => ({
        item_id: id,
        quantity: form.item_quantities[id] || 1
    }));
    createMutation.mutate({ ...form, override: true, items: itemsPayload });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Issue Distribution">
      {duplicateWarning ? (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Warning: </strong> 
            {duplicateWarning.message || `At least one employee already has an active issue for ${duplicateWarning.itemName}. Do you want to override and create new records for all selected?`}
          </div>
          <div className="flex gap-3">
            <button onClick={handleOverride} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-medium transition-colors">
              Yes, Proceed
            </button>
            <button onClick={() => setDuplicateWarning(null)} className="flex-1 border border-slate-200 py-2.5 rounded-xl font-medium transition-colors hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

          {/* Employee Selector (Multi-Select) */}
          <div style={{ display: (initialData?.employee_id || (initialData?.employee_ids && initialData.employee_ids.length > 0)) ? 'none' : 'block' }}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
              Employees <span className="text-red-500">*</span>
              <button type="button" onClick={toggleAllEmployees} className="text-[11px] font-semibold text-blue-600 hover:underline">
                {form.employee_ids.length === employees?.length ? 'Deselect All' : 'Select All Active'}
              </button>
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="relative border-b border-slate-200 bg-white">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employees by name, code or dept..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs outline-none focus:bg-slate-50 transition-colors"
                />
              </div>
              <div className="max-h-40 overflow-y-auto p-2 grid grid-cols-1 gap-1">
                {filteredEmployees?.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No active employees found</div>
                ) : (
                    filteredEmployees?.map(emp => (
                        <div 
                            key={emp.id || emp._id} 
                            onClick={() => toggleEmployee(emp.id || emp._id)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${form.employee_ids.includes((emp.id || emp._id)?.toString()) ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' : 'hover:bg-white text-slate-600'}`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${form.employee_ids.includes((emp.id || emp._id)?.toString()) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                {form.employee_ids.includes((emp.id || emp._id)?.toString()) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{emp.name}</div>
                                <div className="text-[10px] opacity-70">{emp.emp_code} · {emp.department}</div>
                            </div>
                        </div>
                    ))
                )}
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-slate-500 italic">
                {form.employee_ids.length} employees selected for distribution.
            </div>
          </div>

          {/* Item Selector (Multi-Select) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
              Items <span className="text-red-500">*</span>
              <span className="text-[11px] font-normal text-slate-500">{form.item_ids.length} selected</span>
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="relative border-b border-slate-200 bg-white">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs outline-none focus:bg-slate-50 transition-colors"
                />
              </div>
              <div className="max-h-32 overflow-y-auto p-2 grid grid-cols-1 gap-1">
                {filteredItems?.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No items found</div>
                ) : (
                    filteredItems?.map(item => (
                        <div 
                            key={item.id || item._id} 
                            onClick={() => toggleItem(item.id || item._id)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${form.item_ids.includes((item.id || item._id)?.toString()) ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'hover:bg-white text-slate-600'}`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${form.item_ids.includes((item.id || item._id)?.toString()) ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'}`}>
                                {form.item_ids.includes((item.id || item._id)?.toString()) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{item.name}</div>
                                <div className="text-[10px] opacity-70">{item.category.name}</div>
                            </div>
                        </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Selected Items Review & Quantities */}
          {form.item_ids.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Review Quantities
                </h3>
                <div className="space-y-3">
                    {form.item_ids.map(id => {
                        const item = items?.find(i => (i.id || i._id)?.toString() === id.toString());
                        if (!item) return null;
                        return (
                            <div key={id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex-1 min-w-0 mr-4">
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</div>
                                    <div className="text-[10px] text-slate-500">{item.category?.name}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Qty:</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={form.item_quantities[id] || 1}
                                        onChange={e => updateQuantity(id, e.target.value)}
                                        className="w-20 px-3 py-1.5 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Issued Date</label>
              <input type="date" required value={form.issued_date}
                onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
          </div>
          
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex items-center gap-2">
            <span className="font-semibold text-blue-800">Workflow Note:</span>
            <span>Items will be issued as <strong>Pending Acknowledgement</strong>. Employees must sign individually later.</span>
          </div>

          <button type="submit" disabled={createMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 mt-2 text-sm uppercase tracking-wide">
            {createMutation.isPending ? 'Processing Bulk Distribution...' : `Confirm Distribution to ${form.employee_ids.length} Employees`}
          </button>
        </form>
      )}
    </Modal>
  );
}
