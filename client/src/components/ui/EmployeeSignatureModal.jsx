import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import Modal from './Modal';
import { toast } from './Toast';
import api from '../../lib/api';

export default function EmployeeSignatureModal({ isOpen, onClose, employee, issueId, pendingCount }) {
  const queryClient = useQueryClient();
  const sigCanvas = useRef(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [error, setError] = useState('');

  const acknowledgeMutation = useMutation({
    mutationFn: async (payload) => {
      const endpoint = issueId 
        ? `/issues/acknowledge/${issueId}` 
        : `/issues/acknowledge/employee/${employee.id}`;
      const { data } = await api.put(endpoint, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success(data.message || 'Signature saved successfully!');
      onClose();
      setIsSignatureEmpty(true);
      if (sigCanvas.current) sigCanvas.current.clear();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to save signature');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignatureEmpty || !sigCanvas.current) {
      return setError('Employee signature is required to acknowledge receipt.');
    }
    setError('');
    const signatureBase64 = sigCanvas.current.toDataURL('image/png');
    acknowledgeMutation.mutate({ signature: signatureBase64 });
  };

  if (!employee && !issueId) return null;

  const displayName = employee?.name || 'Employee';
  const displayCode = employee?.emp_code || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Asset Acknowledgement">
      <form onSubmit={handleSubmit} className="p-4 space-y-6">

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h4 className="font-bold text-blue-900 text-sm mb-1">Acknowledge Receipt</h4>
          <p className="text-xs text-blue-700">
            {issueId 
              ? `You are digitally signing to confirm the receipt of the assigned item.`
              : `You are digitally signing to confirm the receipt of ${pendingCount} item(s) assigned to:`
            }
          </p>
          <div className="mt-3 flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-800">{displayName}</div>
              <div className="text-xs text-slate-500">{displayCode}</div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Digital Signature <span className="text-red-500">*</span></label>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{ className: 'w-full h-40 cursor-crosshair' }}
              onEnd={() => setIsSignatureEmpty(false)}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-slate-500 italic">Please sign within the box above</p>
            <button
              type="button"
              onClick={() => { sigCanvas.current?.clear(); setIsSignatureEmpty(true); }}
              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded"
            >
              Clear Canvas
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={acknowledgeMutation.isPending || isSignatureEmpty}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 text-sm uppercase tracking-wide"
        >
          {acknowledgeMutation.isPending ? 'Saving Signature...' : 'Sign & Acknowledge'}
        </button>
      </form>
    </Modal>
  );
}
