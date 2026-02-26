import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useBodyScroll } from '@/hooks/useBodyScroll';

const Terms = () => {
  useBodyScroll();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Termos de Uso</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <p className="text-sm text-muted-foreground">Última atualização: 26 de fevereiro de 2026</p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">1. Aceitação dos Termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ao acessar ou utilizar o <strong className="text-foreground">Glory Pads</strong> ("aplicativo", "serviço"), você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o serviço.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">2. Descrição do Serviço</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Glory Pads é um aplicativo web progressivo (PWA) voltado para músicos de worship, oferecendo pads de áudio, metrônomo, loops, setlists, Glory Store e demais funcionalidades relacionadas à prática musical em contexto de adoração.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">3. Cadastro e Conta</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>Você deve fornecer informações verdadeiras e atualizadas ao criar sua conta.</li>
            <li>Você é responsável por manter a segurança das suas credenciais de acesso.</li>
            <li>Cada pessoa deve possuir apenas uma conta.</li>
            <li>Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">4. Planos e Assinaturas</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>O Glory Pads oferece planos gratuitos e pagos com diferentes níveis de funcionalidades.</li>
            <li>Assinaturas pagas são processadas pelo <strong className="text-foreground">Stripe</strong> e renovadas automaticamente no ciclo contratado.</li>
            <li>Você pode cancelar sua assinatura a qualquer momento pelo painel de conta. O acesso ao plano permanece ativo até o fim do período já pago.</li>
            <li>Não realizamos reembolsos proporcionais por cancelamento antecipado, salvo exigência legal.</li>
            <li>Reservamo-nos o direito de alterar preços com aviso prévio de 30 dias.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">5. Glory Store e Packs</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>Packs adquiridos na Glory Store são licenciados para uso pessoal e não exclusivo.</li>
            <li>É proibido redistribuir, revender ou compartilhar os sons adquiridos.</li>
            <li>Compras de packs são definitivas e não reembolsáveis, salvo em caso de defeito técnico comprovado.</li>
            <li>Os sons podem ser utilizados em apresentações ao vivo e gravações pessoais de worship.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">6. Uso Aceitável</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Ao utilizar o Glory Pads, você concorda em:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>Não tentar acessar áreas restritas ou contas de outros usuários.</li>
            <li>Não utilizar o serviço para atividades ilegais ou fraudulentas.</li>
            <li>Não fazer engenharia reversa, descompilar ou tentar extrair o código-fonte.</li>
            <li>Não utilizar bots, scrapers ou automações não autorizadas.</li>
            <li>Não enviar conteúdo ofensivo, abusivo ou inadequado através do sistema de suporte ou sugestões da comunidade.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">7. Propriedade Intelectual</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todo o conteúdo do Glory Pads — incluindo sons, interface, design, código, marca e logotipos — é de propriedade exclusiva do Glory Pads e protegido por leis de direitos autorais. É proibida a reprodução, distribuição ou uso comercial sem autorização prévia por escrito.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">8. Conteúdo do Usuário</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>Setlists, configurações e dados criados por você permanecem seus.</li>
            <li>Sugestões enviadas à comunidade podem ser utilizadas pelo Glory Pads para melhorar o produto.</li>
            <li>Reservamo-nos o direito de remover conteúdo que viole estes termos.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">9. Disponibilidade do Serviço</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. O serviço pode ser temporariamente suspenso para manutenção, atualizações ou por motivos fora do nosso controle. O modo de manutenção será comunicado dentro do aplicativo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">10. Limitação de Responsabilidade</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Glory Pads é fornecido "como está". Não nos responsabilizamos por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso do serviço, incluindo perda de dados, interrupções de apresentações ou problemas de compatibilidade com dispositivos ou navegadores.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">11. Suspensão e Encerramento</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>Podemos suspender ou encerrar sua conta por violação destes termos.</li>
            <li>Usuários banidos não terão direito a reembolso de assinaturas ou compras.</li>
            <li>Você pode solicitar a exclusão da sua conta a qualquer momento pelo Centro de Ajuda.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">12. Legislação Aplicável</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Eventuais disputas serão resolvidas no foro da comarca do domicílio do usuário, conforme o Código de Defesa do Consumidor.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">13. Alterações nos Termos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Reservamo-nos o direito de atualizar estes Termos de Uso a qualquer momento. Alterações significativas serão comunicadas por notificação no aplicativo. O uso continuado do serviço após alterações constitui aceitação dos novos termos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">14. Contato</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para dúvidas sobre estes termos, utilize o Centro de Ajuda dentro do aplicativo ou abra um ticket de suporte.
          </p>
        </section>

        <div className="pt-6 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center">
            Glory Pads — Feito com amor para adoradores. 🎵
          </p>
        </div>
      </main>
    </div>
  );
};

export default Terms;
