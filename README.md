# API temporária de transcrições

Projeto independente de Vercel Functions e Upstash Redis. Ele não acessa URLs
externas nem depende do frontend ou de outro backend. A transcrição completa é
enviada no corpo da requisição.

## Rotas

### Gravar: `POST /api/transcricoes`

Cabeçalhos: `Authorization: Bearer <API_AUTH_TOKEN>` e `Content-Type: application/json`.

Corpo:

```json
{
  "transcricao": "Texto integral da transcrição."
}
```

Resposta `201`:

```json
{
  "id": "48c4b48e-3013-45c6-aa9a-c857bba12b56",
  "expiresInSeconds": 3600
}
```

O texto é armazenado em `transcricao:<id>` e expira uma hora depois da gravação.
O limite do texto é 200 KiB em UTF-8.

### Recuperar: `GET /api/transcricoes?id=<uuid>`

Use o mesmo cabeçalho `Authorization`.

Resposta `200`:

```json
{
  "id": "48c4b48e-3013-45c6-aa9a-c857bba12b56",
  "transcricao": "Texto integral da transcrição."
}
```

Se o UUID não existir ou já tiver expirado, a rota retorna `404`. UUID inválido
retorna `400`; credencial ausente ou inválida retorna `401`.

## Configurar Upstash

1. Crie uma conta no [Upstash](https://console.upstash.com/) e crie um banco
   **Redis**.
2. Na página do banco, copie **UPSTASH_REDIS_REST_URL** e
   **UPSTASH_REDIS_REST_TOKEN**. Use as credenciais REST, não uma senha Redis
   colada no código.

## Publicar na Vercel

1. Importe este diretório como um projeto novo. Se estiver dentro de um
   repositório maior, defina o **Root Directory** como `api-transcricoes-upstash`.
2. Use **Framework Preset: Other**. Não há comando de build nem diretório de
   saída; a Vercel detecta a função em `api/transcricoes.js`. O comando de
   instalação pode ficar automático ou ser `npm install`.
3. Em **Settings → Environment Variables**, configure:

   - `UPSTASH_REDIS_REST_URL`: URL REST do banco Upstash.
   - `UPSTASH_REDIS_REST_TOKEN`: token REST do banco Upstash.
   - `API_AUTH_TOKEN`: segredo aleatório com pelo menos 32 caracteres.
   - `ALLOWED_ORIGINS`: opcional; origens web autorizadas separadas por vírgula,
     por exemplo `https://app.exemplo.com,https://admin.exemplo.com`.

   Para gerar um segredo localmente com Node.js:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

4. Faça o deploy. Não coloque `API_AUTH_TOKEN` em HTML ou JavaScript público.
   Esta autenticação por token é para chamadas server-to-server; uma aplicação
   pública no navegador precisaria autenticar seus usuários sem revelar um
   segredo compartilhado.

## Executar localmente

Copie `.env.example` para `.env.local`, preencha as credenciais e rode:

```sh
npm install
npx vercel dev
```

## Testar

Defina `API_URL` com a URL local ou publicada e `API_AUTH_TOKEN` no terminal:

```sh
curl -X POST "$API_URL/api/transcricoes" \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transcricao":"Texto integral da transcrição."}'
```

Use o `id` devolvido para recuperar o texto:

```sh
curl "$API_URL/api/transcricoes?id=48c4b48e-3013-45c6-aa9a-c857bba12b56" \
  -H "Authorization: Bearer $API_AUTH_TOKEN"
```

A implementação não registra o texto nem credenciais em logs, envia `Cache-Control:
no-store`, valida a origem CORS quando configurada e retorna mensagens genéricas
se o Redis falhar.
