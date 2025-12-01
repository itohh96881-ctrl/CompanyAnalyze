import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Save, Trash2, Edit2, TrendingUp, 
  FileText, ChevronLeft, Download, Upload, 
  Calendar, Code, Eye, EyeOff, ExternalLink
} from 'lucide-react';

// --- Types ---
type Analysis = {
  id: string;
  code: string;
  name: string;
  rating: number; // 1-5
  memo: string;
  htmlContent: string; // メインコンテンツ
  updatedAt: string; // ISO String
};

// --- Main Component ---
export default function StockClipApp() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHtmlPreview, setShowHtmlPreview] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const initialFormState = {
    code: '',
    name: '',
    rating: 3,
    memo: '',
    htmlContent: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);

  // --- Data Loading (Local Storage) ---
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('stock-clips-local');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // 証券コード順にソート
          parsedData.sort((a: Analysis, b: Analysis) => 
            a.code.localeCompare(b.code, undefined, { numeric: true })
          );
          setAnalyses(parsedData);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // --- Helper to save to LocalStorage ---
  const saveToLocalStorage = (data: Analysis[]) => {
    try {
      localStorage.setItem('stock-clips-local', JSON.stringify(data));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        alert("保存容量の上限に達しました。HTMLの量を減らすか、古いデータを削除してください。");
      } else {
        alert("データの保存中にエラーが発生しました。");
        console.error(e);
      }
      throw e;
    }
  };

  // --- Export / Import ---
  const handleExport = () => {
    const dataStr = JSON.stringify(analyses, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-clips-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (!Array.isArray(importedData)) {
          alert("無効なファイル形式です。");
          return;
        }

        const newAnalyses = [...analyses];
        let addedCount = 0;
        let updatedCount = 0;

        importedData.forEach((item: any) => {
          if (!item.id || !item.name) return;
          const existingIndex = newAnalyses.findIndex(a => a.id === item.id);
          if (existingIndex >= 0) {
            newAnalyses[existingIndex] = item as Analysis;
            updatedCount++;
          } else {
            newAnalyses.push(item as Analysis);
            addedCount++;
          }
        });

        newAnalyses.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

        saveToLocalStorage(newAnalyses);
        setAnalyses(newAnalyses);
        alert(`インポート完了: ${addedCount}件追加、${updatedCount}件更新`);
        event.target.value = '';
      } catch (err) {
        console.error(err);
        if (!(err instanceof DOMException && err.name === 'QuotaExceededError')) {
           alert("ファイルの読み込みに失敗しました。");
        }
      }
    };
    reader.readAsText(file);
  };

  // --- Actions ---
  const handleSave = () => {
    if (!formData.code || !formData.name) {
      alert("銘柄コードと企業名は必須です");
      return;
    }

    const now = new Date().toISOString();
    
    const newAnalysisData = {
      code: formData.code,
      name: formData.name,
      rating: formData.rating,
      memo: formData.memo,
      htmlContent: formData.htmlContent,
      updatedAt: now
    };

    let updatedAnalyses = [...analyses];

    if (editingId) {
      updatedAnalyses = updatedAnalyses.map(item => 
        item.id === editingId 
          ? { ...item, ...newAnalysisData, id: editingId } 
          : item
      );
    } else {
      const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      updatedAnalyses = [{ ...newAnalysisData, id: newId }, ...updatedAnalyses];
    }

    updatedAnalyses.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    
    try {
      saveToLocalStorage(updatedAnalyses);
      setAnalyses(updatedAnalyses);
      setView('list');
      setEditingId(null);
      setFormData(initialFormState);
    } catch (e) {
      // Error handled in saveToLocalStorage
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("このデータを削除してもよろしいですか？")) return;
    
    const updatedAnalyses = analyses.filter(item => item.id !== id);
    try {
      saveToLocalStorage(updatedAnalyses);
      setAnalyses(updatedAnalyses);
    } catch (e) {
      // Ignore
    }
  };

  const startEdit = (analysis: Analysis) => {
    setEditingId(analysis.id);
    setFormData({
      code: analysis.code,
      name: analysis.name,
      rating: analysis.rating,
      memo: analysis.memo,
      htmlContent: analysis.htmlContent || ''
    });
    setShowHtmlPreview(true);
    setView('edit');
  };

  const startNew = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowHtmlPreview(true);
    setView('edit');
  };

  // --- Filtering ---
  const filteredAnalyses = useMemo(() => {
    return analyses.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.code.includes(searchTerm)
    );
  }, [analyses, searchTerm]);

  // --- Components ---

  const RatingStars = ({ rating, setRating, readonly = false }: { rating: number, setRating?: (r: number) => void, readonly?: boolean }) => (
    <div className="flex gap-1" onClick={(e) => readonly && e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={(e) => {
            if (setRating) {
              e.stopPropagation();
              setRating(star);
            }
          }}
          className={`focus:outline-none ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
        >
          <svg
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
      <div className="animate-pulse flex flex-col items-center">
        <Code className="w-12 h-12 mb-4 text-indigo-500" />
        <p>データを読み込んでいます...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <TrendingUp size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              企業分析クリップ
              <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Local</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
             <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
              accept=".json"
            />
            <button 
              onClick={handleImportClick}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs sm:text-sm font-medium"
              title="ファイルをインポート"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">読込</span>
            </button>
            <button 
              onClick={handleExport}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs sm:text-sm font-medium"
              title="データをエクスポート"
            >
              <Download size={18} />
              <span className="hidden sm:inline">保存</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {view === 'list' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="企業名またはコードで検索..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={startNew}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 font-medium"
              >
                <Plus size={18} />
                新規追加
              </button>
            </div>

            {filteredAnalyses.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <Code className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">データがありません</p>
                <p className="text-sm text-gray-400 mt-2">「新規追加」からHTMLを貼り付けて保存してください</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                {filteredAnalyses.map(analysis => (
                  <div 
                    key={analysis.id} 
                    onClick={() => startEdit(analysis)}
                    className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-4"
                  >
                    {/* Code & Date */}
                    <div className="flex flex-col items-center justify-center min-w-[80px] text-center border-r border-slate-100 pr-4">
                        <span className="text-lg font-mono font-bold text-slate-700">{analysis.code}</span>
                        <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(analysis.updatedAt).toLocaleDateString()}
                        </span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                {analysis.name}
                            </h3>
                            <RatingStars rating={analysis.rating} readonly />
                        </div>
                        <p className="text-sm text-slate-500 truncate flex items-center gap-2">
                            {analysis.memo ? (
                                <span className="flex items-center gap-1"><FileText size={12} /> {analysis.memo}</span>
                            ) : (
                                <span className="text-slate-300 italic">メモなし</span>
                            )}
                            {analysis.htmlContent && (
                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-1 ml-2">
                                    <Code size={10} /> HTML保存済み
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={(e) => handleDelete(analysis.id, e)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                        <ChevronLeft className="rotate-180" size={24} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'edit' && (
          <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
            {/* Form Header */}
            <div className="bg-slate-50 border-b px-6 py-3 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('list')}
                  className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200"
                >
                  <ChevronLeft size={20} className="text-slate-500" />
                </button>
                <div className="flex flex-col">
                     <span className="text-xs text-slate-400 font-bold uppercase">
                        {editingId ? '閲覧・編集モード' : '新規クリップ'}
                     </span>
                     <div className="flex items-baseline gap-2">
                        <input 
                            type="text" 
                            className="bg-transparent border-none p-0 text-lg font-bold text-slate-700 focus:ring-0 w-20 font-mono"
                            placeholder="コード"
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value})}
                        />
                        <input 
                            type="text" 
                            className="bg-transparent border-none p-0 text-lg font-bold text-slate-700 focus:ring-0 w-64"
                            placeholder="企業名を入力"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                     </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow-lg shadow-indigo-200 transition-transform active:scale-95 font-bold text-sm"
                >
                  <Save size={16} />
                  保存して戻る
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Inputs */}
                <div className="w-full md:w-1/3 border-r border-slate-100 bg-slate-50 p-6 overflow-y-auto space-y-6 flex-shrink-0">
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">評価</label>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 inline-block">
                            <RatingStars rating={formData.rating} setRating={(r) => setFormData({...formData, rating: r})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">一言メモ</label>
                        <textarea 
                            className="w-full h-24 px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white text-sm resize-none"
                            placeholder="気になった点や将来の予測など..."
                            value={formData.memo}
                            onChange={e => setFormData({...formData, memo: e.target.value})}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase">
                                HTMLコード貼り付け
                            </label>
                            <button
                                onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                            >
                                {showHtmlPreview ? <Eye size={12}/> : <EyeOff size={12}/>}
                                {showHtmlPreview ? 'プレビュー中' : 'コードのみ'}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">
                            証券サイト等のHTMLをコピーしてここに貼り付けてください。
                        </p>
                        <textarea 
                            className="w-full h-64 px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-mono text-xs resize-y"
                            placeholder="<div class='chart'>...</div>"
                            value={formData.htmlContent}
                            onChange={e => setFormData({...formData, htmlContent: e.target.value})}
                        />
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="flex-1 bg-white overflow-hidden flex flex-col relative">
                    <div className="bg-slate-100 px-4 py-2 border-b flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <ExternalLink size={12} /> プレビューエリア
                         </span>
                         {!formData.htmlContent && (
                             <span className="text-xs text-red-400">HTMLが入力されていません</span>
                         )}
                    </div>
                    
                    <div className="flex-1 overflow-auto p-4">
                        {showHtmlPreview && formData.htmlContent ? (
                             <div 
                                className="prose max-w-none"
                                // Security: Only for local/personal use trusted content
                                dangerouslySetInnerHTML={{ __html: formData.htmlContent }} 
                             />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <Code size={48} className="mb-4 opacity-50" />
                                <p>左側のフォームにHTMLコードを貼り付けると<br/>ここに内容が表示されます</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
