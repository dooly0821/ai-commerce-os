"use client";
import React, { useState, useEffect, useRef } from 'react'; // useRef 추가
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

const firebaseConfig = {
  apiKey: "AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc",
  authDomain: "dooly-66736.firebaseapp.com",
  projectId: "dooly-66736",
  storageBucket: "dooly-66736.firebasestorage.app",
  messagingSenderId: "969360298710",
  appId: "1:969360298710:web:1c09f676b9d784a0bdaf77"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const genAI = new GoogleGenerativeAI("AIzaSyCSFPBsziw2QX5eAZoUYtMKGeF1XaVfccI");

export default function AetherFinalApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [myDisplayName, setMyDisplayName] = useState("");
  
  // ✨ 스크롤을 위한 '기준점'을 만듭니다.
  const messagesEndRef = useRef(null);

  // ✨ 메시지 목록이 바뀔 때마다 아래로 스크롤하는 함수
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let name = prompt("사용하실 이름을 입력해주세요!");
    if (!name) name = "익명";
    setMyDisplayName(name);

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // ✨ 메시지가 추가될 때마다 자동으로 스크롤 내려가게 설정
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: input,
        user: myDisplayName,
        createdAt: serverTimestamp()
      });
      setInput("");
    } catch (e) { console.error(e); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("🔗 주소가 복사되었습니다! 팀원들에게 공유하세요.");
  };

  const handleAiSummary = async () => {
    if (messages.length === 0) return alert("데이터가 없습니다.");
    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const conversation = messages.map(m => `${m.user}: ${m.text}`).join("\n");
      const prompt = `너는 수석 디자이너 민혁의 AI 비서야. 대화 내용을 세련되게 요약해줘: \n\n ${conversation}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      alert("✨ AI 디자인 브리핑:\n" + response.text());
    } catch (err) { alert("AI 연결 중..."); }
    setIsAiLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <header className="p-5 border-b border-zinc-900 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-blue-500 italic">AETHER LAB.</h1>
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">User: {myDisplayName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-zinc-800 hover:bg-zinc-800">SHARE</button>
          <button onClick={handleAiSummary} disabled={isAiLoading} className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg shadow-blue-500/20 active:scale-95">
            {isAiLoading ? "..." : "AI SUMMARY"}
          </button>
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.user === myDisplayName ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] text-zinc-600 mb-1 font-bold px-1">{m.user}</span>
            <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-xl transition-all ${
              m.user === myDisplayName 
              ? 'bg-blue-600 rounded-tr-none shadow-blue-900/10' 
              : 'bg-zinc-900 border border-zinc-800 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {/* ✨ 이 아래가 스크롤의 '도착지'가 됩니다 */}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-5 bg-gradient-to-t from-black to-transparent">
        <div className="flex gap-2 max-w-4xl mx-auto bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 backdrop-blur-md">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="아이디어를 제안하세요..." 
            className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none" 
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-blue-500 transition-all">SEND</button>
        </div>
      </form>
    </div>
  );
}
