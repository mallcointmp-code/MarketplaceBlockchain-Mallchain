import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { cart, removeItem, updateQty, clear } = useCart();
  const navigate = useNavigate();

  const subtotal = (cart || []).reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0);

  return (
    <div>
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40">🛒</button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1" onClick={() => setOpen(false)} />
          <div className="w-96 bg-white shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Your Cart</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500">Close</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {(!cart || cart.length === 0) && <div className="text-gray-500">Cart is empty</div>}
              {cart && cart.map((it: any) => (
                <div key={it.id} className="flex justify-between items-center border-b py-2">
                  <div>
                    <div className="font-medium">{it.title || it.name}</div>
                    <div className="text-sm text-gray-600">KES {Number(it.price || 0).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(it.id, Math.max(1, (it.qty || 1) - 1))} className="px-2">-</button>
                    <div>{it.qty || 1}</div>
                    <button onClick={() => updateQty(it.id, (it.qty || 1) + 1)} className="px-2">+</button>
                    <button onClick={() => removeItem(it.id)} className="text-red-500 ml-2">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-right">
              <div className="font-semibold">Subtotal: KES {Number(subtotal || 0).toLocaleString()}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { clear(); setOpen(false); }} className="flex-1 bg-gray-200 py-2 rounded">Clear</button>
                <button onClick={() => { setOpen(false); navigate('/checkout'); }} className="flex-1 bg-green-600 text-white py-2 rounded">Checkout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
