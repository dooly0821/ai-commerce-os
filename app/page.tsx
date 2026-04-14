'use client';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. 파이어베이스 설정 (기존 설정 유지)
const firebaseConfig = {
  apiKey: 'AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc',
  authDomain: 'dooly-66736.firebaseapp.com',
  projectId: 'dooly-66736',
  storageBucket: 'dooly-66736.firebasestorage.app',
  messagingSenderId: '969360298710',
  appId: '1:969360298710:web:1c09f676b9d784a0bdaf77',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. 제미나이 AI 설정 (민혁님의 API 키 적용)
const genAI = new GoogleGenerativeAI('AIzaSyCSFPBsziw2QX5eAZoUYtMKGeF1XaVfccI');

export default function AetherFinalApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        text: input,
        user: '민혁',
        createdAt: serverTimestamp(),
      });
      setInput('');
    } catch (e) {
      console.error(e);
    }
  };

  // ✨ 공유하기 핵심 로직 (코드창 주소가 아닌 앱 주소 권장)
  const handleShare = () => {
    let currentUrl = window.location.href;

    // 만약 편집기(editor) 상태의 주소라면 경고창을 띄워줍니다.
    if (currentUrl.includes('stackblitz.com/edit/')) {
      alert(
        "💡 팁: 오른쪽 미리보기 창 위에 있는 'Open in New Tab' 버튼을 눌러서 새 창을 띄운 뒤, 그곳의 공유 버튼을 누르면 코드창 없이 앱만 깔끔하게 공유됩니다!"
      );
    }

    navigator.clipboard.writeText(currentUrl);
    alert('🔗 주소가 복사되었습니다! 이제 팀원들에게 전달하세요.');
  };

  const handleAiSummary = async () => {
    if (messages.length === 0) return alert('분석할 대화가 없습니다.');
    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const conversation = messages
        .map((m) => `${m.user}: ${m.text}`)
        .join('\n');
      const prompt = `너는 수석 디자이너 민혁의 AI 비서야. 대화 내용을 세련되게 요약해줘: \n\n ${conversation}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      alert('💡 AI 디자인 브리핑:\n' + response.text());
    } catch (err) {
      alert('AI 연결 중...');
    }
    setIsAiLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-zinc-100 font-sans tracking-tight">
      {/* HEADER: 버튼 그룹 추가 */}
      <header className="p-6 border-b border-zinc-900 bg-black/80 backdrop-blur-xl sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-blue-500 italic leading-none">
            AETHER LAB.
          </h1>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1 font-bold">
            Design Intelligence Network
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 px-4 py-2 rounded-full text-[10px] font-black transition-all active:scale-95"
          >
            SHARE
          </button>
          <button
            onClick={handleAiSummary}
            disabled={isAiLoading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white px-5 py-2 rounded-full text-[10px] font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {isAiLoading ? 'ANALYZING...' : 'AI SUMMARY'}
          </button>
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.user === '민혁' ? 'items-end' : 'items-start'
            }`}
          >
            <span className="text-[10px] text-zinc-600 mb-1 font-bold px-1 uppercase">
              {m.user}
            </span>
            <div
              className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-2xl transition-all ${
                m.user === '민혁'
                  ? 'bg-blue-600 rounded-tr-none shadow-blue-900/20'
                  : 'bg-zinc-900 border border-zinc-800 rounded-tl-none'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <form
        onSubmit={sendMessage}
        className="p-6 bg-gradient-to-t from-black to-transparent"
      >
        <div className="flex gap-2 max-w-5xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="팀원과 아이디어를 나누세요..."
            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 backdrop-blur-md transition-all"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-8 py-2 rounded-2xl font-black text-xs hover:bg-blue-500 transition-all"
          >
            SEND
          </button>
        </div>
      </form>
    </div>
  );
}
