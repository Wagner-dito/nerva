import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative bg-background text-foreground">
      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <Method />
      <Features />
      <Results />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============ NAV ============ */

function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary))]" />
          <Wordmark className="text-xl" />
        </Link>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#problema" className="hover:text-foreground">
            Problema
          </a>
          <a href="#solucao" className="hover:text-foreground">
            Solução
          </a>
          <a href="#como" className="hover:text-foreground">
            Como funciona
          </a>
          <a href="#planos" className="hover:text-foreground">
            Planos
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Começar</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ============ HERO ============ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 px-6 pb-24 pt-40">
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="font-mono">Sistema ativo · Atendendo 24/7</span>
        </div>

        <h1 className="max-w-5xl font-serif text-6xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
          Sua equipe de vendas
          <br />
          <em className="text-primary">trabalhando</em> enquanto
          <br />
          você dorme<span className="text-primary">.</span>
        </h1>

        <p className="mt-8 max-w-xl text-lg text-muted-foreground sm:text-xl">
          Atendimento com IA que captura, qualifica e agenda leads em menos de
          60 segundos —{" "}
          <span className="text-foreground">mesmo às 3 da manhã.</span> Pra
          imobiliárias, contabilidades e hospedagens.
        </p>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <a href="#como">Como funciona</a>
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-10 border-t border-border/60 pt-12 md:grid-cols-4">
          <Stat value="60" suffix="s" label="Tempo de resposta" />
          <Stat value="3" suffix="x" label="Mais conversões" />
          <Stat value="24" suffix="/7" label="Sempre disponível" />
          <Stat value="30" suffix="d" label="Pra ir ao ar" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  suffix,
  label,
}: {
  value: string;
  suffix: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-serif text-5xl leading-none tracking-tight text-primary">
        {value}
        <span className="text-2xl text-foreground">{suffix}</span>
      </div>
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/* ============ PROBLEM ============ */

function Problem() {
  const cards = [
    {
      title: "Leads esfriando no WhatsApp",
      desc: "Mensagens chegam fora do horário, fim de semana, durante reuniões. Quando alguém responde, o cliente já fechou com outro.",
      stat: "78% dos leads nunca recebem segundo contato",
    },
    {
      title: "Tempo gasto com curiosos",
      desc: "Seu time perde horas respondendo perguntas básicas pra quem nunca vai comprar, enquanto os leads quentes esperam na fila.",
      stat: "Só 1 em 10 leads é realmente qualificado",
    },
    {
      title: "Sem visão de onde vêm os resultados",
      desc: "Você investe em Ads, Instagram, Google, mas não sabe qual canal traz os melhores clientes. Continua queimando dinheiro no escuro.",
      stat: "60% das PMEs não medem ROI por canal",
    },
    {
      title: "Ferramentas fragmentadas",
      desc: "Planilha aqui, WhatsApp ali, CRM abandonado, e-mail marketing esquecido. O cliente passa de canal em canal e ninguém sabe o histórico.",
      stat: "Média de 7 ferramentas desconectadas",
    },
  ];

  return (
    <section id="problema" className="border-b border-border/60 bg-card/30 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="01 · O problema"
          title={
            <>
              Cada lead que <em className="text-primary">demora</em> é dinheiro
              perdido<span className="text-primary">.</span>
            </>
          }
          intro="Leads que não recebem resposta em 5 minutos têm 80% menos chance de fechar. E você sabe o que acontece depois: eles vão pro concorrente."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-border/60 bg-background/60 p-8 transition-colors hover:border-primary/60"
            >
              <div className="font-serif text-5xl italic leading-none text-primary">
                ×
              </div>
              <h3 className="mt-5 font-serif text-2xl">{c.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{c.desc}</p>
              <span className="mt-5 inline-block rounded-full bg-primary/15 px-3 py-1 font-mono text-xs text-primary">
                {c.stat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ SOLUTION ============ */

function Solution() {
  return (
    <section id="solucao" className="border-b border-border/60 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="02 · A solução"
          title={
            <>
              Um atendente de IA que{" "}
              <em className="text-primary">nunca</em> dorme, nunca erra, e
              sempre <em className="text-primary">vende</em>
              <span className="text-primary">.</span>
            </>
          }
        />

        <div className="grid items-center gap-16 lg:grid-cols-2">
          <ChatMock />

          <div>
            <h3 className="font-serif text-4xl leading-tight tracking-tight">
              De <em className="text-primary">lead</em> a{" "}
              <em className="text-primary">visita agendada</em> em 90 segundos.
            </h3>
            <p className="mt-5 text-base text-muted-foreground">
              Enquanto outros sistemas só avisam que chegou um lead, o Nerva
              conversa, entende e converte — tudo de forma natural.
            </p>

            <ul className="mt-8 divide-y divide-border/60">
              {[
                {
                  n: "01",
                  title: "Captura omnichannel",
                  desc: "WhatsApp, Instagram, site, Google Ads — tudo converge pra uma única conversa.",
                },
                {
                  n: "02",
                  title: "Qualificação inteligente",
                  desc: "A IA faz as perguntas certas na ordem certa e descobre se o lead é frio, morno ou quente.",
                },
                {
                  n: "03",
                  title: "Handoff automático",
                  desc: "Lead quente vira notificação instantânea pro vendedor, com histórico completo.",
                },
                {
                  n: "04",
                  title: "Follow-up que não cansa",
                  desc: "Sequências de reengajamento rodam sozinhas pra leads que ainda não estão prontos.",
                },
              ].map((item) => (
                <li key={item.n} className="flex gap-5 py-4">
                  <span className="shrink-0 font-mono text-sm text-primary">
                    {item.n}
                  </span>
                  <div>
                    <strong className="block text-base">{item.title}</strong>
                    <span className="text-sm text-muted-foreground">
                      {item.desc}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatMock() {
  return (
    <div className="aspect-square overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card to-background p-8">
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-background/80 p-5">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-serif font-semibold text-primary-foreground">
              L
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Laura · Imobiliária</div>
              <div className="flex items-center gap-1.5 text-xs text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                online agora
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <ChatBubble side="bot">
              Oi! Vi que você se interessou pelo apartamento em Pinheiros. Posso
              te ajudar com algumas informações rápidas?
            </ChatBubble>
            <ChatBubble side="user">Sim, quero saber o valor</ChatBubble>
            <ChatBubble side="bot">
              Claro! Antes, me conta: você busca pra morar ou investir? E tem
              prazo pra mudar?
            </ChatBubble>
            <ChatBubble side="user">Morar, até dezembro</ChatBubble>
            <div className="rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
              ✓ Lead quente detectado · Notificando Ricardo · Agendando visita
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  side,
  children,
}: {
  side: "bot" | "user";
  children: React.ReactNode;
}) {
  return (
    <div className={side === "user" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          side === "user"
            ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
            : "max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-foreground"
        }
      >
        {children}
      </div>
    </div>
  );
}

/* ============ METHOD ============ */

function Method() {
  const steps = [
    {
      n: "01",
      when: "SEMANA 1",
      title: "Imersão",
      desc: "Entendemos seu negócio: como atende hoje, o que pergunta, o que funciona e o que não funciona.",
    },
    {
      n: "02",
      when: "SEMANAS 2–3",
      title: "Construção",
      desc: "Montamos a landing, o chatbot, as automações e treinamos a IA com o conhecimento do seu negócio.",
    },
    {
      n: "03",
      when: "SEMANA 4",
      title: "Piloto",
      desc: "Colocamos no ar com volume controlado. Monitoramos cada conversa e ajustamos em tempo real.",
    },
    {
      n: "04",
      when: "CONTÍNUO",
      title: "Otimização",
      desc: "A cada mês revisamos métricas, melhoramos fluxos e treinamos a IA com novos aprendizados.",
    },
  ];

  return (
    <section id="como" className="border-b border-border/60 bg-card/30 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="03 · Como funciona"
          title={
            <>
              Em <em className="text-primary">30 dias</em> você está no ar.
              <br />
              Sem enrolação<span className="text-primary">.</span>
            </>
          }
          intro="Processo testado de implantação. Você não precisa entender de tecnologia — cuidamos de tudo, você só aprova."
        />

        <div className="grid overflow-hidden rounded-2xl border border-border/60 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={
                "bg-background/60 p-8 transition-colors hover:bg-card " +
                (i < 3 ? "border-b border-border/60 lg:border-b-0 lg:border-r" : "")
              }
            >
              <div className="font-serif text-7xl leading-none text-border">
                {s.n}
              </div>
              <div className="mt-5 font-mono text-xs uppercase tracking-wider text-primary">
                {s.when}
              </div>
              <h3 className="mt-2 font-serif text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ FEATURES ============ */

function Features() {
  const features = [
    {
      icon: "✦",
      title: "Chatbot com IA",
      desc: "Atendente treinado com o vocabulário do seu nicho. Conversa natural, sem parecer robô.",
    },
    {
      icon: "◊",
      title: "Widget embedável",
      desc: "Cola um script no seu site e o chat aparece. Customiza cor, posição e saudação.",
    },
    {
      icon: "◈",
      title: "CRM Kanban",
      desc: "Pipeline visual com todas as conversas, status, histórico e próximos passos.",
    },
    {
      icon: "❖",
      title: "Dashboard ao vivo",
      desc: "Métricas em tempo real: conversas 24h, leads qualificados, score médio.",
    },
    {
      icon: "△",
      title: "ROI por canal",
      desc: "Atribuição via UTM: descubra qual Ad, campanha ou rede social traz mais vendas.",
    },
    {
      icon: "◉",
      title: "Follow-up automático",
      desc: "Reengajamento em 4h, 24h e 72h. Sem mão humana no meio. Configurável por bot.",
    },
  ];

  return (
    <section className="border-b border-border/60 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="04 · O que está incluso"
          title={
            <>
              Tudo que você <em className="text-primary">precisa,</em>
              <br />
              nada que você <em className="text-primary">não usa</em>
              <span className="text-primary">.</span>
            </>
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/60 bg-card/40 p-8 transition-colors hover:border-primary/60 hover:bg-card"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 font-serif text-2xl italic text-primary">
                {f.icon}
              </div>
              <h4 className="mt-5 font-serif text-xl">{f.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ RESULTS ============ */

function Results() {
  return (
    <section className="border-b border-border/60 bg-card/30 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="05 · Resultados"
          title={
            <>
              Números que <em className="text-primary">falam</em> mais
              <br />
              que qualquer <em className="text-primary">promessa</em>
              <span className="text-primary">.</span>
            </>
          }
        />

        <div className="mb-12 grid gap-6 sm:grid-cols-3">
          <ResultCard num="3,2" unit="x" label="Aumento em conversões" desc="Média após 90 dias" />
          <ResultCard num="67" unit="%" label="Redução no tempo de resposta" desc="Vs. atendimento manual" />
          <ResultCard num="18" unit="h" label="Economizadas por semana" desc="Por vendedor, em média" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-12">
          <span className="absolute left-10 top-4 font-serif text-[160px] leading-none text-primary/20">
            &ldquo;
          </span>
          <blockquote className="relative max-w-3xl font-serif text-2xl italic leading-snug sm:text-3xl">
            Em dois meses triplicamos o número de visitas agendadas sem
            contratar ninguém. O bot responde melhor que muita gente do time, e
            nos finais de semana está lá, trabalhando.
          </blockquote>
          <div className="relative mt-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/50 font-serif font-semibold text-primary-foreground">
              R
            </div>
            <div>
              <div className="text-sm font-medium">Ricardo Mendes</div>
              <div className="text-xs text-muted-foreground">
                Diretor · Imobiliária Horizonte
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultCard({
  num,
  unit,
  label,
  desc,
}: {
  num: string;
  unit: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-10 text-center">
      <div className="font-serif text-7xl leading-none tracking-tight text-primary">
        {num}
        <span className="text-4xl text-foreground">{unit}</span>
      </div>
      <div className="mt-2 text-sm font-medium">{label}</div>
      <div className="font-mono text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

/* ============ PRICING ============ */

function Pricing() {
  return (
    <section id="planos" className="border-b border-border/60 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="06 · Planos"
          title={
            <>
              Um plano pra <em className="text-primary">cada</em> momento.
              <br />
              Cresça no seu <em className="text-primary">ritmo</em>
              <span className="text-primary">.</span>
            </>
          }
          intro="Todos incluem setup completo, treinamento da IA e suporte. Sem pegadinha."
        />

        <div className="mb-8 grid gap-5 lg:grid-cols-3">
          <PricingCard
            tier="STARTER"
            name="Essencial"
            desc="Pra quem está estruturando a operação digital pela primeira vez."
            price="797"
            setup="R$ 1.500 de setup"
            features={[
              "Até 500 leads/mês",
              "Widget embedável",
              "Chatbot com IA",
              "CRM Kanban",
              "Relatórios mensais",
              "Suporte por email",
            ]}
            cta="Começar com Starter"
          />
          <PricingCard
            tier="PRO"
            name="Crescimento"
            desc="Operações que já têm volume e querem escalar com previsibilidade."
            price="1.497"
            setup="R$ 3.000 de setup"
            features={[
              "Até 2.000 leads/mês",
              "IA avançada por nicho",
              "ROI por canal (UTM)",
              "Handoff por email",
              "Follow-up automático",
              "Suporte prioritário",
              "Revisões mensais",
            ]}
            cta="Escolher Pro"
            featured
          />
          <PricingCard
            tier="ENTERPRISE"
            name="Sob medida"
            desc="Operações de alto volume que precisam de customização total."
            price="2.997+"
            setup="Setup customizado"
            features={[
              "Leads ilimitados",
              "IA treinada com base própria",
              "Integrações sob medida",
              "SLA dedicado 24/7",
              "Gerente de conta",
              "Treinamento da equipe",
              "Consultoria estratégica",
            ]}
            cta="Falar com especialista"
          />
        </div>

        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-6 text-center text-sm text-muted-foreground">
          <strong className="text-foreground">Garantia de 30 dias:</strong> se
          em 30 dias você não ver melhoria mensurável, devolvemos 100% do
          investimento.
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  tier,
  name,
  desc,
  price,
  setup,
  features,
  cta,
  featured,
}: {
  tier: string;
  name: string;
  desc: string;
  price: string;
  setup: string;
  features: string[];
  cta: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        "relative rounded-2xl border p-10 transition-all " +
        (featured
          ? "scale-105 border-primary bg-gradient-to-b from-card to-card/40"
          : "border-border/60 bg-card/40 hover:border-border")
      }
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 font-mono text-xs font-semibold tracking-wider text-primary-foreground">
          ★ MAIS ESCOLHIDO
        </div>
      )}
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {tier}
      </div>
      <div className="mt-3 font-serif text-3xl">{name}</div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-6 border-t border-border/60 pt-6">
        <div className="font-serif text-5xl font-semibold leading-none">
          <span className="mr-1 text-lg font-normal align-top">R$</span>
          {price}
          <span className="ml-1 text-sm font-light text-muted-foreground">
            /mês
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{setup}</div>
      </div>
      <ul className="my-8 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        variant={featured ? "default" : "outline"}
        className="w-full"
      >
        <Link href="/signup">{cta}</Link>
      </Button>
    </div>
  );
}

/* ============ FAQ ============ */

function Faq() {
  const items = [
    {
      q: "Quanto tempo leva pra estar funcionando?",
      a: "Entre 30 e 45 dias da assinatura até o sistema no ar atendendo clientes reais. Primeira semana: imersão. Semanas 2–3: construção e treinamento. Semana 4: piloto controlado.",
    },
    {
      q: "Preciso entender de tecnologia?",
      a: "Não. Nosso time cuida da parte técnica. Você participa de 2 a 3 reuniões de alinhamento. Depois de no ar, o uso é tão simples quanto WhatsApp.",
    },
    {
      q: "A IA vai afastar meus clientes?",
      a: "Pelo contrário. A IA é treinada com o tom de voz do seu negócio e sabe exatamente quando passar pra um humano. A maioria dos clientes finais não percebe que começou com IA — quem percebe, elogia a agilidade.",
    },
    {
      q: "E se eu quiser cancelar?",
      a: "Fidelidade mínima de 3 meses (tempo pra ver resultados). Depois disso, cancele a qualquer momento com 30 dias de aviso. Sem multa, sem drama.",
    },
    {
      q: "Funciona pro meu nicho?",
      a: "Atendemos hoje imobiliárias, contabilidades e hospedagens (pousadas, hotéis, Airbnb). Cada nicho tem fluxos próprios. Se você atua em outro segmento, fale com a gente — avaliamos caso a caso.",
    },
    {
      q: "Os dados dos meus clientes ficam seguros?",
      a: "Sim. Operamos em conformidade com a LGPD. Dados criptografados, você tem controle total, e assinamos NDA e DPA quando necessário.",
    },
    {
      q: "E se eu já uso um CRM?",
      a: "O Nerva tem CRM próprio (Kanban) que cobre a maioria das operações. Integrações com sistemas externos são avaliadas caso a caso no plano Enterprise.",
    },
  ];

  return (
    <section className="border-b border-border/60 bg-card/30 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="07 · Dúvidas frequentes"
          title={
            <>
              Perguntas <em className="text-primary">honestas,</em>
              <br />
              respostas <em className="text-primary">diretas</em>
              <span className="text-primary">.</span>
            </>
          }
        />

        <div className="max-w-3xl divide-y divide-border/60">
          {items.map((item) => (
            <details key={item.q} className="group py-6">
              <summary className="flex cursor-pointer items-center justify-between font-serif text-xl transition-colors hover:text-primary">
                {item.q}
                <span className="font-serif text-3xl font-light text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ FINAL CTA ============ */

function FinalCta() {
  return (
    <section
      id="contato"
      className="relative overflow-hidden border-b border-border/60 px-6 py-40"
    >
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
          Pronto pra <em className="text-primary">parar</em> de perder leads
          <br />
          por falta de <em className="text-primary">resposta</em>
          <span className="text-primary">?</span>
        </h2>
        <p className="mt-8 text-lg text-muted-foreground sm:text-xl">
          Cria sua conta, configura o primeiro bot em minutos, e cola o widget
          no seu site. Free tier pra começar.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/30 px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 border-b border-border/60 pb-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Wordmark className="text-3xl" />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Atendimento inteligente pra negócios que querem crescer sem
              aumentar a folha.
            </p>
          </div>
          <FooterList
            heading="Produto"
            links={[
              ["Como funciona", "#como"],
              ["Planos", "#planos"],
              ["Entrar", "/login"],
              ["Criar conta", "/signup"],
            ]}
          />
          <FooterList
            heading="Legal"
            links={[
              ["Termos de uso", "#"],
              ["Privacidade", "#"],
              ["LGPD", "#"],
            ]}
          />
        </div>
        <div className="flex flex-col items-center justify-between gap-2 pt-8 font-mono text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 Nerva — Todos os direitos reservados</span>
          <span>FEITO NO BRASIL</span>
        </div>
      </div>
    </footer>
  );
}

function FooterList({
  heading,
  links,
}: {
  heading: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h5 className="font-mono text-xs uppercase tracking-wider text-primary">
        {heading}
      </h5>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <a
              href={href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============ SHARED ============ */

function SectionHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
}) {
  return (
    <div className="mb-16 max-w-3xl">
      <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-primary">
        <span className="h-px w-8 bg-primary" />
        {eyebrow}
      </div>
      <h2 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl md:text-6xl">
        {title}
      </h2>
      {intro && (
        <p className="mt-5 text-lg text-muted-foreground">{intro}</p>
      )}
    </div>
  );
}
