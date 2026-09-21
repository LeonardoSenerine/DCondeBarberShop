/**
 * Static marketing copy, text that lives in the design, not in the
 * database. Business data (services, barbers, products, gallery, bookings)
 * comes from Supabase; see src/hooks/*.
 */

export const BRAND = {
  name: "D'Conde Barbearia",
  since: 2024,
  city: "Itatiba",
  addressLine: "Avenida Campo Sales, 303, Sala 04",
  addressCity: "Itatiba/SP · 13250-360",
  whatsapp: "5518997307852",
  instagram: "https://www.instagram.com/dconde_barbearia/",
  instagramHandle: "@dconde_barbearia",
  mapsDirections:
    "https://www.google.com/maps/dir/?api=1&destination=Avenida+Campo+Sales+303+Itatiba+SP+13250-360",
  mapsQuery:
    "https://maps.google.com/?q=Avenida+Campo+Sales+303+Itatiba+SP+13250-360",
};

export const HERO = {
  eyebrow: "Itatiba · Só com hora marcada",
  titleLines: ["Do clássico", "ao contemporâneo."],
  tagline: "A arte de afiar seu visual",
  lead: "Fade, barba, desenho e pigmentação realizados com técnica, precisão e profissionalismo, em um atendimento personalizado para quem busca exclusividade e excelência em cada detalhe.",
  stats: [
    { value: "17", label: "Serviços" },
    { value: "2024", label: "Desde" },
    { value: "Seg a Sáb", label: "Atendimento" },

  ],
};

export const AMBIENTE = {
  title: "O ambiente",
  headline: "Sala grande, luz certa",
  body: "Sala ampla de pé-direito alto, iluminação de estúdio e uma cadeira por vez. Você chega no horário marcado e é atendido sem fila.",
  cover: "/img/hero.jpg",
  features: [
    "Climatizado o ano todo",
    "TV, som e bebida na espera",
    "Poltronas para acompanhante",
    "Produtos da casa à venda",
  ],
};

export const PERKS = [
  {
    title: "Uma cadeira por vez",
    line: "Você marca a hora e é atendido nela. Não tem fila, não tem senha, não tem que esperar o cliente de antes terminar. Se atrasarmos, avisamos antes de você sair de casa.",
  },
  {
    title: "Precisão em cada tom.",
    line: "Descoloração e pigmento não saem em quarenta minutos. Luzes é um serviço de quatro horas e a gente bloqueia a agenda inteira para ele. É por isso que sai bom.",
  },
  {
    title: "Equipe fixa",
    line: "Time pequeno e dedicado, cada um com sua cadeira e sua agenda. Você escolhe quem vai te atender na hora de agendar, e é ele quem te atende, não quem estiver livre.",
  },
];

export const ABOUT = {
  quote:
    "Cada traço carrega uma história, cada detalhe carrega um sonho. Barbearia não é só trabalho e evolução constante e esse é um símbolo da minha renovação, da minha caminhada e da força que me trouxe até aqui.",
  paragraphs: [
    "A D'Conde abriu em 2024 com uma ideia simples: um lugar amplo, silencioso e bem iluminado, onde cortar o cabelo é parte da semana e não uma tarefa.",
    "Pé-direito alto, espelho iluminado, cadeira clássica e horário respeitado. Atendimento por agendamento, um cliente por vez, com Daniel e João Lima na cadeira.",
    "O novo espaço na Avenida Campo Sales é a segunda fase dessa caminhada: mais área, mais luz e o mesmo cuidado no acabamento de sempre.",
  ],
  stats: [
    { value: "2024", label: "Fundação" },
    { value: "100%", label: "Por agendamento" },
  ],
  founder: {
    name: "Daniel",
    role: "Fundador · desde 2024",
    photo: "/img/daniel.png",
  },
  facts: [
    { k: "Endereço", v: "Av. Campo Sales, 303, Sala 04, Itatiba/SP" },
    { k: "Equipe", v: "Daniel (fundador) e João Lima" },
    { k: "Atendimento", v: "Somente com horário marcado" },
  ],
};

export const CONTACT_HOURS = [
  { day: "Segunda a sexta", time: "09:00 às 20:00" },
  { day: "Sábado", time: "08:00 às 18:00" },
  { day: "Domingo", time: "Fechado" },
];

export const NAV_LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#servicos", label: "Serviços" },
  { href: "#galeria", label: "Galeria" },
  { href: "#shop", label: "Shop" },
  { href: "#sobre", label: "Sobre" },
  { href: "#contato", label: "Contato" },
];

export const FAQ_ITEMS = [
  {
    q: "Como faço para agendar meu horário?",
    a: "Na seção de agendamento, escolha o barbeiro, o serviço, o dia e o horário. Você confirma seu e-mail com um código de 6 dígitos e pronto: o barbeiro confirma o pedido e você recebe um lembrete por e-mail antes do horário. Se ninguém confirmar em 24 horas, ou até o horário marcado (o que vier primeiro), a solicitação é cancelada automaticamente e o horário volta a ficar livre.",
  },
  {
    q: "Preciso de hora marcada?",
    a: "Sim. Atendemos somente com horário marcado, um cliente por vez. Por isso você não pega fila e é atendido no horário combinado.",
  },
  {
    q: "Como cancelo ou remarco meu horário?",
    a: "Em Meus agendamentos você cancela informando o motivo, e remarca enquanto o pedido ainda aguarda confirmação. Se já estiver confirmado, chame a gente no WhatsApp. Avise o quanto antes para liberar o horário para outro cliente.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "O pagamento é feito na barbearia, em Pix, débito, crédito ou dinheiro. Os produtos da loja são reservados pelo site e retirados aqui.",
  },
  {
    q: "Onde fica e qual o horário de atendimento?",
    a: "Estamos na Avenida Campo Sales, 303, Sala 04, em Itatiba/SP. Atendemos de segunda a sexta, das 09h às 20h, e aos sábados, das 08h às 18h. Domingo fechado.",
  },
];
