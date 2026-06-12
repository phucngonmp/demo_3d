import React, { useEffect, useState } from 'react';
import { supabase } from '../../core/supabaseClient';
import { Configurator } from './Configurator';
import { calculateFileHash } from '../../utils/hash';

type ModelConfigRecord = {
  file_hash: string;
  name: string;
  created_at: string;
};

export function ConfigModel() {
  const [configs, setConfigs] = useState<ModelConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [configuringHash, setConfiguringHash] = useState<{ hash: string, name: string } | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('model_configs').select('file_hash, name, created_at').order('created_at', { ascending: false });
    if (!error && data) {
      setConfigs(data);
    }
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // 1. Lấy Hash của File thay vì upload
    const hash = await calculateFileHash(file);

    // 2. Kiểm tra xem Hash này đã tồn tại trong Database chưa
    const { data } = await supabase.from('model_configs').select('file_hash, name').eq('file_hash', hash).single();

    if (!data) {
      // 3. Nếu chưa tồn tại, tạo một bản nháp vào Database
      await supabase.from('model_configs').insert([
        { file_hash: hash, name: file.name, config_data: {} }
      ]);
      setConfiguringHash({ hash, name: file.name });
    } else {
      // Nếu đã tồn tại, chuyển tới màn hình Configurator
      setConfiguringHash({ hash: data.file_hash, name: data.name });
    }
    
    setUploading(false);
    e.target.value = ''; // Reset input
  };

  if (loading) return <div style={{ color: '#1f2937', padding: 20 }}>Đang tải...</div>;

  if (configuringHash) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', color: '#1f2937' }}>
        <Configurator 
          fileHash={configuringHash.hash} 
          fileName={configuringHash.name}
          onBack={() => {
            setConfiguringHash(null);
            fetchConfigs();
          }} 
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 30, background: '#f3f4f6', minHeight: '100vh', color: '#1f2937' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1>Công Cụ Cấu Hình 3D</h1>
      </div>

      <div style={{ background: '#ffffff', padding: 20, borderRadius: 8, marginBottom: 30, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3>Chọn File 3D (.glb) để Cấu Hình</h3>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          Hệ thống sẽ lấy Chữ ký mã hóa (Hash) của file để xác định cấu hình, không tốn dung lượng tải lên Server.
        </p>
        <input 
          type="file" 
          accept=".glb,.gltf" 
          onChange={handleFileSelect} 
          disabled={uploading}
          style={{ display: 'block', marginTop: 10 }}
        />
        {uploading && <p style={{ color: '#60a5fa', fontSize: 14 }}>Đang phân tích File Hash...</p>}
      </div>

      <div style={{ background: '#ffffff', padding: 20, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3>Danh Sách Các Cấu Hình Hiện Tại</h3>
        {configs.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Chưa có cấu hình nào. Hãy chọn file để tạo mới!</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: 10 }}>Tên Model</th>
                <th style={{ padding: 10 }}>Mã Hash</th>
                <th style={{ padding: 10 }}>Ngày Tạo</th>
                <th style={{ padding: 10 }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(c => (
                <tr key={c.file_hash} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10 }}>{c.name}</td>
                  <td style={{ padding: 10, color: '#6b7280', fontSize: 12 }}>{c.file_hash.substring(0, 16)}...</td>
                  <td style={{ padding: 10 }}>{new Date(c.created_at).toLocaleString()}</td>
                  <td style={{ padding: 10 }}>
                    <button 
                      onClick={() => setConfiguringHash({ hash: c.file_hash, name: c.name })}
                      style={{ background: '#3b82f6', color: 'white', padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      Sửa Nhóm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
