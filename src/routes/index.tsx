import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getUserIdAsync } from "@/sdk/core/auth";
import {
  MessageSquarePlus,
  Send,
  Trash2,
  Image as ImageIcon,
  Globe,
  Bot,
  User,
  Sparkles,
  X,
  Menu,
  Search,
  Mail,
  Calendar,
  FileText,
  ClipboardList,
  Briefcase,
} from "lucide-react";

import ConversationORM, {
  type ConversationModel,
} from "@/sdk/database/orm/orm_conversation";
import MessageORM, {
  MessageRole,
} from "@/sdk/database/orm/orm_message";
import { requestOpenAIGPTChat } from "@/sdk/api-clients/688a0b64dc79a2533460892c/requestOpenAIGPTChat";
import { requestOpenAIGPTVision } from "@/sdk/api-clients/68a5655cdeb2a0b2f64c013d/requestOpenAIGPTVision";
import { requestCreaoSearch } from "@/sdk/api-clients/689979fee926f36a53ec0042/requestCreaoSearch";

export const Route = createFileRoute("/")({
  component: App,
});

type AssistantMode = "chat" | "email" | "calendar" | "meeting" | "pdf" | "search";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  timestamp: string;
  isLoading?: boolean;
}

// Modelo GPT mais recente disponível - GPT-4.1 (2025)
const AI_MODEL = "gpt-4.1";

const getCurrentDate = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  };
  return now.toLocaleDateString("pt-BR", options);
};

const getFormattedDate = () => {
  const now = new Date();
  return {
    full: now.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    iso: now.toISOString().split("T")[0],
    time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
};

const getSystemPrompt = (mode: AssistantMode, currentDate: string): string => {
  const dateInfo = getFormattedDate();

  const baseContext = `Você é um assistente pessoal de IA de última geração, alimentado pelo modelo GPT-4.1 (versão mais recente de 2025).

## INFORMAÇÕES TEMPORAIS
- Data atual: ${dateInfo.full}
- Data ISO: ${dateInfo.iso}
- Hora atual: ${dateInfo.time}
- Ano: ${dateInfo.year}

## SUAS CAPACIDADES
Você tem acesso às mais recentes capacidades do GPT-4.1:
- Conhecimento atualizado até 2025
- Raciocínio avançado e análise complexa
- Compreensão profunda de contexto
- Capacidade multimodal (texto e imagens)
- Respostas precisas e bem fundamentadas

## DIRETRIZES
- Responder SEMPRE em português do Brasil
- Ser profissional, claro, objetivo e prestativo
- Fornecer informações precisas e atualizadas
- Manter contexto ao longo da conversa
- Usar formatação markdown quando apropriado
- Ser proativo em sugerir melhorias e soluções`;

  switch (mode) {
    case "email":
      return `${baseContext}

## MODO: ASSISTENTE DE E-MAIL PROFISSIONAL

### Suas Especialidades:
- Redigir e-mails profissionais, formais e informais
- Responder e-mails de forma adequada ao contexto
- Sugerir melhorias em rascunhos de e-mail
- Resumir threads de e-mail longas
- Criar templates de e-mail para diferentes situações
- Ajustar o tom (formal, semi-formal, casual) conforme necessário
- Detectar e corrigir erros de gramática e estilo
- Sugerir linhas de assunto impactantes

### Ao redigir um e-mail:
1. **Contexto**: Pergunte sobre o destinatário e contexto se não fornecido
2. **Estrutura**: Crie um e-mail com: Assunto, Saudação, Corpo, Despedida
3. **Variações**: Ofereça variações de tom quando apropriado
4. **Formatação**: Use formatação clara e profissional

### Ao responder um e-mail:
1. Analise o tom e contexto do e-mail original
2. Identifique os pontos principais a serem respondidos
3. Sugira uma resposta adequada e profissional`;

    case "calendar":
      return `${baseContext}

## MODO: ASSISTENTE DE AGENDA/CALENDÁRIO

### Contexto Temporal:
- Hoje é ${dateInfo.full}
- Use esta data como referência para todos os agendamentos

### Suas Especialidades:
- Organizar e planejar a agenda do usuário
- Sugerir horários para reuniões e compromissos
- Criar lembretes e listas de tarefas
- Analisar disponibilidade e conflitos de horário
- Planejar semanas e meses de trabalho
- Criar cronogramas e planos de projeto
- Calcular durações e intervalos
- Sugerir blocos de tempo produtivos

### Ao organizar eventos:
1. **Informações**: Data, hora, local, participantes, duração
2. **Preparativos**: Sugira o que precisa ser feito antes
3. **Conflitos**: Identifique possíveis conflitos de horário
4. **Follow-ups**: Ofereça lembretes e acompanhamentos

Use sempre formatação clara com datas no formato brasileiro (DD/MM/AAAA).`;

    case "meeting":
      return `${baseContext}

## MODO: RELATÓRIO DE REUNIÕES

### Suas Especialidades:
- Criar atas de reunião estruturadas e profissionais
- Resumir discussões e decisões de forma clara
- Listar action items com responsáveis e prazos
- Identificar próximos passos concretos
- Criar follow-ups de reunião
- Documentar pontos-chave e conclusões
- Extrair insights de notas desestruturadas

### Estrutura Padrão para Atas:

**📋 ATA DE REUNIÃO**
1. **Data e Hora**: ${dateInfo.full}
2. **Participantes**: [Lista de participantes]
3. **Pauta/Agenda**: [Tópicos discutidos]
4. **Discussões Principais**: [Resumo das discussões]
5. **Decisões Tomadas**: [Lista de decisões]
6. **Action Items**:
   - [ ] Tarefa 1 - Responsável - Prazo
   - [ ] Tarefa 2 - Responsável - Prazo
7. **Próximos Passos**: [O que fazer a seguir]
8. **Próxima Reunião**: [Data/hora se aplicável]

Sempre peça informações que faltam para criar um relatório completo e útil.`;

    case "pdf":
      return `${baseContext}

## MODO: ANÁLISE DE DOCUMENTOS/PDF

### Suas Especialidades:
- Analisar e resumir documentos complexos
- Extrair informações-chave de textos longos
- Criar sumários executivos concisos
- Identificar pontos principais de contratos e documentos legais
- Responder perguntas específicas sobre conteúdo
- Comparar diferentes versões de documentos
- Extrair dados, tabelas e métricas
- Identificar cláusulas importantes em contratos
- Destacar prazos, valores e obrigações

### Ao analisar um documento:
1. **Tipo**: Identifique o tipo de documento
2. **Resumo**: Faça um resumo executivo (3-5 pontos principais)
3. **Pontos-chave**: Liste as informações mais importantes
4. **Alertas**: Destaque informações críticas ou prazos
5. **Perguntas**: Responda perguntas específicas do usuário

Use formatação estruturada com títulos, listas e destaques para facilitar a leitura.`;

    case "search":
      return `${baseContext}

## MODO: PESQUISA NA WEB INTELIGENTE

### Suas Especialidades:
- Analisar resultados de pesquisa na web
- Sintetizar informações de múltiplas fontes
- Identificar informações mais relevantes e atualizadas
- Citar fontes de forma apropriada
- Distinguir entre fatos e opiniões
- Verificar a credibilidade das fontes
- Fornecer respostas abrangentes e bem fundamentadas

### Ao responder com base em pesquisa:
1. **Síntese**: Combine informações de várias fontes
2. **Relevância**: Priorize as informações mais pertinentes
3. **Fontes**: Cite as fontes quando apropriado
4. **Atualidade**: Indique a data das informações quando relevante
5. **Contexto**: Forneça contexto adicional quando útil`;

    default:
      return `${baseContext}

## MODO: ASSISTENTE GERAL INTELIGENTE

### Suas Capacidades:
- Responder perguntas sobre qualquer tema
- Dar conselhos e sugestões personalizadas
- Ajudar com tarefas de produtividade
- Brainstorming e geração de ideias
- Análise de problemas complexos
- Escrita criativa e profissional
- Cálculos e análises numéricas
- Explicações didáticas e claras
- Tradução e adaptação de conteúdo

### Como você trabalha:
- Analiso cuidadosamente cada solicitação
- Forneço respostas completas e bem estruturadas
- Sugiro alternativas e melhorias quando apropriado
- Peço esclarecimentos quando necessário
- Mantenho o contexto da conversa

Estou aqui para ajudar em qualquer tarefa. Como posso ser útil?`;
  }
};

const modeConfig: Record<AssistantMode, { icon: typeof Mail; label: string; color: string; description: string }> = {
  chat: { icon: Sparkles, label: "Chat", color: "violet", description: "Assistente geral" },
  email: { icon: Mail, label: "E-mail", color: "blue", description: "Redigir e responder e-mails" },
  calendar: { icon: Calendar, label: "Agenda", color: "green", description: "Organizar compromissos" },
  meeting: { icon: ClipboardList, label: "Reuniões", color: "orange", description: "Relatórios e atas" },
  pdf: { icon: FileText, label: "Documentos", color: "pink", description: "Analisar textos e PDFs" },
  search: { icon: Globe, label: "Pesquisa", color: "cyan", description: "Buscar na web" },
};

function App() {
  const [conversations, setConversations] = useState<ConversationModel[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("chat");
  const [currentDate, setCurrentDate] = useState(getCurrentDate());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversationOrm = ConversationORM.getInstance();
  const messageOrm = MessageORM.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(getCurrentDate());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadConversations = useCallback(async (uid: string) => {
    const convs = await conversationOrm.getConversationByUserId(uid);
    const sorted = convs.sort(
      (a, b) => Number(b.update_time) - Number(a.update_time)
    );
    setConversations(sorted);
  }, [conversationOrm]);

  useEffect(() => {
    const init = async () => {
      const uid = await getUserIdAsync();
      setUserId(uid);
      if (uid) {
        await loadConversations(uid);
      }
      setIsLoadingConversations(false);
    };
    init();
  }, [loadConversations]);

  const loadMessages = async (conversationId: string) => {
    const msgs = await messageOrm.getMessageByConversationId(conversationId);
    const sorted = msgs.sort(
      (a, b) => Number(a.create_time) - Number(b.create_time)
    );
    const displayMsgs: DisplayMessage[] = sorted.map((m) => ({
      id: m.id,
      role: m.role === MessageRole.user ? "user" : "assistant",
      content: m.content,
      imageUrl: m.image_url,
      timestamp: m.create_time,
    }));
    setMessages(displayMsgs);
  };

  const createNewConversation = async () => {
    if (!userId) return;
    const modeLabel = modeConfig[assistantMode].label;
    const newConv = await conversationOrm.insertConversation([
      {
        id: "",
        data_creator: "",
        data_updater: "",
        create_time: "",
        update_time: "",
        user_id: userId,
        title: `${modeLabel} - Nova conversa`,
      },
    ]);
    if (newConv.length > 0) {
      await loadConversations(userId);
      setActiveConversationId(newConv[0].id);
      setMessages([]);
    }
  };

  const selectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await loadMessages(conversationId);
    setIsSidebarOpen(false);
  };

  const deleteConversation = async (conversationId: string) => {
    await conversationOrm.deleteConversationById(conversationId);
    await messageOrm.deleteMessageByConversationId(conversationId);
    if (userId) {
      await loadConversations(userId);
    }
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !imageUrl) || isLoading) return;

    let conversationId = activeConversationId;

    if (!conversationId && userId) {
      const modeLabel = modeConfig[assistantMode].label;
      const newConv = await conversationOrm.insertConversation([
        {
          id: "",
          data_creator: "",
          data_updater: "",
          create_time: "",
          update_time: "",
          user_id: userId,
          title: `${modeLabel}: ${inputValue.slice(0, 40)}` || `${modeLabel} - Nova conversa`,
        },
      ]);
      if (newConv.length > 0) {
        conversationId = newConv[0].id;
        setActiveConversationId(conversationId);
        await loadConversations(userId);
      }
    }

    if (!conversationId) return;

    const userMessage: DisplayMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: inputValue,
      imageUrl: imageUrl,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };

    setMessages((prev) => [...prev, userMessage]);

    await messageOrm.insertMessage([
      {
        id: "",
        data_creator: "",
        data_updater: "",
        create_time: "",
        update_time: "",
        conversation_id: conversationId,
        role: MessageRole.user,
        content: inputValue,
        image_url: imageUrl,
      },
    ]);

    const loadingMessage: DisplayMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: String(Math.floor(Date.now() / 1000)),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    const currentInput = inputValue;
    const currentImageUrl = imageUrl;
    setInputValue("");
    setImageUrl(null);
    setIsLoading(true);

    try {
      let aiResponse = "";
      const systemPrompt = getSystemPrompt(assistantMode, currentDate);

      if (assistantMode === "search") {
        const searchResult = await requestCreaoSearch({
          query: { q: currentInput },
        });

        if (searchResult.data && "webPages" in searchResult.data) {
          const webPages = searchResult.data.webPages.value.slice(0, 5);
          const searchContext = webPages
            .map(
              (page) =>
                `- **${page.name}**: ${page.snippet || "Sem descrição"} ([link](${page.url}))`
            )
            .join("\n");

          const chatResult = await requestOpenAIGPTChat({
            body: {
              model: AI_MODEL,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: `Pergunta: ${currentInput}\n\nResultados da Pesquisa:\n${searchContext}`,
                },
              ],
            },
          });

          if (chatResult.data && "choices" in chatResult.data) {
            aiResponse =
              chatResult.data.choices[0]?.message?.content ||
              "Não foi possível gerar uma resposta.";
          }
        } else {
          aiResponse =
            "Não encontrei resultados relevantes. Tente reformular sua pesquisa.";
        }
      } else if (currentImageUrl) {
        const visionResult = await requestOpenAIGPTVision({
          body: {
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: currentInput || "Descreva esta imagem em detalhes" },
                  { type: "image_url", image_url: { url: currentImageUrl } },
                ],
              },
            ],
          },
        });

        if (visionResult.data && "choices" in visionResult.data) {
          aiResponse =
            visionResult.data.choices[0]?.message?.content ||
            "Não foi possível analisar a imagem.";
        }
      } else {
        const historyMessages = messages
          .filter((m) => !m.isLoading)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        const chatResult = await requestOpenAIGPTChat({
          body: {
            model: AI_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              ...historyMessages,
              { role: "user", content: currentInput },
            ],
          },
        });

        if (chatResult.data && "choices" in chatResult.data) {
          aiResponse =
            chatResult.data.choices[0]?.message?.content ||
            "Não foi possível gerar uma resposta.";
        }
      }

      setMessages((prev) =>
        prev.filter((m) => !m.isLoading).concat({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: aiResponse,
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
      );

      await messageOrm.insertMessage([
        {
          id: "",
          data_creator: "",
          data_updater: "",
          create_time: "",
          update_time: "",
          conversation_id: conversationId,
          role: MessageRole.assistant,
          content: aiResponse,
        },
      ]);

      if (messages.length === 0 && userId) {
        const conv = await conversationOrm.getConversationById(conversationId);
        if (conv.length > 0) {
          const modeLabel = modeConfig[assistantMode].label;
          await conversationOrm.setConversationById(conversationId, {
            ...conv[0],
            title: `${modeLabel}: ${currentInput.slice(0, 40)}`,
          });
          await loadConversations(userId);
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages((prev) =>
        prev.filter((m) => !m.isLoading).concat({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Desculpe, ocorreu um erro. Por favor, tente novamente.",
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUrlInput = () => {
    const url = prompt("Digite a URL da imagem ou documento:");
    if (url) {
      setImageUrl(url);
    }
  };

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const getPlaceholderText = (): string => {
    switch (assistantMode) {
      case "email":
        return "Descreva o e-mail que precisa redigir ou cole um e-mail para responder...";
      case "calendar":
        return "Descreva seu compromisso ou peça para organizar sua agenda...";
      case "meeting":
        return "Descreva a reunião para criar uma ata ou cole notas da reunião...";
      case "pdf":
        return "Cole o conteúdo do documento ou descreva o que precisa analisar...";
      case "search":
        return "O que você gostaria de pesquisar na web?";
      default:
        return "Digite sua mensagem...";
    }
  };

  const getModeColor = (mode: AssistantMode): string => {
    const colors: Record<string, string> = {
      violet: "from-violet-600 to-violet-500",
      blue: "from-blue-600 to-blue-500",
      green: "from-emerald-600 to-emerald-500",
      orange: "from-orange-600 to-orange-500",
      pink: "from-pink-600 to-pink-500",
      cyan: "from-cyan-600 to-cyan-500",
    };
    return colors[modeConfig[mode].color] || colors.violet;
  };

  const quickActions = [
    {
      mode: "email" as AssistantMode,
      title: "Redigir E-mail",
      description: "Criar e-mails profissionais",
      prompt: "Me ajude a redigir um e-mail profissional para",
    },
    {
      mode: "calendar" as AssistantMode,
      title: "Organizar Agenda",
      description: "Planejar compromissos",
      prompt: "Me ajude a organizar minha agenda para esta semana",
    },
    {
      mode: "meeting" as AssistantMode,
      title: "Ata de Reunião",
      description: "Documentar reuniões",
      prompt: "Me ajude a criar uma ata de reunião sobre",
    },
    {
      mode: "pdf" as AssistantMode,
      title: "Analisar Documento",
      description: "Resumir e extrair informações",
      prompt: "Me ajude a analisar o seguinte documento:",
    },
    {
      mode: "search" as AssistantMode,
      title: "Pesquisa Web",
      description: "Buscar informações atuais",
      prompt: "",
    },
    {
      mode: "chat" as AssistantMode,
      title: "Assistente Geral",
      description: "Ajuda com qualquer tarefa",
      prompt: "",
    },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        className={cn(
          "fixed lg:relative z-50 h-full w-72 border-r border-white/10 bg-slate-900/80 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Cortex IA
              </h1>
              <p className="text-xs text-slate-400">Seu assistente virtual</p>
            </div>
          </div>
          <Button
            onClick={createNewConversation}
            className={cn(
              "w-full border-0 shadow-lg transition-all duration-300 bg-gradient-to-r",
              getModeColor(assistantMode)
            )}
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        <div className="p-2 border-b border-white/10">
          <p className="text-xs text-slate-500 px-2 mb-2">Modo do Assistente</p>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(modeConfig) as AssistantMode[]).map((mode) => {
              const config = modeConfig[mode];
              const IconComponent = config.icon;
              return (
                <button
                  key={mode}
                  onClick={() => setAssistantMode(mode)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-xs",
                    assistantMode === mode
                      ? `bg-gradient-to-br ${getModeColor(mode)} text-white shadow-lg`
                      : "hover:bg-white/5 text-slate-400 hover:text-white"
                  )}
                  title={config.description}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="truncate w-full text-center">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 p-2">
          {isLoadingConversations ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-slate-500 py-8 px-4">
              <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma conversa ainda</p>
              <p className="text-xs mt-1">Inicie uma nova conversa</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all duration-200",
                    activeConversationId === conv.id
                      ? "bg-gradient-to-r from-violet-600/30 to-cyan-600/30 border border-violet-500/30"
                      : "hover:bg-white/5"
                  )}
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-200">
                      {conv.title || "Sem título"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(Number(conv.update_time) * 1000).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-white/10 text-xs text-slate-500">
          <p className="truncate">{currentDate}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center bg-gradient-to-br",
                getModeColor(assistantMode)
              )}>
                {(() => {
                  const IconComponent = modeConfig[assistantMode].icon;
                  return <IconComponent className="w-4 h-4 text-white" />;
                })()}
              </div>
              <div>
                <span className="font-medium text-slate-200 text-sm">
                  {activeConversation?.title || "Nova Conversa"}
                </span>
                <p className="text-xs text-slate-500">
                  Modo: {modeConfig[assistantMode].label}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
              <Bot className="w-3 h-3" />
              <span>Atualizado: {new Date().toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl bg-gradient-to-br",
                  getModeColor(assistantMode)
                )}>
                  {(() => {
                    const IconComponent = modeConfig[assistantMode].icon;
                    return <IconComponent className="w-10 h-10 text-white" />;
                  })()}
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  Como posso ajudar hoje?
                </h2>
                <p className="text-slate-400 max-w-md mb-2">
                  {modeConfig[assistantMode].description}
                </p>
                <p className="text-xs text-slate-500 mb-8">
                  {currentDate}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                  {quickActions.map((action) => {
                    const config = modeConfig[action.mode];
                    const IconComponent = config.icon;
                    return (
                      <div
                        key={action.mode}
                        className={cn(
                          "p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all duration-300 group",
                          assistantMode === action.mode && "ring-2 ring-violet-500/50"
                        )}
                        onClick={() => {
                          setAssistantMode(action.mode);
                          if (action.prompt) {
                            setInputValue(action.prompt);
                          }
                        }}
                      >
                        <IconComponent className={cn(
                          "w-6 h-6 mb-2 group-hover:scale-110 transition-transform",
                          `text-${config.color}-400`
                        )} />
                        <p className="text-sm font-medium text-slate-200">
                          {action.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {action.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className={cn(
                        "text-white bg-gradient-to-br",
                        getModeColor(assistantMode)
                      )}>
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg",
                      message.role === "user"
                        ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-tr-sm"
                        : "bg-slate-800/80 backdrop-blur-sm border border-white/10 text-slate-200 rounded-tl-sm"
                    )}
                  >
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt="Anexo"
                        className="max-w-full max-h-64 rounded-lg mb-2 object-cover"
                      />
                    )}
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                          <span
                            className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <span
                            className="w-2 h-2 rounded-full bg-pink-400 animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                        <span className="text-sm text-slate-400">
                          Processando...
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-white/10 bg-slate-900/50 backdrop-blur-md p-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            {imageUrl && (
              <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 text-sm text-slate-400 truncate">
                  Imagem/documento anexado
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-400"
                  onClick={() => setImageUrl(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              {(() => {
                const IconComponent = modeConfig[assistantMode].icon;
                return <IconComponent className="w-3 h-3" />;
              })()}
              <span>Modo: {modeConfig[assistantMode].label} - {modeConfig[assistantMode].description}</span>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleImageUrlInput}
                  className="text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Anexar imagem ou documento"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={getPlaceholderText()}
                  className="w-full min-h-[48px] max-h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                  rows={1}
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={isLoading || (!inputValue.trim() && !imageUrl)}
                className={cn(
                  "h-12 w-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-300 bg-gradient-to-r",
                  getModeColor(assistantMode)
                )}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
