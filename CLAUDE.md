# Nerva — Contexto do Projeto

## O que é
SaaS de atendimento com IA para captação e qualificação de leads.
Multi-tenant, focado em imobiliárias, contabilidades e hospedagens.

## Stack
Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, 
Supabase (auth/db/realtime), Gemini API (Google `@google/genai`), Zod.

## Princípios de código
- TypeScript estrito (no `any`)
- Server Components por padrão; Client só quando precisar de interação
- Validação com Zod em TODAS as entradas externas (forms, API, webhooks)
- Erros tratados com try/catch e mensagens claras
- Comentários só quando a lógica não é óbvia

## Identidade
Nome: Nerva (wordmark: "Nerva." com ponto em laranja)
Tom: sólido, confiável, técnico sem ser frio
Paleta: ver [VISUAL.md](VISUAL.md). Signal #FF5A1F (primário), Ink #0A0A0F,
  Ink Card #1E1E26, Synapse #00D9A3 (ativo/sucesso), Pulse #FFD23F, Muted #6B6B74.
Tipografia: Instrument Serif (display), Geist (corpo), Geist Mono (dados).
Regras: dark-first no produto; nunca gradiente no logo; Synapse só pra estados
  ativo/sucesso; sem roxo ou azul-royal.

## O que evitar
- Não criar arquivos fora da estrutura padrão sem justificar
- Não adicionar bibliotecas sem perguntar
- Não reescrever funcionalidades já existentes
- Não gerar código sem antes ler os arquivos relacionados