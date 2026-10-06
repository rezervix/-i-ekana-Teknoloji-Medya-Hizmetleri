import { prisma } from "@/lib/prisma";
import GenerateBlogButton from "./GenerateBlogButton";
import { Plus, Edit, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  let posts: any[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Error fetching blog posts", error);
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-corp-border shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
        <h2 className="font-display text-lg sm:text-xl font-bold text-corp-charcoal">Blog Yönetimi</h2>
        <div className="flex flex-wrap items-center gap-2">
          <GenerateBlogButton />
          <button className="bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-corp-teal-600 transition-colors min-h-[44px]">
            <Plus size={16} /> Yeni Yazı
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-y border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-4 rounded-tl-lg">Başlık</th>
              <th className="p-4">Yazar</th>
              <th className="p-4">Tarih</th>
              <th className="p-4">Durum</th>
              <th className="p-4 text-right rounded-tr-lg">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-corp-gray">Hiç blog yazısı bulunamadı.</td>
              </tr>
            ) : (
              posts.map((post: any) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-semibold text-corp-charcoal">{post.title}</td>
                  <td className="p-4 text-sm text-corp-gray">{post.author?.name || 'Admin'}</td>
                  <td className="p-4 text-sm text-corp-gray">
                    {new Date(post.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {post.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal/10 rounded transition-colors" title="Düzenle">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 text-corp-gray hover:text-error hover:bg-error/10 rounded transition-colors" title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-corp-border">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-corp-gray text-sm">Hiç blog yazısı bulunamadı.</div>
        ) : (
          posts.map((post: any) => (
            <div key={post.id} className="py-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-corp-charcoal text-sm">{post.title}</p>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {post.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-corp-gray">
                <span>{post.author?.name || 'Admin'}</span>
                <span>{new Date(post.createdAt).toLocaleDateString("tr-TR")}</span>
              </div>

              <div className="flex items-center justify-end gap-1 pt-1 border-t border-corp-border/50">
                <button className="min-h-[38px] px-3 text-xs text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20 rounded-lg flex items-center gap-1 font-semibold transition-colors">
                  <Edit size={14} /> Düzenle
                </button>
                <button className="min-h-[38px] px-3 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 font-semibold transition-colors">
                  <Trash2 size={14} /> Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
