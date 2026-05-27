import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Search, Package, Check, Shield, ShieldOff, Users, Filter, Heart } from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import { toast } from '../ui/Toast';

// Helper to verify item eligibility based on employee profile parameters and welfare criteria
function isItemEligible(item, profile) {
  if (!profile) return true;

  const name = (item.name || '').toLowerCase();
  const catName = (item.category?.name || item.ItemCategory?.name || '').toLowerCase();

  // 1. Check if name/category matches any keyword in profile.eligibility
  // Use exact match or startsWith (with space separator) to prevent 'T-Shirt' keyword
  // from incorrectly matching 'Intern T-Shirt' via loose includes.
  const keywords = profile.eligibility || [];
  const matchesKeyword = keywords.some(keyword => {
    const kw = keyword.toLowerCase();
    // Exact name match (e.g., 'T-Shirt' === 'T-Shirt')
    if (name === kw) return true;
    // StartsWith + space: 'Shirt Full Sleeve' starts with 'shirt ' → matches keyword 'Shirt'
    if (name.startsWith(kw + ' ')) return true;
    // Exact category match
    if (catName === kw) return true;
    return false;
  });
  if (matchesKeyword) return true;

  // 2. Welfare/Linen items eligibility checks
  const soap = profile.welfareBenefits?.soap;
  if (name.includes('soap') && soap?.eligible) return true;

  const towel = profile.welfareBenefits?.towel;
  if (towel?.eligible && (name.includes('towel') || name.includes('bedsheet'))) return true;

  if (name.includes('sweet box')) return true; // standard sweetbox rules checked inside backend
  if (name.includes('boost')) return true; // standard blood benefit
  if (name.includes('calendar')) return true; // standard calendar

  return false;
}

export default function IssueForm({ isOpen, onClose, initialData, profileData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employee_ids: [],
    item_ids: [],
    item_quantities: {},
    issued_date: dayjs().format('YYYY-MM-DD'),
    notes: '',
    override: false,
  });
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [donatedBlood, setDonatedBlood] = useState(false);
  const [filterByEligibility, setFilterByEligibility] = useState(true);

  const singleEmployeeId = form.employee_ids.length === 1 ? form.employee_ids[0] : null;

  const { data: singleProfile } = useQuery({
    queryKey: ['employee-profile', singleEmployeeId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${singleEmployeeId}/asset-profile`);
      return data;
    },
    enabled: isOpen && !!singleEmployeeId,
  });

  const activeProfile = profileData || singleProfile;

  useEffect(() => {
    setFilterByEligibility(true);
  }, [singleEmployeeId]);

  // Employee filter state: 'all' | 'union' | 'nonunion'
  const [empFilter, setEmpFilter] = useState('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await api.get('/employees?limit=500');
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

  // Helper: is this employee a union member?
  const isUnion = (emp) =>
    emp.is_union_member === true || emp.is_union_member === 1 || emp.employee_type === 'Union Operator';

  // Active employees only
  const activeEmployees = employees?.filter(e => e.status === 'active') || [];

  // Union counts for badge display
  const unionCount = activeEmployees.filter(isUnion).length;
  const nonUnionCount = activeEmployees.length - unionCount;

  // Filtered + searched list
  const filteredEmployees = activeEmployees
    .filter(emp => {
      if (empFilter === 'union') return isUnion(emp);
      if (empFilter === 'nonunion') return !isUnion(emp);
      return true;
    })
    .filter(emp => {
      const q = employeeSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.emp_code.toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.employee_type || '').toLowerCase().includes(q)
      );
    })
    // Union employees first in the list
    .sort((a, b) => {
      const au = isUnion(a) ? 0 : 1;
      const bu = isUnion(b) ? 0 : 1;
      return au - bu || a.name.localeCompare(b.name);
    });

  const filteredItems = items?.filter(item =>
    item.name?.toLowerCase().includes(itemSearch.toLowerCase().trim()) ||
    item.category?.name?.toLowerCase().includes(itemSearch.toLowerCase().trim())
  ).filter(item => {
    if (activeProfile && filterByEligibility) {
      return isItemEligible(item, activeProfile);
    }
    return true;
  });

  const toggleEmployee = (id) => {
    if (!id) return;
    const idStr = id.toString();
    setForm(f => ({
      ...f,
      employee_ids: f.employee_ids.includes(idStr)
        ? f.employee_ids.filter(i => i !== idStr)
        : [...f.employee_ids, idStr]
    }));
  };

  // Select all visible (filtered) employees
  const toggleAllFiltered = () => {
    const visibleIds = filteredEmployees.map(e => (e.id || e._id)?.toString()).filter(Boolean);
    const allSelected = visibleIds.every(id => form.employee_ids.includes(id));
    if (allSelected) {
      setForm(f => ({ ...f, employee_ids: f.employee_ids.filter(id => !visibleIds.includes(id)) }));
    } else {
      setForm(f => ({ ...f, employee_ids: [...new Set([...f.employee_ids, ...visibleIds])] }));
    }
  };

  // Select all union employees
  const selectAllUnion = () => {
    const unionIds = activeEmployees.filter(isUnion).map(e => (e.id || e._id)?.toString()).filter(Boolean);
    setForm(f => ({ ...f, employee_ids: [...new Set([...f.employee_ids, ...unionIds])] }));
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
        const itemObj = items?.find(i => i.id === id || i._id === id);
        let suggestedQty = 1;
        if (itemObj) {
          const name = (itemObj.name || '').toLowerCase();
          const isNewJoining = activeProfile?.isNewJoining === true;
          const summary = activeProfile?.allocations?.summary || [];

          // Helper: get remaining qty from profile allocation summary for a given item label
          const getRemaining = (labels) => {
            const match = summary.find(s => labels.some(l => s.item?.toLowerCase() === l.toLowerCase()));
            return match ? Math.max(1, match.remaining) : null;
          };

          if (name.includes('t-shirt') || name.includes('intern t-shirt'))
            suggestedQty = 1; // always 1
          else if (name === 'soap' || name.startsWith('soap '))
            // Soap: first 3 months → 3, after 3 months → 4 (from backend welfare profile)
            suggestedQty = activeProfile?.welfareBenefits?.soap?.allowedQuarterly ?? 3;
          else if (name.includes('shirt') || name.includes('chudidhar top'))
            suggestedQty = getRemaining(['Shirt', 'Chudidhar Top']) ?? 2;
          else if (name.includes('pant') || name.includes('chudidhar bottom'))
            suggestedQty = getRemaining(['Pant', 'Chudidhar Bottom']) ?? (isNewJoining ? 3 : 2);
          else if (name.includes('socks'))
            suggestedQty = getRemaining(['Socks']) ?? 2;
          else if (name.includes('chudidhar coat'))
            suggestedQty = 1;
        }
        item_quantities[idStr] = suggestedQty;
      }
      return { ...f, item_ids, item_quantities };
    });
  };

  const updateQuantity = (id, val) => {
    const q = parseInt(val) || 1;
    setForm(f => ({ ...f, item_quantities: { ...f.item_quantities, [id]: q } }));
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
    setEmpFilter('all');
    setDuplicateWarning(null);
    setError('');
    setDonatedBlood(false);
    setFilterByEligibility(true);
  };

  const selectedItems = form.item_ids.map(id => items?.find(i => (i.id || i._id)?.toString() === id.toString())).filter(Boolean);
  const hasBoostSelected = selectedItems.some(item => (item.name || '').toLowerCase().includes('boost'));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.employee_ids.length === 0) return setError('Please select at least one employee');
    if (form.item_ids.length === 0) return setError('Please select at least one item');

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
            return;
          }
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

    let finalNotes = form.notes;
    if (hasBoostSelected) {
      if (!donatedBlood) {
        return setError('Blood donation must be verified to issue the Boost packet.');
      }
      const hasDonationKeyword = finalNotes && (
        finalNotes.toLowerCase().includes('donation') ||
        finalNotes.toLowerCase().includes('donated') ||
        finalNotes.toLowerCase().includes('blood')
      );
      if (!hasDonationKeyword) {
        finalNotes = finalNotes ? `${finalNotes} - Blood Donation Verified` : 'Blood Donation Benefit - Verified';
      }
    }

    const itemsPayload = form.item_ids.map(id => ({ item_id: id, quantity: form.item_quantities[id] || 1 }));
    setError('');
    createMutation.mutate({ ...form, notes: finalNotes, items: itemsPayload });
  };

  const handleOverride = () => {
    setDuplicateWarning(null);
    let finalNotes = form.notes;
    if (hasBoostSelected) {
      const hasDonationKeyword = finalNotes && (
        finalNotes.toLowerCase().includes('donation') ||
        finalNotes.toLowerCase().includes('donated') ||
        finalNotes.toLowerCase().includes('blood')
      );
      if (!hasDonationKeyword) {
        finalNotes = finalNotes ? `${finalNotes} - Blood Donation Verified` : 'Blood Donation Benefit - Verified';
      }
    }
    const itemsPayload = form.item_ids.map(id => ({ item_id: id, quantity: form.item_quantities[id] || 1 }));
    createMutation.mutate({ ...form, notes: finalNotes, override: true, items: itemsPayload });
  };

  const visibleIds = filteredEmployees.map(e => (e.id || e._id)?.toString()).filter(Boolean);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => form.employee_ids.includes(id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Issue Distribution">
      {duplicateWarning ? (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Warning: </strong>
            {duplicateWarning.message || `At least one employee already has an active issue for ${duplicateWarning.itemName}. Do you want to override?`}
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

          {/* ── Employee Selector ── */}
          <div style={{ display: (initialData?.employee_id || (initialData?.employee_ids && initialData.employee_ids.length > 0)) ? 'none' : 'block' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Employees <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">{form.employee_ids.length} selected</span>
            </div>

            {/* Union / Non-Union filter tabs */}
            <div className="flex gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setEmpFilter('all')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${empFilter === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
              >
                All <span className="opacity-70">({activeEmployees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEmpFilter('union')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${empFilter === 'union' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400'}`}
              >
                <Shield className="w-3 h-3" /> Union <span className="opacity-80">({unionCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setEmpFilter('nonunion')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${empFilter === 'nonunion' ? 'bg-slate-500 text-white border-slate-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
              >
                <ShieldOff className="w-3 h-3" /> Non-Union <span className="opacity-80">({nonUnionCount})</span>
              </button>

              {/* Quick: Select All Union */}
              <button
                type="button"
                onClick={selectAllUnion}
                className="ml-auto px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all"
              >
                + All Union
              </button>
            </div>

            {/* Search + List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="relative border-b border-slate-200 bg-white flex items-center">
                <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, dept or type..."
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  className="w-full pl-9 pr-28 py-2 text-xs outline-none bg-white"
                />
                {/* Select all visible */}
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="absolute right-2 text-[10px] font-semibold text-blue-600 hover:underline whitespace-nowrap"
                >
                  {allVisibleSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-44 overflow-y-auto p-2 space-y-1">
                {filteredEmployees.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No employees found</div>
                ) : (
                  filteredEmployees.map(emp => {
                    const id = (emp.id || emp._id)?.toString();
                    const selected = form.employee_ids.includes(id);
                    const union = isUnion(emp);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleEmployee(emp.id || emp._id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all select-none ${
                          selected
                            ? union
                              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                              : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                            : 'hover:bg-white text-slate-600'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected
                            ? union ? 'bg-blue-600 border-blue-600' : 'bg-emerald-600 border-emerald-600'
                            : 'bg-white border-slate-300'
                        }`}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>

                        {/* Employee info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{emp.name}</span>
                            {union ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white flex-shrink-0">
                                <Shield className="w-2 h-2" /> UNION
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600 flex-shrink-0">
                                NON-UNION
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] opacity-60 truncate">{emp.emp_code} · {emp.department} · {emp.employee_type}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selection summary */}
            {form.employee_ids.length > 0 && (
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                <span>
                  <span className="font-bold text-blue-600">
                    {employees?.filter(e => form.employee_ids.includes((e.id || e._id)?.toString()) && isUnion(e)).length}
                  </span> union
                </span>
                <span>+</span>
                <span>
                  <span className="font-bold text-slate-700">
                    {employees?.filter(e => form.employee_ids.includes((e.id || e._id)?.toString()) && !isUnion(e)).length}
                  </span> non-union
                </span>
                <span className="text-slate-400">= {form.employee_ids.length} total selected</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, employee_ids: [] }))} className="ml-auto text-red-400 hover:text-red-600 font-semibold">Clear</button>
              </div>
            )}
          </div>

          {/* ── Item Selector ── */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                Items <span className="text-red-500">*</span>
              </span>
              <div className="flex items-center gap-2">
                {activeProfile && (
                  <button
                    type="button"
                    onClick={() => setFilterByEligibility(!filterByEligibility)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all uppercase tracking-wider ${
                      filterByEligibility
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {filterByEligibility ? '🎯 Eligible Only' : '🌐 Show All Items'}
                  </button>
                )}
                <span className="text-[11px] font-normal text-slate-500">{form.item_ids.length} selected</span>
              </div>
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="relative border-b border-slate-200 bg-white">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs outline-none"
                />
              </div>
              {activeProfile && filterByEligibility && (
                <div className="bg-slate-100/50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-medium italic">Showing items this employee is eligible for</span>
                  <button
                    type="button"
                    onClick={() => setFilterByEligibility(false)}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    + Add other item
                  </button>
                </div>
              )}
              <div className="max-h-32 overflow-y-auto p-2 space-y-1">
                {filteredItems?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No items found</div>
                ) : (
                  filteredItems?.map(item => {
                    const id = (item.id || item._id)?.toString();
                    const selected = form.item_ids.includes(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleItem(item.id || item._id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${selected ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'hover:bg-white text-slate-600'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'}`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{item.name}</div>
                          <div className="text-[10px] opacity-70">{item.category?.name}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Quantity Review ── */}
          {form.item_ids.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Review Quantities
              </h3>
              <div className="space-y-2">
                {form.item_ids.map(id => {
                  const item = items?.find(i => (i.id || i._id)?.toString() === id.toString());
                  if (!item) return null;
                  return (
                    <div key={id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="text-sm font-bold text-slate-800 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.category?.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={form.item_quantities[id] || 1}
                          onChange={e => updateQuantity(id, e.target.value)}
                          className="w-20 px-3 py-1.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Date ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Issued Date</label>
            <input
              type="date"
              required
              value={form.issued_date}
              onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          {/* ── Verify Blood Donation (Conditional) ── */}
          {hasBoostSelected && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 space-y-2 animate-fade-in flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1">
                <input
                  type="checkbox"
                  checked={donatedBlood}
                  onChange={e => setDonatedBlood(e.target.checked)}
                  className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black text-rose-800 uppercase tracking-wider">Verify Blood Donation</span>
                  <p className="text-[10px] text-rose-600 font-bold mt-0.5 leading-tight">
                    Confirm that this employee has donated blood. A verified blood donation is strictly required to issue a Boost Packet.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* ── Notes / Remarks ── */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Notes / Remarks <span className="text-slate-400 font-normal text-xs">(Optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={hasBoostSelected ? "Optional details (e.g. donation camp, blood group)..." : "Optional notes or details..."}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm min-h-[80px] transition-all resize-none"
            />
          </div>

          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex items-center gap-2">
            <span className="font-semibold text-blue-800">Workflow Note:</span>
            <span>Items will be issued as <strong>Pending Acknowledgement</strong>. Employees must sign individually later.</span>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 mt-2 text-sm uppercase tracking-wide"
          >
            {createMutation.isPending
              ? 'Processing...'
              : `Confirm Distribution to ${form.employee_ids.length} Employee${form.employee_ids.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      )}
    </Modal>
  );
}
