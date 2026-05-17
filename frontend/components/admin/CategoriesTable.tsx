'use client';
import Image from 'next/image';
import { Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@/lib/api/categories';

interface Props {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoriesTable({ categories, onEdit, onDelete }: Props) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-20 text-muted">
        <p className="text-lg font-semibold mb-1">No categories yet</p>
        <p className="text-sm">Click "Add Category" to create your first one.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Category</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Active</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Created</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {categories.map((cat) => (
            <tr key={cat.id} className="bg-white hover:bg-cream/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                    {cat.image_url ? (
                      <Image src={cat.image_url} alt={cat.name} width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🏷️</div>
                    )}
                  </div>
                  <span className="font-semibold text-dark">{cat.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-semibold ${cat.is_active ? 'text-green-600' : 'text-muted'}`}>
                  {cat.is_active ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="px-4 py-3 text-muted text-xs">
                {new Date(cat.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onEdit(cat)}
                    className="p-1.5 text-muted hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                    title="Edit category"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(cat)}
                    className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete category"
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
