import React, { useState, useEffect } from 'react';
import { BookOpen, PenTool, CheckCircle, Clock, AlertCircle, RefreshCw, LogIn, ExternalLink, Plus, X, User, LogOut, Globe, ChevronDown, Repeat } from 'lucide-react';
import { Draft, DraftStatus, UserConfig, Question, ZhihuUser } from './types';
import { searchZhihuQuestions, generateDraft } from './services/geminiService';
import DraftEditor from './components/DraftEditor';

// --- Components for Tag Selection ---

const SUGGESTED_EXPERTISE = ["深度学习", "职场心理学", "美食探店", "前端开发", "法律咨询", "投资理财", "医学科普"];
const SUGGESTED_INTERESTS = ["科幻电影", "旅行摄影", "历史", "猫", "咖啡", "极简生活", "游戏设计"];

// Mock Zhihu User Data
const MOCK_ZHIHU_USER: ZhihuUser = {
  name: "知乎创作者",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  headline: "分享知识，发现更大的世界"
};

const TagSelector: React.FC<{
  label: string;
  selected: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder: string;
}> = ({ label, selected, onChange, suggestions, placeholder }) => {
  const [input, setInput] = useState("");

  const addTag = (tag: string) => {
    if (tag && !selected.includes(tag)) {
      onChange([...selected, tag]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(selected.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input.trim());
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      
      {/* Selected Tags Area */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selected.map((tag) => (
          <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-2 hover:text-blue-900">
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : "+ 添加..."}
          className="outline-none text-sm min-w-[100px] py-1 bg-transparent"
        />
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-400 py-1">推荐:</span>
        {suggestions.map((tag) => (
          <button
            key={tag}
            onClick={() => selected.includes(tag) ? removeTag(tag) : addTag(tag)}
            className={`px-3 py-1 rounded-full text-xs transition-colors border ${
              selected.includes(tag)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  // State
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  
  // Login/Config State
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [isLoginMocking, setIsLoginMocking] = useState(false);

  // App State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [inactivityAlert, setInactivityAlert] = useState<string | null>(null);
  
  // View State
  const [activeTab, setActiveTab] = useState<'pending' | 'published'>('pending');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [publishedSuccessDraft, setPublishedSuccessDraft] = useState<Draft | null>(null);

  // Initialize
  useEffect(() => {
    const storedConfig = localStorage.getItem('zhihucop_config');
    const storedDrafts = localStorage.getItem('zhihucop_drafts');

    if (storedDrafts) {
      setDrafts(JSON.parse(storedDrafts));
    }

    if (storedConfig) {
      const config: UserConfig = JSON.parse(storedConfig);
      // Migration for old config format if needed (string vs array)
      if (typeof config.expertise === 'string') {
        config.expertise = [config.expertise];
      }
      if (!config.interests) config.interests = [];
      
      setUserConfig(config);

      // Check inactivity (3 days = 259200000 ms)
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (now - config.lastInteraction > threeDaysMs) {
        const pendingCount = (JSON.parse(storedDrafts || '[]') as Draft[]).filter(d => d.status === DraftStatus.PENDING).length;
        setInactivityAlert(`您已经超过 3 天没来处理草稿了，当前有 ${pendingCount > 0 ? pendingCount : '若干'} 个热门问题可能错过最佳曝光期，建议尽快处理！`);
      }
    }
  }, []);

  // Persistence Helper
  const updateActivity = () => {
    if (!userConfig) return;
    const newConfig = { ...userConfig, lastInteraction: Date.now() };
    setUserConfig(newConfig);
    localStorage.setItem('zhihucop_config', JSON.stringify(newConfig));
  };

  const saveDraftsToStorage = (newDrafts: Draft[]) => {
    setDrafts(newDrafts);
    localStorage.setItem('zhihucop_drafts', JSON.stringify(newDrafts));
  };

  const saveConfigToStorage = (config: UserConfig) => {
    setUserConfig(config);
    localStorage.setItem('zhihucop_config', JSON.stringify(config));
  };

  // Handlers
  const handleLoginZhihu = async () => {
    setIsLoginMocking(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoginMocking(false);
    return MOCK_ZHIHU_USER;
  };

  const handleSetupComplete = async () => {
    if (expertiseTags.length === 0) return;
    
    // Auto login for demo purposes if not explicitly handling it separately, 
    // or just assume user is setting up fresh.
    const zhihuUser = await handleLoginZhihu();

    const config: UserConfig = {
      expertise: expertiseTags,
      interests: interestTags,
      lastInteraction: Date.now(),
      zhihuUser: zhihuUser
    };
    saveConfigToStorage(config);
    updateActivity();
  };

  const handleLogout = () => {
    if (!userConfig) return;
    const newConfig = { ...userConfig, zhihuUser: null };
    saveConfigToStorage(newConfig);
    setShowProfileMenu(false);
  };

  const handleSwitchAccount = async () => {
    handleLogout();
    // In a real app, this would trigger a new login flow. 
    // Here we just clear the user so they see the setup/login button or state (if we separate setup from login).
    // For simplicity, let's just re-login with a different mock or same mock.
    const zhihuUser = await handleLoginZhihu();
    if(userConfig) {
        saveConfigToStorage({ ...userConfig, zhihuUser });
    }
  };

  const handleFullReset = () => {
    setUserConfig(null);
    localStorage.removeItem('zhihucop_config');
    setShowProfileMenu(false);
  };

  const handleSearch = async () => {
    if (!userConfig) return;
    updateActivity();
    setIsSearching(true);
    setQuestions([]);
    try {
      const results = await searchZhihuQuestions(userConfig.expertise, userConfig.interests);
      const mappedQuestions: Question[] = results.map((r, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        title: r.title,
        url: r.url,
        source: r.url ? 'Search' : 'Simulation',
        reasoning: r.reasoning
      }));
      setQuestions(mappedQuestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateDraft = async (question: Question) => {
    if (!userConfig) return;
    updateActivity();
    setIsGenerating(question.id);

    try {
      const content = await generateDraft(question.title, userConfig.expertise, userConfig.interests);
      const newDraft: Draft = {
        id: `d-${Date.now()}`,
        questionTitle: question.title,
        questionUrl: question.url,
        content: content,
        status: DraftStatus.PENDING,
        createdAt: Date.now(),
        tags: [...userConfig.expertise, ...userConfig.interests].slice(0, 3)
      };
      
      const newDrafts = [newDraft, ...drafts];
      saveDraftsToStorage(newDrafts);
      
      setQuestions(prev => prev.filter(q => q.id !== question.id));
      setActiveTab('pending'); // Switch to pending tab to show the new draft
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleUpdateDraft = (updatedDraft: Draft) => {
    updateActivity();
    const newDrafts = drafts.map(d => d.id === updatedDraft.id ? updatedDraft : d);
    saveDraftsToStorage(newDrafts);
    setActiveDraft(updatedDraft);
  };

  const handlePublishDraft = (draftId: string) => {
    updateActivity();
    const newDrafts = drafts.map(d => d.id === draftId ? { ...d, status: DraftStatus.PUBLISHED } : d);
    saveDraftsToStorage(newDrafts);
    
    // Close editor and show success dialog
    setActiveDraft(null);
    const publishedDraft = newDrafts.find(d => d.id === draftId) || null;
    setPublishedSuccessDraft(publishedDraft);
  };

  // Filter Drafts
  const pendingDrafts = drafts.filter(d => d.status === DraftStatus.PENDING);
  const publishedDrafts = drafts.filter(d => d.status === DraftStatus.PUBLISHED);

  // Render Login/Setup Screen
  if (!userConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-blue-100">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg shadow-blue-200">
              <PenTool className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">知乎自动化创作助手</h1>
          <p className="text-center text-gray-500 mb-8">绑定账号并设定“人设”，开启高效创作之旅。</p>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
               <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                 <User size={16}/> 步骤 1: 绑定知乎账号
               </h3>
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-white border border-blue-200 flex items-center justify-center overflow-hidden">
                   {isLoginMocking ? (
                     <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                      <img src={MOCK_ZHIHU_USER.avatar} alt="Avatar" className="w-full h-full object-cover" />
                   )}
                 </div>
                 <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{MOCK_ZHIHU_USER.name}</p>
                    <p className="text-xs text-gray-500">{MOCK_ZHIHU_USER.headline}</p>
                 </div>
                 <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">已连接</div>
               </div>
            </div>

            <TagSelector 
              label="步骤 2: 您的擅长领域 (必选)" 
              selected={expertiseTags}
              onChange={setExpertiseTags}
              suggestions={SUGGESTED_EXPERTISE}
              placeholder="输入并回车，如：深度学习"
            />
            
            <TagSelector 
              label="步骤 3: 您感兴趣的领域 (可选)" 
              selected={interestTags}
              onChange={setInterestTags}
              suggestions={SUGGESTED_INTERESTS}
              placeholder="输入并回车，如：科幻电影"
            />

            <button
              onClick={handleSetupComplete}
              disabled={expertiseTags.length === 0 || isLoginMocking}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              完成设置并进入工作台
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-gray-800">
      {/* Activity Alert */}
      {inactivityAlert && (
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-start gap-3 animate-fade-in-down">
          <AlertCircle className="text-amber-600 w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{inactivityAlert}</p>
          <button onClick={() => setInactivityAlert(null)} className="ml-auto text-amber-500 hover:text-amber-700">
            <span className="sr-only">Dismiss</span>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-blue-600">ZhihuCopilot</span>
          </div>
          
          {/* User Profile Area */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end text-sm">
              <div className="text-gray-500 flex items-center gap-2">
                 <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">{userConfig.expertise[0]}等{userConfig.expertise.length}项擅长</span>
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden">
                  <img 
                    src={userConfig.zhihuUser?.avatar || MOCK_ZHIHU_USER.avatar} 
                    alt="User" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">{userConfig.zhihuUser?.name || '未登录'}</p>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {/* Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm text-gray-500">当前账号</p>
                    <p className="font-bold text-gray-800 truncate">{userConfig.zhihuUser?.name}</p>
                  </div>
                  <button 
                    onClick={handleSwitchAccount}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Repeat size={14} /> 切换账号
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut size={14} /> 退出登录
                  </button>
                  <div className="border-t border-gray-50 my-1"></div>
                  <button 
                    onClick={handleFullReset}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X size={14} /> 重置所有设置
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Question Scanner */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <RefreshCw size={18} className="text-blue-500" />
                  精选问题库
                </h2>
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                >
                  {isSearching ? '检索中...' : '扫描新问题'}
                </button>
              </div>
              
              <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
                {questions.length === 0 && !isSearching ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-sm font-medium">暂无推荐问题</p>
                    <p className="text-xs mt-2 text-gray-400 max-w-[200px] mx-auto">点击上方按钮，基于您的擅长与兴趣挖掘知乎热榜。</p>
                  </div>
                ) : (
                  questions.map(q => (
                    <div key={q.id} className="group border border-gray-100 rounded-lg p-4 hover:border-blue-200 hover:shadow-md transition-all bg-white">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="font-bold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors">
                          {q.title}
                        </h3>
                        {q.url && (
                          <a href={q.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 pt-1">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 bg-gray-50 inline-block px-2 py-1 rounded border border-gray-100">
                         💡 {q.reasoning}
                      </p>
                      <button
                        onClick={() => handleGenerateDraft(q)}
                        disabled={!!isGenerating}
                        className="w-full mt-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-100"
                      >
                        {isGenerating === q.id ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            AI 撰写中...
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            选定并撰写草稿
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
                {isSearching && (
                   <div className="flex flex-col items-center justify-center py-12 space-y-4">
                     <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                     <p className="text-sm text-gray-500">正在分析您的专家画像并全网检索...</p>
                   </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Draft Management */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tabs / Stats */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`p-4 rounded-xl shadow-sm border flex items-center gap-4 transition-all text-left ${
                  activeTab === 'pending' 
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                    : 'bg-white border-gray-100 hover:border-blue-100 hover:bg-gray-50'
                }`}
              >
                <div className={`p-3 rounded-full ${activeTab === 'pending' ? 'bg-blue-200 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{pendingDrafts.length}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">待确认草稿</div>
                </div>
              </button>
              
              <button 
                onClick={() => setActiveTab('published')}
                className={`p-4 rounded-xl shadow-sm border flex items-center gap-4 transition-all text-left ${
                  activeTab === 'published' 
                    ? 'bg-green-50 border-green-200 ring-2 ring-green-100' 
                    : 'bg-white border-gray-100 hover:border-green-100 hover:bg-gray-50'
                }`}
              >
                <div className={`p-3 rounded-full ${activeTab === 'published' ? 'bg-green-200 text-green-700' : 'bg-green-100 text-green-600'}`}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{publishedDrafts.length}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">已发布内容</div>
                </div>
              </button>
            </div>

            {/* Content List Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">
                  {activeTab === 'pending' ? '草稿箱 (待处理)' : '历史发布档案'}
                </h2>
              </div>
              
              <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
                {/* Empty State */}
                {activeTab === 'pending' && pendingDrafts.length === 0 && (
                   <div className="text-center py-20 text-gray-400">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                    <p>暂无待处理草稿</p>
                    <p className="text-xs mt-2">快去左侧生成一篇吧！</p>
                   </div>
                )}
                {activeTab === 'published' && publishedDrafts.length === 0 && (
                   <div className="text-center py-20 text-gray-400">
                    <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                    <p>暂无发布记录</p>
                   </div>
                )}

                {/* List Items */}
                {(activeTab === 'pending' ? pendingDrafts : publishedDrafts).map(draft => (
                  <div key={draft.id} className="p-5 hover:bg-gray-50 transition-colors group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                        draft.status === DraftStatus.PENDING ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {draft.status === DraftStatus.PENDING ? '待确认' : '已发布'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 
                      className="text-lg font-bold text-gray-800 mb-2 cursor-pointer group-hover:text-blue-600 transition-colors" 
                      onClick={() => setActiveDraft(draft)}
                    >
                      {draft.questionTitle}
                    </h3>
                    
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                      {draft.content.replace(/#|\*|\[|\]/g, '')}
                    </p>
                    
                    <div className="flex gap-2">
                       <button 
                          onClick={() => setActiveDraft(draft)}
                          className={`text-sm px-4 py-2 rounded-lg border transition-all font-medium ${
                            draft.status === DraftStatus.PUBLISHED 
                             ? 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                             : 'bg-white text-blue-600 border-gray-200 hover:border-blue-400'
                          }`}
                        >
                          {draft.status === DraftStatus.PUBLISHED ? '查看详情' : '审核与编辑'}
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Editor Modal */}
      {activeDraft && (
        <DraftEditor 
          draft={activeDraft} 
          onClose={() => setActiveDraft(null)}
          onUpdate={handleUpdateDraft}
          onPublish={handlePublishDraft}
        />
      )}

      {/* Post-Publish Success Modal */}
      {publishedSuccessDraft && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center transform scale-100 animate-fade-in-up">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">发布成功！</h3>
            <p className="text-sm text-gray-500 mb-6">
              您的回答《{publishedSuccessDraft.questionTitle}》已成功发布至知乎。
            </p>
            <div className="space-y-3">
              <a 
                href={publishedSuccessDraft.questionUrl || `https://www.zhihu.com/search?q=${encodeURIComponent(publishedSuccessDraft.questionTitle)}`} 
                target="_blank" 
                rel="noreferrer"
                className="block w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => setPublishedSuccessDraft(null)}
              >
                <Globe size={18} />
                前往知乎查看
              </a>
              <button 
                onClick={() => setPublishedSuccessDraft(null)}
                className="block w-full py-3 bg-gray-100 text-gray-60