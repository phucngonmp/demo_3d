import { useState, useEffect } from 'react';
import { supabase } from '../../core/supabaseClient';

type GroupConfig = {
  id: string;
  name: string;
  keywords: string[];
};

export function Configurator({ fileHash, fileName, onBack }: { fileHash: string, fileName: string, onBack: () => void }) {
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fileHash]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('model_configs').select('*').eq('file_hash', fileHash).single();
    if (!error && data) {
      const config = data.config_data || {};
      setGroups(config.groups || []);
    }
    setLoading(false);
  };

  const addGroup = () => {
    const id = prompt('Nhập ID nhóm (viết liền không dấu, vd: tubep):');
    if (!id) return;
    const name = prompt('Nhập Tên hiển thị (vd: Tủ Bếp):');
    if (!name) return;
    setGroups([...groups, { id, name, keywords: [] }]);
  };

  const updateKeywords = (index: number, value: string) => {
    const newGroups = [...groups];
    newGroups[index].keywords = value.split(',').map(s => s.trim()).filter(s => s);
    setGroups(newGroups);
  };

  const removeGroup = (index: number) => {
    if (confirm('Bạn có chắc muốn xóa nhóm này?')) {
      const newGroups = [...groups];
      newGroups.splice(index, 1);
      setGroups(newGroups);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const newConfig = { groups };
    const { error } = await supabase.from('model_configs').update({ config_data: newConfig }).eq('file_hash', fileHash);
    if (error) {
      alert('Lỗi lưu cấu hình: ' + error.message);
    } else {
      alert('Đã lưu cấu hình thành công!');
    }
    setSaving(false);
  };

  if (loading) return <p>Đang tải cấu hình...</p>;

  return (
    <div style={{ padding: 20, background: '#ffffff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <button onClick={onBack} style={{ marginBottom: 20, padding: '6px 12px', cursor: 'pointer', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4 }}>🔙 Quay lại</button>
      
      <h2 style={{ margin: '0 0 10px 0' }}>Cấu hình Nhóm Vật Liệu cho: {fileName}</h2>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>
        Tại đây, bạn cấu hình các Nhóm (VD: Tủ bếp, Sàn). Sau đó nhập các "Từ khóa" có trong tên của vật liệu gốc 
        để hệ thống tự động gộp chúng vào nhóm này. (Các từ khóa cách nhau bằng dấu phẩy).
      </p>

      <div style={{ marginBottom: 20 }}>
        <button onClick={addGroup} style={{ background: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          + Thêm Nhóm Mới
        </button>
        <button onClick={handleSave} disabled={saving} style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer', marginLeft: 10 }}>
          {saving ? 'Đang lưu...' : '💾 Lưu Cấu Hình'}
        </button>
      </div>

      {groups.length === 0 ? (
        <p style={{ color: '#d97706' }}>File này chưa được cấu hình nhóm. Hãy thêm nhóm mới để khách hàng có thể tương tác.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {groups.map((g, idx) => (
            <div key={idx} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: 15, borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 15 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{g.name} <span style={{ fontSize: 12, color: '#6b7280' }}>(ID: {g.id})</span></h3>
                <label style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 5 }}>Từ khóa (cách nhau bởi dấu phẩy):</label>
                <input 
                  type="text" 
                  value={g.keywords.join(', ')} 
                  onChange={(e) => updateKeywords(idx, e.target.value)}
                  placeholder="Ví dụ: tu, bep, cabinet, wood"
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db', background: '#ffffff', color: '#1f2937' }}
                />
              </div>
              <button onClick={() => removeGroup(idx)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '8px 12px', cursor: 'pointer', marginTop: 35 }}>Xóa</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
