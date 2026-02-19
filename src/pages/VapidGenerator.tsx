import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Check, Key, Shield, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export default function VapidGenerator() {
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);

  const generateKeys = async () => {
    setGenerating(true);
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
      );

      const rawPublic = await crypto.subtle.exportKey("raw", keyPair.publicKey);
      const pkcs8Private = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

      setPublicKey(arrayBufferToBase64Url(rawPublic));
      setPrivateKey(arrayBufferToBase64Url(pkcs8Private));

      toast({ title: "Chaves geradas com sucesso!" });
    } catch (e) {
      toast({ title: "Erro ao gerar chaves", description: String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (value: string, which: "public" | "private") => {
    await navigator.clipboard.writeText(value);
    if (which === "public") {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    } else {
      setCopiedPrivate(true);
      setTimeout(() => setCopiedPrivate(false), 2000);
    }
    toast({ title: "Copiado!" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Key className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Gerador de Chaves VAPID</h1>
          </div>
          <p className="text-muted-foreground">
            Gere as chaves necessárias para ativar as notificações push — 100% no seu navegador.
          </p>
        </div>

        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Segurança
            </CardTitle>
            <CardDescription>
              As chaves são geradas diretamente no seu navegador usando a Web Crypto API nativa.
              Nenhum dado é enviado para qualquer servidor.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gerar Par de Chaves</CardTitle>
            <CardDescription>
              Clique no botão abaixo para gerar um novo par de chaves ECDSA P-256.
              Cada clique gera um par único — guarde bem as chaves!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button onClick={generateKeys} disabled={generating} size="lg" className="w-full">
              {generating ? "Gerando..." : "🔑 Gerar Chaves VAPID"}
            </Button>

            {publicKey && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Chave Pública (VAPID_PUBLIC_KEY)
                </Label>
                <p className="text-xs text-muted-foreground">
                  → Cole no código-fonte em <code className="bg-muted px-1 rounded">src/lib/push-notifications.ts</code> na variável <code className="bg-muted px-1 rounded">vapidPublicKey</code>
                </p>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={publicKey}
                    className="font-mono text-xs pr-12 resize-none"
                    rows={3}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => copy(publicKey, "public")}
                  >
                    {copiedPublic ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {privateKey && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Chave Privada (VAPID_PRIVATE_KEY)
                </Label>
                <p className="text-xs text-muted-foreground">
                  → Adicione como secret no painel Lovable Cloud com o nome <code className="bg-muted px-1 rounded">VAPID_PRIVATE_KEY</code>
                </p>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={privateKey}
                    className="font-mono text-xs pr-12 resize-none"
                    rows={4}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => copy(privateKey, "private")}
                  >
                    {copiedPrivate ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    <strong>Nunca compartilhe a chave privada.</strong> Ela deve ficar apenas nos secrets do servidor.
                  </p>
                </div>
              </div>
            )}

            {publicKey && privateKey && (
              <Card className="bg-muted/50 border-muted">
                <CardContent className="pt-4">
                  <p className="text-sm font-semibold text-foreground mb-3">✅ Próximos passos:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Copie a <strong>Chave Pública</strong> e cole em <code className="bg-background px-1 rounded">src/lib/push-notifications.ts</code></li>
                    <li>Copie a <strong>Chave Privada</strong> e adicione como secret <code className="bg-background px-1 rounded">VAPID_PRIVATE_KEY</code></li>
                    <li>Peça ao Lovable para atualizar o código com a nova chave pública</li>
                    <li>Pronto! As notificações push estarão ativas 🎉</li>
                  </ol>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
