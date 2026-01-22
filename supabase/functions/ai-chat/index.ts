import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

type MessageContent = string | (TextContent | ImageContent)[];

interface Message {
  role: 'user' | 'assistant';
  content: MessageContent;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, images } = await req.json() as { 
      messages: Message[]; 
      images?: { base64: string; mimeType: string }[];
    };
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    console.log('AI Chat request received with', messages.length, 'messages', images?.length ? `and ${images.length} images` : '');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build messages with multimodal content if images are present
    const processedMessages: Message[] = messages.map((msg, idx) => {
      // Only add images to the last user message
      if (msg.role === 'user' && images && images.length > 0 && idx === messages.length - 1) {
        const content: (TextContent | ImageContent)[] = [
          { type: 'text', text: typeof msg.content === 'string' ? msg.content : '' }
        ];
        
        // Add images
        for (const img of images) {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`
            }
          });
        }
        
        return { role: msg.role, content };
      }
      return msg;
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant. Be concise and helpful. Respond in the same language as the user.

When analyzing files:
- For images: Describe what you see, extract any text (OCR), identify objects, people, text, etc.
- For documents (PDF, Word, Excel): Summarize the content, extract key information, answer questions about it.
- For text files: Analyze the content, provide insights, answer questions.
- For code files: Explain the code, suggest improvements, identify issues.

Always be thorough in your analysis and provide actionable insights.`
          },
          ...processedMessages
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your account.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Chat error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
