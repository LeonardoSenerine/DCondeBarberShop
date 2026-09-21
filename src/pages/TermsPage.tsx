import { Link } from "react-router-dom";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";
import { usePageMeta } from "@/hooks/usePageMeta";
import { BRAND } from "@/data/content";
import { whatsAppLink } from "@/lib/format";

const SECTIONS: LegalSection[] = [
  {
    id: "aceitacao",
    title: "Aceitação",
    content: (
      <p>
        Ao acessar o site, criar uma conta, agendar um horário ou fazer um pedido, você concorda com estes Termos de
        uso. Se não concordar com alguma parte, não utilize os serviços online da {BRAND.name}.
      </p>
    ),
  },
  {
    id: "servicos",
    title: "O que o site oferece",
    content: (
      <>
        <p>O site da {BRAND.name} reúne:</p>
        <ul>
          <li>apresentação da barbearia, dos serviços, da equipe e da galeria;</li>
          <li>agendamento online de serviços com o barbeiro de sua escolha;</li>
          <li>reserva de produtos da loja (Shop) para retirada na barbearia;</li>
          <li>área do cliente, para acompanhar agendamentos, pedidos e avaliações.</li>
        </ul>
      </>
    ),
  },
  {
    id: "conta",
    title: "Conta e acesso",
    content: (
      <>
        <p>
          O acesso é feito com seu e-mail, por um código de confirmação enviado para ele. Você se compromete a informar
          dados verdadeiros (nome, e-mail e telefone) e a mantê-los atualizados.
        </p>
        <p>
          Você é responsável por manter o acesso ao seu e-mail seguro e por tudo o que for feito na sua conta.
          Se suspeitar de uso indevido, avise a barbearia.
        </p>
      </>
    ),
  },
  {
    id: "agendamentos",
    title: "Agendamentos",
    content: (
      <>
        <p>
          O atendimento é somente com hora marcada, um cliente por vez. Você escolhe barbeiro, serviço, dia e horário
          entre os disponíveis, e a duração reservada depende do serviço escolhido.
        </p>
        <p>
          O pedido de agendamento fica <strong>aguardando confirmação</strong> até o barbeiro aceitá-lo. A barbearia
          pode recusar um horário, informando o motivo na sua área do cliente. Enquanto aguarda, o horário fica reservado
          para você. Se a solicitação não for confirmada em até <strong>24 horas</strong>, ou até o horário
          marcado (o que vier primeiro), ela é cancelada automaticamente e o horário volta a ficar disponível para
          outros clientes. Quando o agendamento é
          confirmado, você recebe um lembrete por e-mail antes do horário.
        </p>
        <p>
          Chegue no horário marcado. Atrasos podem exigir o encurtamento do serviço ou a remarcação, para não prejudicar
          o cliente seguinte.
        </p>
      </>
    ),
  },
  {
    id: "cancelamento",
    title: "Cancelamento e remarcação",
    content: (
      <>
        <p>
          Você pode cancelar um agendamento na área <strong>Meus agendamentos</strong>, informando o motivo. Avise o
          quanto antes: o horário liberado pode ser usado por outro cliente.
        </p>
        <p>
          A remarcação pelo site está disponível enquanto o agendamento aguarda confirmação. Depois de confirmado,
          para mudar o dia ou o horário, fale com a barbearia pelo{" "}
          <a href={whatsAppLink(BRAND.whatsapp, `Olá, preciso remarcar meu horário na ${BRAND.name}`)} target="_blank" rel="noopener">
            WhatsApp
          </a>
          .
        </p>
        <p>
          Faltas repetidas sem aviso podem levar a barbearia a limitar novos agendamentos online.
        </p>
      </>
    ),
  },
  {
    id: "produtos",
    title: "Pedidos de produtos",
    content: (
      <p>
        Os pedidos da loja são reservas para <strong>retirada na barbearia</strong> ({BRAND.addressLine},{" "}
        {BRAND.addressCity}), sujeitas à disponibilidade em estoque e à confirmação da equipe. Você pode cancelar um
        pedido pela área do cliente enquanto ele não tiver sido concluído.
      </p>
    ),
  },
  {
    id: "precos",
    title: "Preços e pagamento",
    content: (
      <p>
        Os valores exibidos no site são os praticados pela barbearia e podem ser atualizados a qualquer momento; vale o
        valor mostrado no momento do seu pedido de agendamento ou reserva. O pagamento é feito na barbearia, em Pix,
        débito, crédito ou dinheiro. O site não processa pagamentos nem armazena dados de cartão.
      </p>
    ),
  },
  {
    id: "uso-adequado",
    title: "Uso adequado",
    content: (
      <>
        <p>Você concorda em não:</p>
        <ul>
          <li>fazer agendamentos falsos ou em nome de terceiros sem autorização;</li>
          <li>tentar acessar áreas restritas, contas de outras pessoas ou o painel administrativo;</li>
          <li>usar o site para sobrecarregar, copiar em massa ou prejudicar seu funcionamento.</li>
        </ul>
        <p>
          A barbearia pode cancelar agendamentos e suspender contas que violem estas regras.
        </p>
      </>
    ),
  },
  {
    id: "propriedade",
    title: "Propriedade intelectual",
    content: (
      <p>
        A marca {BRAND.name}, o logotipo, os textos, as fotos e o design do site pertencem à barbearia ou são usados
        com autorização. Não é permitido copiá-los ou reutilizá-los sem permissão por escrito.
      </p>
    ),
  },
  {
    id: "responsabilidade",
    title: "Disponibilidade e responsabilidade",
    content: (
      <p>
        Trabalhamos para manter o site no ar, mas ele pode ficar indisponível por manutenção ou por falhas de
        terceiros (internet, hospedagem, envio de e-mail). Nesses casos, você pode agendar pelo WhatsApp. Não nos
        responsabilizamos por horários perdidos por e-mails não recebidos ou dados de contato informados
        incorretamente.
      </p>
    ),
  },
  {
    id: "privacidade",
    title: "Privacidade",
    content: (
      <p>
        O tratamento dos seus dados pessoais está descrito na{" "}
        <Link to="/privacidade">Política de privacidade</Link>, que faz parte destes Termos.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações destes Termos",
    content: (
      <p>
        Podemos atualizar estes Termos quando necessário. A data da última atualização fica sempre no topo desta
        página, e o uso do site depois da mudança significa que você concorda com a nova versão.
      </p>
    ),
  },
  {
    id: "foro",
    title: "Lei aplicável e contato",
    content: (
      <>
        <p>
          Estes Termos seguem as leis brasileiras. Fica eleito o foro da comarca de {BRAND.city}/SP, sem prejuízo do
          direito do consumidor de propor ação no foro do seu domicílio.
        </p>
        <p>
          Dúvidas? Fale conosco pelo{" "}
          <a href={whatsAppLink(BRAND.whatsapp, `Olá, tenho uma dúvida sobre os termos de uso da ${BRAND.name}`)} target="_blank" rel="noopener">
            WhatsApp
          </a>{" "}
          ou pelo{" "}
          <a href={BRAND.instagram} target="_blank" rel="noopener">
            Instagram {BRAND.instagramHandle}
          </a>
          .
        </p>
      </>
    ),
  },
];

export function TermsPage() {
  usePageMeta(
    "Termos de uso | D'Conde Barbearia",
    "Regras de uso do site da D'Conde Barbearia: agendamento, cancelamento, remarcação, pedidos de produtos e pagamento.",
  );

  return (
    <LegalDocument
      title="Termos de uso"
      updatedAt="21 de setembro de 2026"
      intro="Estas regras valem para o uso do site, do agendamento online e da loja da D'Conde Barbearia. Leia com calma; são poucas e objetivas."
      sections={SECTIONS}
    />
  );
}
