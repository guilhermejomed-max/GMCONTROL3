import { GoogleGenAI } from "@google/genai";
import { Tire, Vehicle } from '../types';

// Initialize Gemini Client
// Note: Safe access to process.env to prevent crashes in browser environments
const getAiClient = () => {
  try {
    // Verificação segura para evitar ReferenceError: process is not defined
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : null;
    
    if (!apiKey) {
      console.warn("API Key not found via process.env.API_KEY. IA features will be disabled.");
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Error initializing AI client:", e);
    return null;
  }
};

export const analyzeInventory = async (inventory: Tire[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Funcionalidade de IA indisponível (Chave de API não configurada).";

  try {
    const inventorySummary = inventory.map(t => 
      `${t.quantity}x ${t.brand} ${t.model} (${t.width}/${t.profile} R${t.rim}) - Status: ${t.status}, Local: ${t.location}`
    ).join('\n');

    const prompt = `
      Atue como um especialista em gestão de frotas e pneus. Analise o seguinte inventário de pneus e forneça um relatório curto e executivo (máximo 3 parágrafos) em Português do Brasil.
      
      Dados do Inventário:
      ${inventorySummary}
      
      Foque em:
      1. Diversidade de marcas e modelos.
      2. Alertas sobre estoque baixo (se houver menos de 4 pneus de um mesmo modelo).
      3. Sugestão de rotação ou compra baseada no status (Novos vs Usados).
      
      Use formatação Markdown para deixar legível (negrito, tópicos).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a análise.";
  } catch (error) {
    console.error("Error generating inventory analysis:", error);
    return "Erro ao conectar com a IA para análise de estoque.";
  }
};

export const generateInspectionReport = async (vehicle: Vehicle, tires: Tire[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Funcionalidade de IA indisponível (Chave de API não configurada).";

  try {
    const tireData = tires.map(t => {
      const pressureDiff = t.targetPressure - t.pressure;
      const isLowPressure = t.pressure < (t.targetPressure * 0.9);
      
      // Formatar leituras dos 4 sulcos se existirem para diagnóstico preciso
      let treadDetails = `Sulco Médio: ${t.currentTreadDepth}mm`;
      let grooveData = "";
      
      if (t.treadReadings) {
        const { depth1, depth2, depth3, depth4 } = t.treadReadings;
        treadDetails = `Medições (Ext -> Int): ${depth1}mm | ${depth2}mm | ${depth3}mm | ${depth4}mm`;
        grooveData = `${depth1},${depth2},${depth3},${depth4}`;
      }

      return `
        ### Posição ${t.position} - ${t.brand} ${t.model} (Fogo: ${t.fireNumber})
        - Pressão Atual: ${t.pressure} PSI (Ideal: ${t.targetPressure})
        - ${treadDetails}
        - KM Instalação: ${t.installOdometer || 'N/A'}
      `;
    }).join('\n');

    const prompt = `
      Você é um Engenheiro Técnico de Pneus sênior. Gere um laudo de inspeção VISUAL e PRÁTICO.
      
      Veículo: ${vehicle.plate} (${vehicle.model})
      Hodômetro: ${vehicle.odometer} km
      
      DADOS DOS PNEUS:
      ${tireData}
      
      ---
      
      SUAS INSTRUÇÕES DE FORMATAÇÃO E ANÁLISE:
      
      Gere um relatório em Markdown focado em "O QUE FAZER".
      
      Estrutura Obrigatória:
      
      # 🚛 Laudo Técnico: ${vehicle.plate}

      ## 1. Diagnóstico Visual e Ações
      Para CADA pneu com problema (Pressão >10% divergente ou Desgaste Irregular), crie um card:
      
      **[Posição] - [Marca/Modelo]**
      *   **Problema Identificado:** (Ex: Desgaste Ombros = Baixa Pressão; Desgaste Unilateral = Camber).
      *   **Representação Visual do Desgaste:**
          Crie um desenho ASCII simples usando barras verticais para representar a altura da borracha nos 4 sulcos.
          Exemplo se Sulco 1 está baixo e Sulco 4 está alto:
          \`Ext [ .  ||  |||  |||| ] Int\`
      *   **🛠️ O QUE FAZER (Ação Imediata):**
          (Seja específico: "Calibrar para X PSI", "Enviar para Alinhamento", "Girar pneu no aro", "Enviar para Recapagem").

      ## 2. Resumo da Saúde da Frota
      *   **Pneus Críticos:** (Qtd)
      *   **Ação Prioritária:** (Qual a manutenção mais urgente para liberar o veículo?)
      
      Se todos os pneus estiverem perfeitos, parabenize a manutenção e libere o veículo com um selo ✅.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar o relatório de inspeção.";

  } catch (error) {
    console.error("Inspection Analysis Error:", error);
    return "Erro ao processar análise de inspeção.";
  }
}

export const chatWithAssistant = async (history: string[], newMessage: string, inventoryContext: Tire[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Funcionalidade de IA indisponível (Chave de API não configurada).";

  try {
     // Contextualizing the AI with the current inventory data
     const inventoryContextString = JSON.stringify(inventoryContext.map(t => ({
        brand: t.brand, model: t.model, size: `${t.width}/${t.profile}R${t.rim}`, qty: t.quantity, status: t.status
     })));

    const systemInstruction = `
      Você é o assistente virtual do GMcontrol Pro. Você ajuda gerentes de frota a entenderem seu estoque de pneus.
      Responda de forma concisa e prestativa.
      
      O estoque atual é: ${inventoryContextString}
    `;

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      history: history.map((msg, index) => ({
        role: index % 2 === 0 ? 'user' : 'model',
        parts: [{ text: msg }],
      })),
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text || "Desculpe, não entendi.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Erro no serviço de chat.";
  }
};