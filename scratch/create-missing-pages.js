const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'src/app/admin/content/services/page.tsx', title: 'Hizmet Yönetimi' },
  { path: 'src/app/admin/content/team/page.tsx', title: 'Ekip Yönetimi' },
  { path: 'src/app/admin/content/testimonials/page.tsx', title: 'Referanslar' },
  { path: 'src/app/admin/content/faq/page.tsx', title: 'SSS Yönetimi' },
  { path: 'src/app/admin/clients/page.tsx', title: 'Markalar ve Ortaklar' },
  { path: 'src/app/admin/leads/page.tsx', title: 'Lead / CRM' },
  { path: 'src/app/admin/quotes/page.tsx', title: 'Teklif Yönetimi' },
  { path: 'src/app/admin/media/page.tsx', title: 'Medya Kütüphanesi' },
  { path: 'src/app/admin/emails/page.tsx', title: 'E-posta Şablonları' },
  { path: 'src/app/admin/users/page.tsx', title: 'Kullanıcı Yönetimi' },
  { path: 'src/app/admin/settings/page.tsx', title: 'Sistem Ayarları' }
];

const template = (title) => `import React from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-xl font-bold text-corp-charcoal">${title}</h2>
        <button className="bg-corp-teal text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-colors">
          <Plus size={16} /> Yeni Ekle
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-y border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-4 rounded-tl-lg">Başlık / Ad</th>
              <th className="p-4">Durum</th>
              <th className="p-4 text-right rounded-tr-lg">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border">
            <tr>
              <td colSpan={3} className="p-8 text-center text-corp-gray">Henüz kayıt bulunamadı.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

pages.forEach(p => {
  const fullPath = path.join(__dirname, '..', p.path);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, template(p.title));
  console.log('Created:', p.path);
});
