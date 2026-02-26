import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Política de Privacidade</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <p className="text-sm text-muted-foreground">Última atualização: 26 de fevereiro de 2026</p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">1. Introdução</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A <strong className="text-foreground">Glory Pads</strong> ("nós", "nosso" ou "aplicativo") valoriza a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais ao utilizar nosso aplicativo web (PWA) de pads de worship e serviços relacionados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">2. Dados que Coletamos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Podemos coletar os seguintes tipos de dados:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li><strong className="text-foreground">Dados de cadastro:</strong> nome completo, e-mail, telefone, data de nascimento e CPF (opcional).</li>
            <li><strong className="text-foreground">Dados de autenticação:</strong> credenciais de login (e-mail/senha) ou dados fornecidos por provedores OAuth (Google, Apple).</li>
            <li><strong className="text-foreground">Dados de uso:</strong> preferências de idioma, configurações de áudio, setlists criadas e packs adquiridos.</li>
            <li><strong className="text-foreground">Dados de assinatura:</strong> informações de plano, status de pagamento e histórico de transações (processados pelo Stripe).</li>
            <li><strong className="text-foreground">Dados técnicos:</strong> endereço IP, tipo de navegador, dispositivo e dados de push notifications (endpoint, chaves públicas).</li>
            <li><strong className="text-foreground">Dados de suporte:</strong> mensagens enviadas via tickets de suporte e chat de ajuda.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">3. Como Usamos seus Dados</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>Fornecer e manter o funcionamento do aplicativo.</li>
            <li>Autenticar e gerenciar sua conta.</li>
            <li>Processar pagamentos e assinaturas.</li>
            <li>Enviar notificações push sobre atualizações e comunicados.</li>
            <li>Responder a solicitações de suporte.</li>
            <li>Personalizar sua experiência (idioma, preferências de áudio).</li>
            <li>Melhorar nossos serviços com base em dados agregados de uso.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">4. Compartilhamento de Dados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Não vendemos seus dados pessoais. Compartilhamos informações apenas com:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li><strong className="text-foreground">Stripe:</strong> processamento de pagamentos e assinaturas.</li>
            <li><strong className="text-foreground">Provedores de autenticação:</strong> Google e Apple (quando você opta por login social).</li>
            <li><strong className="text-foreground">Serviços de infraestrutura:</strong> hospedagem e banco de dados para funcionamento do app.</li>
            <li><strong className="text-foreground">Autoridades legais:</strong> quando exigido por lei ou ordem judicial.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">5. Armazenamento e Segurança</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS/SSL) e em repouso. Implementamos políticas de segurança em nível de linha (RLS) no banco de dados, garantindo que cada usuário acesse apenas seus próprios dados. Senhas são armazenadas de forma segura utilizando hash criptográfico.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">6. Cookies e Armazenamento Local</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Utilizamos <code className="text-xs bg-muted px-1 py-0.5 rounded">localStorage</code> para armazenar preferências de idioma, tokens de sessão e configurações locais do aplicativo. Utilizamos IndexedDB para cache de sons personalizados. Não utilizamos cookies de rastreamento de terceiros.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">7. Seus Direitos (LGPD)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem o direito de:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 ml-2">
            <li>Acessar seus dados pessoais.</li>
            <li>Corrigir dados incompletos ou desatualizados.</li>
            <li>Solicitar a exclusão dos seus dados.</li>
            <li>Revogar consentimento a qualquer momento.</li>
            <li>Solicitar portabilidade dos seus dados.</li>
            <li>Obter informações sobre o compartilhamento dos seus dados.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para exercer seus direitos, entre em contato conosco através do Centro de Ayuda no aplicativo ou envie um ticket de suporte.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">8. Notificações Push</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ao ativar notificações push, armazenamos as chaves públicas do seu dispositivo para envio de comunicados. Você pode desativar as notificações a qualquer momento nas configurações do aplicativo ou do navegador. Não enviamos spam — apenas comunicados relevantes do time Glory Pads.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">9. Menores de Idade</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Glory Pads não é direcionado a menores de 13 anos. Não coletamos intencionalmente dados de crianças. Se tomarmos conhecimento de que coletamos dados de um menor sem consentimento parental, removeremos tais informações.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">10. Alterações nesta Política</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Podemos atualizar esta Política de Privacidade periodicamente. Alterações significativas serão comunicadas por meio de notificação no aplicativo. Recomendamos revisar esta página regularmente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">11. Contato</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para dúvidas sobre esta política ou sobre seus dados pessoais, utilize o Centro de Ajuda dentro do aplicativo ou abra um ticket de suporte.
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

export default Privacy;
