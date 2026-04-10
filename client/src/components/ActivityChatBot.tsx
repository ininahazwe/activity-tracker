// client/src/components/ActivityChatBot.tsx
import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Loader, Minimize2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
    provider?: 'groq' | 'claude-fallback';
}

interface ActivityChatBotProps {
    projectId: string;
    activityId?: string;  // ✅ ID de l'activité spécifique (optionnel)
    onClose?: () => void;
    embedded?: boolean;   // ✅ NOUVEAU: true = mode intégré dans sidebar, false = floating
}

/**
 * Composant ChatBot pour interroger les activités
 * Utilise Groq (gratuit et rapide) avec fallback Claude
 */
export function ActivityChatBot({ projectId, activityId, onClose, embedded = false }: ActivityChatBotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll vers le dernier message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !projectId || loading) return;

        // Ajouter le message utilisateur
        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: input,
                    projectId,
                    activityId,  // ✅ Passer l'ID de l'activité si présent
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors du chat');
            }

            const data = await response.json();

            // Ajouter la réponse IA
            const aiMessage: Message = {
                role: 'ai',
                content: data.reply,
                timestamp: new Date(),
                provider: data.provider,
            };

            setMessages((prev) => [...prev, aiMessage]);

            // Notification si fallback Claude
            if (data.provider === 'claude-fallback') {
                toast.success('🔄 Claude (Groq indisponible)', {
                    duration: 2,
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            toast.error((error as Error).message || 'Erreur serveur');

            // Supprimer le message utilisateur en cas d'erreur
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    // ✅ MODE EMBEDDED (dans la sidebar de la modal)
    if (embedded) {
        return (
            <div className="flex flex-col h-full bg-card">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-4 h-full flex items-center justify-center">
                            <div>
                                <MessageCircle size={32} className="mx-auto mb-3 opacity-50" />
                                <p>Posez une question...</p>
                                <p className="text-xs mt-2 opacity-75">
                                    💨 Groq + Claude
                                </p>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[240px] px-3 py-2 rounded-lg text-xs break-words ${
                                    msg.role === 'user'
                                        ? 'bg-accent text-white rounded-br-none'
                                        : 'bg-accent/10 text-foreground border border-border rounded-bl-none'
                                }`}
                            >
                                <p>{msg.content}</p>
                                {msg.provider && msg.role === 'ai' && (
                                    <p className="text-xs opacity-60 mt-1">
                                        {msg.provider === 'groq' ? '⚡ Groq' : '🔄 Claude'}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg">
                                <Loader size={12} className="animate-spin text-accent" />
                                <span className="text-xs text-muted-foreground">
                                    Réflexion...
                                </span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-border flex gap-2 bg-card flex-shrink-0">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !loading && input.trim()) {
                                handleSend();
                            }
                        }}
                        placeholder="Question..."
                        disabled={loading}
                        maxLength={300}
                        className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 transition activity-chat-input"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-accent text-white p-1.5 rounded hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                        title="Envoyer"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        );
    }

    // ✅ MODE FLOATING (bouton flottant en bas à droite)
    // Mode minimisé (juste le bouton)
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-accent text-white p-3 rounded-full shadow-lg hover:bg-accent/90 transition flex items-center gap-2 z-40"
                title="Ouvrir l'assistant IA"
            >
                <MessageCircle size={20} />
                <span className="text-sm font-medium hidden sm:inline">Assistant IA</span>
            </button>
        );
    }

    return (
        <div
            className={`fixed z-40 bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
                isMinimized
                    ? 'bottom-4 right-4 w-96 h-14'
                    : 'bottom-4 right-4 w-96 h-96 max-h-[80vh]'
            }`}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-accent to-accent/80 text-white p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <MessageCircle size={20} />
                    <h3 className="font-semibold text-sm">Assistant Activités</h3>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="hover:bg-white/20 p-1 rounded transition"
                        title={isMinimized ? 'Agrandir' : 'Minimiser'}
                    >
                        {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                    </button>
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            onClose?.();
                        }}
                        className="hover:bg-white/20 p-1 rounded transition"
                        title="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages - hidden si minimisé */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-4 h-full flex items-center justify-center">
                                <div>
                                    <MessageCircle size={32} className="mx-auto mb-3 opacity-50" />
                                    <p>Posez une question sur vos activités...</p>
                                    <p className="text-xs mt-2 opacity-75">
                                        💨 Groq (gratuit) + Claude
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[280px] px-4 py-2 rounded-lg text-sm break-words ${
                                        msg.role === 'user'
                                            ? 'bg-accent text-white rounded-br-none'
                                            : 'bg-accent/10 text-foreground border border-border rounded-bl-none'
                                    }`}
                                >
                                    <p>{msg.content}</p>
                                    {msg.provider && msg.role === 'ai' && (
                                        <p className="text-xs opacity-60 mt-1">
                                            {msg.provider === 'groq' ? '⚡ Groq' : '🔄 Claude'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-lg">
                                    <Loader size={14} className="animate-spin text-accent" />
                                    <span className="text-xs text-muted-foreground">
                    Réflexion...
                  </span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-border flex gap-2 bg-card flex-shrink-0">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !loading && input.trim()) {
                                    handleSend();
                                }
                            }}
                            placeholder="Votre question..."
                            disabled={loading}
                            maxLength={500}
                            className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 transition"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="bg-accent text-white p-2 rounded hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                            title="Envoyer"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default ActivityChatBot;