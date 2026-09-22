import { Link } from "react-router-dom";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";
import { usePageMeta } from "@/hooks/usePageMeta";
import { BRAND } from "@/data/content";
import { whatsAppLink } from "@/lib/format";

const SECTIONS: LegalSection[] = [
  {
    id: "controlador",
    title: "Quem cuida dos seus dados",
    content: (
      <p>
        A {BRAND.name} ({BRAND.addressLine}, {BRAND.addressCity}) é a responsável (controladora) pelos dados pessoais
        tratados neste site, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
      </p>
    ),
  },
  {
    id: "dados",
    title: "Quais dados coletamos",
    content: (
      <>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail e telefone.
          </li>
          <li>
            <strong>Agendamentos:</strong> barbeiro, serviço, data, horário, valor, situação e, quando houver, o motivo
            de um cancelamento ou de uma recusa.
          </li>
          <li>
            <strong>Pedidos da loja:</strong> produtos reservados, valores e situação do pedido.
          </li>
          <li>
            <strong>Avaliações:</strong> nota e comentário que você decidir deixar sobre um atendimento.
          </li>
          <li>
            <strong>Dados técnicos:</strong> informações de conexão (como endereço IP) registradas pelos servidores que
            entregam o site.
          </li>
        </ul>
        <p>Não coletamos dados de cartão: o pagamento é feito na barbearia.</p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Para que usamos",
    content: (
      <>
        <ul>
          <li>criar sua conta e confirmar que o e-mail é seu (código de acesso);</li>
          <li>registrar e organizar agendamentos e pedidos, e avisar você sobre eles, inclusive com lembrete por e-mail;</li>
          <li>permitir que o barbeiro escolhido prepare o atendimento;</li>
          <li>manter o histórico do seu atendimento na área do cliente;</li>
          <li>proteger o site contra fraudes e usos indevidos;</li>
          <li>cumprir obrigações legais.</li>
        </ul>
        <p>
          Isso se apoia, principalmente, na execução do serviço que você pediu (agendar e ser atendido), no nosso
          interesse legítimo de manter o site seguro e no cumprimento de obrigações legais. Não usamos seus dados para
          publicidade de terceiros e não os vendemos.
        </p>
      </>
    ),
  },
  {
    id: "compartilhamento",
    title: "Com quem compartilhamos",
    content: (
      <>
        <p>Só com quem é necessário para o site funcionar:</p>
        <ul>
          <li>
            <strong>Equipe da barbearia:</strong> o barbeiro e a administração veem os dados dos seus agendamentos e
            pedidos.
          </li>
          <li>
            <strong>Supabase:</strong> banco de dados e autenticação, onde seus dados ficam armazenados.
          </li>
          <li>
            <strong>Provedor de e-mail:</strong> envio dos códigos de acesso e dos lembretes.
          </li>
          <li>
            <strong>Vercel:</strong> hospedagem do site e medição de desempenho (Speed Insights), descrita na seção
            de cookies.
          </li>
          <li>
            <strong>OpenStreetMap:</strong> carrega o mapa da página de contato, e por isso recebe seu endereço IP.
          </li>
        </ul>
        <p>
          Alguns desses provedores podem operar servidores fora do Brasil. Nesses casos, buscamos fornecedores que
          adotem medidas de proteção compatíveis com a LGPD. Também podemos compartilhar dados por determinação legal
          ou de autoridade competente.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies e armazenamento local",
    content: (
      <>
        <p>
          O site <strong>não usa cookies de publicidade nem rastreia você entre sites</strong>. Usamos o armazenamento
          local do seu navegador para itens necessários ao funcionamento:
        </p>
        <ul>
          <li>a sessão de login, para você continuar conectado;</li>
          <li>o carrinho da loja;</li>
          <li>o rascunho de um agendamento, enquanto você confirma o código enviado por e-mail;</li>
          <li>a sua escolha sobre o aviso de cookies.</li>
        </ul>
        <p>
          Como esses itens são necessários, eles continuam funcionando mesmo que você recuse o aviso de cookies. Você
          pode apagá-los quando quiser nas configurações do navegador, mas então será preciso entrar de novo.
        </p>
        <p>
          Também medimos o desempenho do site (velocidade de carregamento das páginas) com o{" "}
          <strong>Vercel Speed Insights</strong>. Ele não usa cookies, não identifica você e registra apenas dados
          técnicos agregados, como tipo de dispositivo, navegador, país e tempos de carregamento. Se um dia adotarmos
          cookies de análise ou marketing, eles só serão ativados com o seu consentimento.
        </p>
      </>
    ),
  },
  {
    id: "retencao",
    title: "Por quanto tempo guardamos",
    content: (
      <p>
        Mantemos seus dados enquanto sua conta existir e pelo tempo necessário para manter o histórico de atendimento e
        cumprir obrigações legais. Você pode pedir a exclusão da conta, ressalvados os dados que a lei nos obriga a
        guardar.
      </p>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos",
    content: (
      <>
        <p>Pela LGPD, você pode pedir a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
          <li>portabilidade dos dados;</li>
          <li>informação sobre com quem compartilhamos seus dados;</li>
          <li>revogação de consentimento, quando ele for a base do tratamento.</li>
        </ul>
        <p>
          Nome e telefone podem ser corrigidos direto na área <Link to="/conta">Meus agendamentos</Link>. Para os
          demais pedidos, use os contatos abaixo. Você também pode reclamar à Autoridade Nacional de Proteção de Dados
          (ANPD).
        </p>
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Segurança",
    content: (
      <p>
        O site usa conexão criptografada (HTTPS), o acesso é feito por código enviado ao seu e-mail e cada cliente só
        enxerga os próprios agendamentos e pedidos. Nenhum sistema é totalmente imune a falhas; se houver um incidente
        que possa afetar você, avisaremos como a lei exige.
      </p>
    ),
  },
  {
    id: "menores",
    title: "Menores de idade",
    content: (
      <p>
        Menores de 18 anos devem usar o site com o acompanhamento de um responsável legal, que responde pelo cadastro
        e pelos agendamentos feitos.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações desta política",
    content: (
      <p>
        Podemos atualizar esta política. A data da última revisão fica no topo da página. Veja também os{" "}
        <Link to="/termos">Termos de uso</Link>.
      </p>
    ),
  },
  {
    id: "contato",
    title: "Contato sobre privacidade",
    content: (
      <p>
        Para exercer seus direitos ou tirar dúvidas sobre seus dados, fale com a gente pelo{" "}
        <a href={whatsAppLink(BRAND.whatsapp, `Olá, tenho uma dúvida sobre meus dados na ${BRAND.name}`)} target="_blank" rel="noopener">
          WhatsApp
        </a>{" "}
        ou pelo{" "}
        <a href={BRAND.instagram} target="_blank" rel="noopener">
          Instagram {BRAND.instagramHandle}
        </a>
        .
      </p>
    ),
  },
];

export function PrivacyPage() {
  usePageMeta(
    "Política de privacidade | D'Conde Barbearia",
    "Como a D'Conde Barbearia coleta, usa e protege seus dados pessoais, o que guardamos no navegador (cookies) e como exercer seus direitos pela LGPD.",
  );

  return (
    <LegalDocument
      title="Política de privacidade"
      updatedAt="22 de setembro de 2026"
      intro="Aqui explicamos, em linguagem simples, quais dados pedimos, por quê, com quem eles passam e o que você pode fazer sobre eles."
      sections={SECTIONS}
    />
  );
}
