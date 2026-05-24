import { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, User, Package, Info, AlertTriangle, CheckCircle2,
  PlusCircle, ArrowLeftRight, IndianRupee, Sparkles, X,
  Search, BadgeAlert, Plus, RotateCcw
} from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import { toast } from '../ui/Toast';

// ── Find official price from fetched list ─────────────────────────
function lookupPrice(itemName, priceList, gender = null) {
  if (!itemName || !priceList?.length) return null;
  const n = itemName.toLowerCase().trim();

  // Try gender-specific first
  if (gender) {
    const genderPrices = priceList.filter(p => p.gender === gender);
    let found = genderPrices.find(p => p.item_name.toLowerCase() === n);
    if (found) return found.price;
  }

  // Fallback: any gender (exact match only)
  let found = priceList.find(p => p.item_name.toLowerCase() === n);
  return found ? found.price : null;
}

// ── Only two workflows now ────────────────────────────────────────
const WORKFLOW_TYPES = [
  {
    value: 'Additional',
    icon: PlusCircle,
    title: 'Extra / Additional',
    subtitle: 'Beyond free quota',
    desc: 'Employee requests more than the standard free allocation. The official item cost is recorded and tracked.',
    color: 'amber',
    selectedClass: 'border-amber-500 bg-amber-50 ring-2 ring-amber-400',
    defaultClass: 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30',
    iconBg: 'bg-amber-500',
  },
  {
    value: 'Replacement',
    icon: ArrowLeftRight,
    title: 'Replace / Exchange',
    subtitle: 'Swap existing item',
    desc: 'Replace a damaged, worn-out, or wrong-size item that was already issued. Cost is auto-calculated from official rate.',
    color: 'purple',
    selectedClass: 'border-purple-500 bg-purple-50 ring-2 ring-purple-400',
    defaultClass: 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30',
    iconBg: 'bg-purple-600',
  },
];

const REASON_OPTIONS = {
  Additional: [
    { value: 'Additional Request', label: 'Extra uniform beyond free quota' },
    { value: 'Lost Item',          label: 'Lost item — replacement needed (chargeable)' },
    { value: 'Other',              label: 'Other' },
  ],
  Replacement: [
    { value: 'Damage',      label: 'Damaged / Torn' },
    { value: 'Size Change', label: 'Size change — wrong fit' },
    { value: 'Exchange',    label: 'Exchange for different type' },
    { value: 'Other',       label: 'Other' },
  ],
};

const emptyForm = {
  employee_id: '',
  reason: 'Additional Request',
  notes: '',
  return_status: 'Not Required',
  allocation_type: 'Additional'
};

export default function ReplacementForm({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [cartItems, setCartItems] = useState([]);
  const [error, setError] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', category_name: 'Uniform & Apparel', price: '', gender: 'UNISEX' });
  const [quickAddError, setQuickAddError] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Queries ──────────────────────────────────────────────────────
  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => { const { data } = await api.get('/employees?limit=200'); return data.employees; },
    enabled: isOpen,
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => { const { data } = await api.get('/items'); return data; },
    enabled: isOpen,
  });

  const { data: categories } = useQuery({
    queryKey: ['item-categories'],
    queryFn: async () => { const { data } = await api.get('/items/categories'); return data; },
    enabled: isOpen,
  });

  // Official prices from DB — MEN + WOMEN rates
  const { data: officialPrices } = useQuery({
    queryKey: ['official-prices'],
    queryFn: async () => { const { data } = await api.get('/replacements/prices'); return data; },
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const { data: activeIssues } = useQuery({
    queryKey: ['active-issues', form.employee_id],
    queryFn: async () => {
      if (!form.employee_id) return [];
      const { data } = await api.get(`/issues?employeeId=${form.employee_id}&lifecycle_status=Active`);
      return data;
    },
    enabled: isOpen && !!form.employee_id,
  });

  const selectedEmployee = employees?.find(e => (e._id || e.id)?.toString() === form.employee_id?.toString());
  const empGender = selectedEmployee?.gender === 'Female' ? 'WOMEN' : 'MEN';

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (isOpen) resetForm(); }, [isOpen]);

  // When employee changes, recalculate unit costs in cart
  useEffect(() => {
    if (cartItems.length > 0 && officialPrices) {
      setCartItems(prev => prev.map(cItem => {
        const price = lookupPrice(cItem.item.name, officialPrices, empGender);
        return { ...cItem, unit_cost: price ?? cItem.item.cost ?? 0 };
      }));
    }
  }, [form.employee_id, empGender, officialPrices]);

  const handleWorkflowChange = (val) => {
    setForm(f => ({
      ...f,
      allocation_type: val,
      reason: REASON_OPTIONS[val][0].value,
      return_status: val === 'Replacement' ? 'Pending Return' : 'Not Required',
    }));
    setCartItems([]);
  };

  const handleItemClick = (item) => {
    const price = lookupPrice(item.name, officialPrices, empGender);
    const unit_cost = price ?? item.cost ?? 0;
    
    // Auto-fill size
    let prefilled = '';
    const n = (item.name || '').toLowerCase();
    if (n.includes('pant')) prefilled = selectedEmployee?.sizes?.pant || '';
    else if (n.includes('shoe') || n.includes('safety')) prefilled = selectedEmployee?.sizes?.shoe || '';
    else if (n.includes('shirt') || n.includes('coat') || n.includes('chudidhar')) prefilled = selectedEmployee?.sizes?.shirt || '';

    // Auto-select previous_issue_id if it's a replacement
    let autoIssueId = '';
    if (form.allocation_type === 'Replacement' && activeIssues) {
       const matchingIssues = activeIssues.filter(i => (i.item?._id || i.item?.id)?.toString() === (item._id || item.id)?.toString());
       if (matchingIssues.length === 1) {
           autoIssueId = matchingIssues[0]._id || matchingIssues[0].id;
       }
    }

    setCartItems(prev => [
      ...prev,
      {
        cart_id: Math.random().toString(36).substring(2, 9),
        item,
        quantity: 1,
        size: prefilled,
        unit_cost,
        previous_issue_id: autoIssueId
      }
    ]);
  };

  const updateCartItem = (cartId, field, value) => {
    setCartItems(prev => prev.map(i => i.cart_id === cartId ? { ...i, [field]: value } : i));
  };

  const removeCartItem = (cartId) => {
    setCartItems(prev => prev.filter(i => i.cart_id !== cartId));
  };

  // Item filtering
  const filteredItems = useMemo(() => {
    if (!items) return [];

    let baseItems = items;

    if (form.allocation_type === 'Replacement') {
        if (!activeIssues || !form.employee_id) return [];
        // Only show items that are currently issued to the employee
        const issuedItemIds = new Set(activeIssues.map(issue => (issue.item?._id || issue.item?.id)?.toString()));
        baseItems = items.filter(item => issuedItemIds.has((item._id || item.id)?.toString()));
    } else if (form.allocation_type === 'Additional') {
        // Only show official price list items matching gender
        baseItems = items.filter(item => {
            const n = (item.name || '').toLowerCase();
            return officialPrices?.some(p => {
               const nameMatch = p.item_name.toLowerCase() === n;
               const genderMatch = p.gender === 'UNISEX' || p.gender === empGender;
               return nameMatch && genderMatch;
            });
        });
    }

    if (!itemSearch.trim()) return baseItems;
    const searchNorm = itemSearch.toLowerCase().trim().replace(/[-\s]+/g, '');
    return baseItems.filter(item => {
        const nameNorm = (item.name || '').toLowerCase().replace(/[-\s]+/g, '');
        return nameNorm.includes(searchNorm);
    });
  }, [items, form.allocation_type, activeIssues, form.employee_id, officialPrices, empGender, itemSearch]);

  const filteredEmployees = (employees || []).filter(emp => {
    if (!employeeSearch.trim()) return emp.status === 'active';
    const s = employeeSearch.toLowerCase().trim();
    return emp.status === 'active' && (emp.name.toLowerCase().includes(s) || emp.emp_code.toLowerCase().includes(s));
  });

  const quickAddMutation = useMutation({
    mutationFn: async (payload) => { const { data } = await api.post('/items', payload); return data; },
    onSuccess: async (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (quickAddForm.price) {
        await api.put('/replacements/prices', { item_name: newItem.name, price: parseFloat(quickAddForm.price), gender: quickAddForm.gender });
        queryClient.invalidateQueries({ queryKey: ['official-prices'] });
      }
      toast.success(`"${newItem.name}" added to Item Master & Price List!`);
      handleItemClick(newItem);
      setShowQuickAdd(false);
      setQuickAddForm({ name: '', category_name: 'Uniform & Apparel', price: '', gender: 'UNISEX' });
      setQuickAddError('');
    },
    onError: (err) => setQuickAddError(err.response?.data?.message || 'Failed to add item'),
  });

  const handleQuickAdd = () => {
    if (!quickAddForm.name.trim()) { setQuickAddError('Item name is required'); return; }
    if (!quickAddForm.price || isNaN(parseFloat(quickAddForm.price))) { setQuickAddError('Valid price is required'); return; }
    setQuickAddError('');
    quickAddMutation.mutate({ name: quickAddForm.name.trim(), new_category_name: quickAddForm.category_name || 'Uniform & Apparel', cost: parseFloat(quickAddForm.price), frequency_days: 365 });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setForm(emptyForm);
    setCartItems([]);
    setEmployeeSearch('');
    setItemSearch('');
    setError('');
    setShowQuickAdd(false);
    setQuickAddError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) { setError('Please select an employee'); return; }
    if (cartItems.length === 0) { setError('Please add at least one item'); return; }
    if (form.reason === 'Other' && !form.notes?.trim()) {
      setError('Please specify the reason'); return;
    }
    
    // Validate cart items
    for (const item of cartItems) {
      const isSizeRequired = ['uniform', 'shoe', 'apparel', 'ppe'].some(k => (item.item.category?.name || '').toLowerCase().includes(k)) && !(item.item.name || '').toLowerCase().includes('towel');
      if (isSizeRequired && !item.size?.trim()) {
        setError(`Size is required for ${item.item.name}`); return;
      }
      if (form.allocation_type === 'Replacement' && !item.previous_issue_id) {
        setError(`Please select the item being replaced for ${item.item.name}`); return;
      }
    }

    setError('');
    setIsSubmitting(true);

    try {
      const promises = cartItems.map(item => {
        const payload = {
            ...form,
            item_id: item.item._id || item.item.id,
            quantity: item.quantity,
            size: item.size,
            unit_cost: item.unit_cost,
            previous_issue_id: item.previous_issue_id
        };
        return api.post('/replacements', payload);
      });

      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ['replacements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      toast.success(`Success! Recorded ${cartItems.length} items.`);
      
      onClose();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = cartItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0);
  const activeWorkflow = WORKFLOW_TYPES.find(w => w.value === form.allocation_type);
  const reasonOptions  = REASON_OPTIONS[form.allocation_type] || REASON_OPTIONS.Additional;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Item Request" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-4 space-y-5 max-h-[85vh] overflow-y-auto">

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ── STEP 1: Workflow ─────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Step 1 — Request Type</p>
          <div className="grid grid-cols-2 gap-3">
            {WORKFLOW_TYPES.map(wf => {
              const isSelected = form.allocation_type === wf.value;
              const Icon = wf.icon;
              return (
                <button key={wf.value} type="button" onClick={() => handleWorkflowChange(wf.value)}
                  className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${isSelected ? wf.selectedClass : wf.defaultClass}`}>
                  {isSelected && <CheckCircle2 className={`absolute top-3 right-3 w-4 h-4 text-${wf.color}-500`} />}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isSelected ? wf.iconBg : 'bg-slate-200'}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-black ${isSelected ? `text-${wf.color}-800` : 'text-slate-800'}`}>{wf.title}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? `text-${wf.color}-500` : 'text-slate-400'}`}>{wf.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className={`rounded-xl p-3 text-xs font-medium flex items-start gap-2 ${
            form.allocation_type === 'Additional' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
          }`}>
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {activeWorkflow?.desc}
          </div>
        </div>

        {/* ── STEP 2: Employee ──────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Step 2 — Employee</p>
          <div className="relative" ref={dropdownRef}>
            <div className="relative cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.emp_code})` : 'Search employee by name or code...'}
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setIsDropdownOpen(true);
                  if (form.employee_id) setForm(f => ({ ...f, employee_id: '' }));
                }}
                className={`w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all ${selectedEmployee && !employeeSearch ? 'font-bold text-slate-900' : 'text-slate-600'}`}
              />
              <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                {filteredEmployees.length === 0
                  ? <div className="p-4 text-center text-sm text-slate-500 italic">No active employees found</div>
                  : filteredEmployees.map(emp => {
                      const empId = (emp.id || emp._id)?.toString();
                      return (
                    <div key={empId} onClick={() => { setForm(f => ({ ...f, employee_id: empId })); setEmployeeSearch(''); setIsDropdownOpen(false); }}
                      className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 ${form.employee_id === empId ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}>
                      <div>
                        <div className="font-semibold text-sm">{emp.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span>{emp.emp_code} · {emp.department}</span>
                          <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                            emp.employee_type === 'Intern' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {emp.employee_type}
                          </span>
                          <span className="text-[10px] text-slate-400">· {emp.gender}</span>
                        </div>
                      </div>
                      {form.employee_id === (emp.id || emp._id)?.toString() && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                  )
                  })}
              </div>
            )}
          </div>

          {/* Gender badge + pricing notice */}
          {selectedEmployee && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${empGender === 'WOMEN' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                {empGender === 'WOMEN' ? '♀ Women' : '♂ Men'} Rate Applied
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                selectedEmployee.employee_type === 'Intern'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {selectedEmployee.employee_type}
              </span>
            </div>
          )}
        </div>

        {/* ── STEP 3: Item Selection ──────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Step 3 — Item Selection</p>
            <button type="button" onClick={() => { setShowQuickAdd(!showQuickAdd); setQuickAddError(''); }}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 transition-colors">
              <Plus className="w-3 h-3" /> Not in list? Add it
            </button>
          </div>

          {/* Quick-Add panel */}
          {showQuickAdd && (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Quick-Add to Item Master + Price List
                </p>
                <button type="button" onClick={() => { setShowQuickAdd(false); setQuickAddError(''); }}>
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              {quickAddError && <p className="text-xs text-red-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {quickAddError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Item Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Rain Coat, Winter Jacket..." value={quickAddForm.name}
                    onChange={e => setQuickAddForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Official Price (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" placeholder="e.g. 349.65" value={quickAddForm.price}
                    onChange={e => setQuickAddForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Rate For</label>
                  <select value={quickAddForm.gender} onChange={e => setQuickAddForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm">
                    <option value="UNISEX">Both (Unisex)</option>
                    <option value="MEN">Men only</option>
                    <option value="WOMEN">Women only</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Category</label>
                  <select value={quickAddForm.category_name} onChange={e => setQuickAddForm(f => ({ ...f, category_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm">
                    <option value="Uniform & Apparel">Uniform & Apparel</option>
                    {(categories || []).filter(c => c.name !== 'Uniform & Apparel').map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="button" onClick={handleQuickAdd} disabled={quickAddMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {quickAddMutation.isPending ? 'Adding...' : <><Plus className="w-3.5 h-3.5" /> Add & Select</>}
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Filter items to add..." value={itemSearch}
              onChange={e => setItemSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
          </div>

          {/* Item list */}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-sm">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <BadgeAlert className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No uniform items found</p>
                <button type="button" onClick={() => setShowQuickAdd(true)} className="text-xs font-black text-indigo-600 underline">
                  + Add this item to master
                </button>
              </div>
            ) : filteredItems.map(item => {
              const price = lookupPrice(item.name, officialPrices, empGender) ?? lookupPrice(item.name, officialPrices) ?? item.cost ?? 0;
              return (
                <div key={item.id} onClick={() => handleItemClick(item)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-blue-50 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 group-hover:bg-blue-100 transition-colors">
                      <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.category?.name}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {form.allocation_type === 'Replacement' ? (
                      <span className="text-[10px] text-slate-400 font-medium">Click to add</span>
                    ) : price > 0 ? (
                      <>
                        <p className="text-sm font-black text-slate-700">₹{price.toFixed(2)}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">{selectedEmployee ? (empGender === 'WOMEN' ? 'Women Rate' : 'Men Rate') : 'Official Rate'}</p>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">No rate set</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STEP 4: Selected Items Cart ────────────────────────── */}
        {cartItems.length > 0 && (
          <div className="space-y-3 animate-fade-in pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest pt-1">Step 4 — Selected Items</p>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">{cartItems.length} items</span>
            </div>

            <div className="space-y-3">
              {cartItems.map((cItem) => (
                <div key={cItem.cart_id} className={`border rounded-xl p-4 relative ${form.allocation_type === 'Additional' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-purple-50/50 border-purple-100'}`}>
                  
                  <button type="button" onClick={() => removeCartItem(cItem.cart_id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>

                  <div className="mb-3 pr-6">
                    <p className="font-bold text-slate-800 text-sm leading-tight">{cItem.item.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">{cItem.item.category?.name || 'Item'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                      <input type="number" min="1" value={cItem.quantity}
                        onChange={e => updateCartItem(cItem.cart_id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" />
                    </div>
                    {(() => {
                        const isSizeRequired = ['uniform', 'shoe', 'apparel', 'ppe'].some(k => (cItem.item.category?.name || '').toLowerCase().includes(k)) && !(cItem.item.name || '').toLowerCase().includes('towel');
                        return (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Size {isSizeRequired && <span className="text-red-500">*</span>}
                            </label>
                            <input type="text" required={isSizeRequired} placeholder={isSizeRequired ? "e.g. XL, 42" : "Optional"} value={cItem.size || ''}
                              onChange={e => updateCartItem(cItem.cart_id, 'size', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" />
                          </div>
                        );
                    })()}
                  </div>

                  {form.allocation_type === 'Replacement' && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <RotateCcw className="w-3 h-3 inline mr-1" />
                        Item Being Replaced <span className="text-red-500">*</span>
                      </label>
                      <select required value={cItem.previous_issue_id} onChange={e => updateCartItem(cItem.cart_id, 'previous_issue_id', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-xs font-medium">
                        <option value="">Select item being returned / swapped...</option>
                        {(activeIssues || []).map(issue => (
                          <option key={issue._id || issue.id} value={issue._id || issue.id}>
                            {issue.item_name || issue.item?.name} — Qty {issue.quantity} · {issue.issued_date ? new Date(issue.issued_date).toLocaleDateString('en-IN') : 'N/A'}
                          </option>
                        ))}
                      </select>
                      {cItem.previous_issue_id && (
                        <div className="mt-1.5 bg-purple-50 text-[9px] text-purple-600 font-semibold rounded p-1">
                          ✓ Marked for Pending Return
                        </div>
                      )}
                    </div>
                  )}

                  {form.allocation_type === 'Additional' && cItem.unit_cost > 0 && (
                    <div className="mt-2 text-right pt-2 border-t border-emerald-100/50">
                      <p className="text-[10px] text-emerald-700 font-bold uppercase">Line Cost: ₹{(cItem.quantity * cItem.unit_cost).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* ── Running Additional Cost Summary ── */}
            {form.allocation_type === 'Additional' && totalCost > 0 && (
              <div className="mt-4 rounded-2xl p-4 text-white flex flex-col shadow-lg bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/20">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/20">
                  <p className="text-xs font-black uppercase tracking-widest text-white">Live Additional Cost Summary</p>
                </div>
                
                <div className="space-y-1.5 mb-3">
                   {cartItems.map(c => (
                       <div key={c.cart_id} className="flex justify-between text-xs text-white/90">
                           <span>{c.item.name} ×{c.quantity}</span>
                           <span className="font-medium">₹{(c.quantity * c.unit_cost).toFixed(2)}</span>
                       </div>
                   ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <p className="text-sm font-bold text-white">Total Amount</p>
                  <div className="flex items-center gap-0.5 text-2xl font-black">
                    <IndianRupee className="w-5 h-5" />
                    {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Old Item Return Status for Replacement Cart */}
            {form.allocation_type === 'Replacement' && cartItems.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Old Items Return Status</label>
                <select value={form.return_status} onChange={e => setForm(f => ({ ...f, return_status: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium">
                  <option value="Pending Return">Employee will return during handover</option>
                  <option value="Returned">Old items already returned to store</option>
                  <option value="Not Required">No return required (damaged beyond use / lost)</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Reason ─────────────────────────────────────── */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest pt-1">
            Step 5 — Transaction Reason
          </p>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
            <select required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value, notes: '' }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium">
              {reasonOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {form.reason === 'Other' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Please Specify <span className="text-red-500">*</span></label>
              <input type="text" required value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Enter custom reason..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 bg-white pt-3 border-t border-slate-100">
          <button type="submit" disabled={isSubmitting || cartItems.length === 0}
            className={`w-full py-3.5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-70 ${
              form.allocation_type === 'Additional'
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
            }`}>
            {isSubmitting ? 'Submitting...' : `Confirm — ${activeWorkflow?.title}`}
          </button>
        </div>

      </form>
    </Modal>
  );
}
