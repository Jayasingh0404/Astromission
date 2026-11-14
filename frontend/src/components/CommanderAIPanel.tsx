import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  ExternalLink,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { MentorResponse } from '../types/astromission';

interface CommanderAIPanelProps {
  sessionId?: string;
  planet?: 'moon' | 'mars';
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const CommanderAIPanel: React.FC<CommanderAIPanelProps> = ({
  sessionId,
  planet = 'moon',
  isOpen,
  onClose,
  initialPrompt,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MentorResponse[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    } else {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';
      recog.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setQuestion(transcript);
          handleAsk(transcript);
        }
        setIsListening(false);
      };
      recog.onerror = () => {
        setIsListening(false);
      };
      recog.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recog;
    }

    if (!('speechSynthesis' in window)) {
      setTtsSupported(false);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && history.length === 0) {
      handleAsk(
        initialPrompt || 'Commander, what is our current mission status and top engineering priority?'
      );
    }
  }, [isOpen]);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleMicrophone = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleAsk = async (promptText?: string) => {
    const q = (promptText ?? question).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    if (!promptText) setQuestion('');

    try {
      const res = await api.askMentor(q, sessionId, planet);
      setHistory((prev) => [res, ...prev]);
      if (autoSpeak && ttsSupported) {
        speakText(res.spoken_summary);
      }
    } catch (err: any) {
      setError(
        err.message ||
          'COMMANDER AI telemetry link is temporarily unavailable. You can continue operating your mission normally.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const quickPrompts = [
    'Commander, why is my energy decreasing?',
    'How do I balance water recycling and oxygen generation?',
    'What is the trade-off of building a Hydroponic Greenhouse?',
    'How do we protect the crew during a Solar Storm?',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-space-900/95 backdrop-blur-xl border-l border-cyan-500/30 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-space-950/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              COMMANDER AI <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </h3>
            <p className="text-[11px] text-cyan-300">
              NASA-Referenced Mission Specialist & Voice Mentor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {ttsSupported && (
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setAutoSpeak(!autoSpeak);
              }}
              title={autoSpeak ? 'Mute Voice Output' : 'Enable Spoken Voice Responses'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-colors ${
                autoSpeak || isSpeaking
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-space-800 border-slate-700 text-slate-300 hover:border-cyan-500/40'
              }`}
            >
              {autoSpeak || isSpeaking ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Voice On
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" /> Voice Off
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Commander AI"
            className="p-1.5 rounded-lg bg-space-800 text-slate-300 hover:text-white border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-space-900/60">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
          Quick Engineering Queries:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(qp)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-space-800 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 transition-colors text-left"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Fallback Notice if browser lacks Web Speech API */}
      {!speechSupported && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
          Browser microphone recognition is unavailable in this environment; full text telemetry mentoring is active.
        </div>
      )}

      {/* Responses Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="p-4 rounded-xl bg-space-800/80 border border-cyan-500/30 flex items-center gap-3 text-sm text-cyan-200">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Analyzing live outpost telemetry & NASA ECLSS models...</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {history.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl bg-space-800/90 border border-cyan-500/25 p-4 space-y-3 shadow-lg"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-700/70 pb-2">
              <div className="text-xs font-semibold text-cyan-300">
                Q: “{item.question}”
              </div>
              {ttsSupported && (
                <button
                  type="button"
                  onClick={() => (isSpeaking ? stopSpeaking() : speakText(item.spoken_summary))}
                  className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 shrink-0 flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" /> {isSpeaking ? 'Stop' : 'Speak'}
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs leading-relaxed">
              <div className="p-2.5 rounded-lg bg-space-950/70 border border-slate-800">
                <span className="font-mono uppercase text-[10px] text-cyan-400 block mb-0.5">
                  1. Current Mission Situation
                </span>
                <p className="text-slate-200">{item.situation}</p>
              </div>

              <div>
                <span className="font-mono uppercase text-[10px] text-violet-400 block mb-0.5">
                  2. Systems Engineering Explanation
                </span>
                <p className="text-slate-200">{item.explanation}</p>
              </div>

              <div>
                <span className="font-mono uppercase text-[10px] text-emerald-400 block mb-1">
                  3. Recommended Engineering Options
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-200">
                  {item.possible_decisions.map((dec, i) => (
                    <li key={i}>{dec}</li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="font-mono uppercase text-[10px] text-amber-300 block mb-0.5">
                  4. Engineering Trade-Offs
                </span>
                <p className="text-amber-100">{item.trade_offs}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                <span className="font-mono uppercase text-[10px] text-cyan-300 block mb-0.5">
                  5. NASA Scientific Fact & Reference
                </span>
                <p className="text-slate-200 mb-1.5">{item.learning_fact}</p>
                {item.nasa_reference && (
                  <a
                    href={item.nasa_reference.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-medium"
                  >
                    Source: {item.nasa_reference.source_name} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Footer with Voice Mic */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="p-3 border-t border-slate-800 bg-space-950 flex items-center gap-2"
      >
        {speechSupported && (
          <button
            type="button"
            onClick={toggleMicrophone}
            title={isListening ? 'Stop Listening' : 'Speak Question to Commander AI'}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-space-800 text-cyan-300 border-slate-700 hover:border-cyan-400'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            isListening
              ? 'Listening... Speak your question to Commander AI'
              : 'Ask Commander AI about resources, events, or trade-offs...'
          }
          className="flex-1 bg-space-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 outline-none"
        />

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-space-950 font-semibold transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

