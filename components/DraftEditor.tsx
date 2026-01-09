import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Draft, DraftStatus } from '../types';
import { X, Check, Save } from 'lucide-react';

interface DraftEditorProps {
  draft: Draft;
  onClose: () => void;
  onUpdate: (updatedDraft: Draft) => void;
  onPublish: (draftId: string) => void;
}

const DraftEditor: React.FC<DraftEditorProps> = ({ draft, onClose, onUpdate, onPublish }) => {
  const [content, setContent] = useState(draft.content);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(draft.content);
  }, [draft]);

  const handleSave = () => {
    setIsSaving(true);
    onUpdate({ ...draft, content });
    setTimeout(() => setIsSaving(false), 500);
  };

  const handlePublish = () => {
    onUpdate({ ...draft, content }); // Ensure latest content is saved
    onPublish(draft.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{draft.questionTitle}</h3>
            <p className="text-sm text-gray-500">编辑草稿 • {draft.tags.join(', ')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          {/* Textarea */}
          <div className="flex-1 border-r border-gray-100 flex flex-col h-full">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              Markdown 编辑
            </div>
            <textarea
              className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-gray-700 bg-white"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此输入您的回答..."
            />
          </div>

          {/* Preview (Smart rendering) */}
          <div className="flex-1 bg-gray-50 flex flex-col hidden md:flex h-full">
             <div className="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
               效果预览
             </div>
             <div className="flex-1 p-8 overflow-y-auto">
                <article className="prose prose-blue prose-sm max-w-none bg-white p-6 rounded-lg shadow-sm">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </article>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-white">
          <span className="text-xs text-gray-400">
             {isSaving ? '正在保存...' : '自动保存已启用'}
          </span>
          <div className="flex gap-3">
             <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
            >
              <Save size={16} />
              保存草稿
            </button>
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-200 transition-all font-medium text-sm"
            >
              <Check size={16} />
              确认发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftEditor;
