'use client';
import Image from 'next/image';
import { Pencil, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/api/products';

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewHistory: (product: Product) => void;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Out of Stock</span>;
  if (stock <= 10)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Low Stock</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">In Stock</span>;
}

export default function InventoryTable({ products, onEdit, onDelete, onViewHistory }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-muted">
        <p className="text-lg font-semibold mb-1">No products found</p>
        <p className="text-sm">Try adjusting your filters or add a new product.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Product</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Category</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Price</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Orig. Price</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Discount</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Stock</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Active</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((p) => (
            <tr key={p.id} className="bg-white hover:bg-cream/50 transition-colors">
              {/* Product */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => onViewHistory(p)}
                      className="font-semibold text-dark text-sm hover:text-primary hover:underline transition-colors text-left leading-snug"
                    >
                      {p.name}
                    </button>
                    {p.weight && <p className="text-xs text-muted">{p.weight}</p>}
                  </div>
                </div>
              </td>

              {/* Category */}
              <td className="px-4 py-3">
                <span className="capitalize text-muted">{p.category}</span>
              </td>

              {/* Price */}
              <td className="px-4 py-3 text-right font-semibold text-dark">₹{p.price}</td>

              {/* Original Price */}
              <td className="px-4 py-3 text-right text-muted">
                {p.original_price ? `₹${p.original_price}` : '—'}
              </td>

              {/* Discount */}
              <td className="px-4 py-3 text-center">
                {p.discount_percent > 0 ? (
                  <span className="text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                    {p.discount_percent}%
                  </span>
                ) : '—'}
              </td>

              {/* Stock */}
              <td className="px-4 py-3 text-center">
                <span className="text-sm font-semibold text-dark">{p.stock}</span>
              </td>

              {/* Status badge */}
              <td className="px-4 py-3 text-center">
                <StockBadge stock={p.stock} />
              </td>

              {/* Active */}
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-semibold ${p.is_active ? 'text-green-600' : 'text-muted'}`}>
                  {p.is_active ? 'Yes' : 'No'}
                </span>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onEdit(p)}
                    className="p-1.5 text-muted hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                    title="Edit product"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
